import { NextRequest } from "next/server";
import { withAuthRbac, validateBody, json, requireFeature } from "@/lib/api-helpers";
import { DEFAULT_EXPLOITATION_ID } from "@/lib/parcelles/constants";
import { syncParcelleMirror } from "@/lib/parcelles/sync-mirror";
import type { RegionRow } from "@/lib/database.types";
import {
  planTreatmentSchema,
  buildTreatmentInsertRow,
  resolveTreatmentExploitationId,
  insertTreatmentProducts,
  TREATMENT_SELECT,
  UUID_RE,
} from "@/lib/treatments/plan-treatment";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") || 500), 500);
  const offset = Number(sp.get("offset") || 0);
  const status = sp.get("status");

  let query = auth.supabase
    .from("treatments")
    .select(TREATMENT_SELECT, { count: "exact" })
    .order("planned_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ data, total: count ?? data?.length ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "treatments.plan");
  if (denied) return denied;

  const body = await req.json();
  const { data: input, error: valErr } = validateBody(body, planTreatmentSchema);
  if (valErr) return valErr;

  const parcelleId =
    input.parcelleId && UUID_RE.test(input.parcelleId) ? input.parcelleId : null;

  if (parcelleId) {
    const { data: region } = await auth.supabase
      .from("regions")
      .select("*")
      .eq("id", parcelleId)
      .maybeSingle();
    if (region) {
      await syncParcelleMirror(
        auth.supabase,
        region as RegionRow,
        auth.access.exploitationId ?? DEFAULT_EXPLOITATION_ID
      );
    }
  }

  const exploitationId = await resolveTreatmentExploitationId(
    auth.supabase,
    parcelleId,
    auth.access.exploitationId
  );

  let row: Record<string, unknown>;
  try {
    row = buildTreatmentInsertRow(input, exploitationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Données invalides";
    return json({ error: message }, 400);
  }

  const { data: treatment, error } = await auth.supabase
    .from("treatments")
    .insert(row)
    .select("id")
    .single();

  if (error) return json({ error: error.message }, 400);

  try {
    await insertTreatmentProducts(auth.supabase, treatment.id, input);
  } catch (err) {
    await auth.supabase.from("treatments").delete().eq("id", treatment.id);
    const message = err instanceof Error ? err.message : "Erreur produits";
    return json({ error: message }, 400);
  }

  const { data: full, error: readErr } = await auth.supabase
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("id", treatment.id)
    .single();

  if (readErr) return json({ error: readErr.message }, 500);
  return json(full, 201);
}
