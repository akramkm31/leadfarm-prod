import { NextRequest } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { PLANTATION_DETAIL_SELECT } from "@/lib/agri-selects";
import { requireAuth, json, parsePagination, validateBody } from "@/lib/api-helpers";

const insertSchema = z.object({
  parcelle_id: z.string().uuid(),
  campagne_id: z.string().uuid().optional().nullable(),
  type_culture: z.string().max(200).optional().nullable(),
  variete_culture: z.string().max(200).optional().nullable(),
  nombre_plants: z.number().int().nonnegative().optional().nullable(),
  date_plantation: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const sp = req.nextUrl.searchParams;
  const { limit, offset } = parsePagination(sp, 200);
  const parcelleId = sp.get("parcelle_id");
  const campagneId = sp.get("campagne_id");

  const supabase = createRouteHandlerClient(req);
  let q = supabase
    .from("plantations")
    .select(PLANTATION_DETAIL_SELECT, { count: "exact" })
    .eq("est_actuel", true)
    .order("date_modification", { ascending: false })
    .range(offset, offset + limit - 1);

  if (parcelleId) q = q.eq("parcelle_id", parcelleId);
  if (campagneId) q = q.eq("campagne_id", campagneId);

  const { data, error, count } = await q;
  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, data, total: count ?? data?.length ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const { user, error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const body = await req.json();
  const parsed = validateBody(body, insertSchema);
  if (parsed.error) return parsed.error;

  const supabase = createRouteHandlerClient(req);
  const { data, error } = await supabase
    .from("plantations")
    .insert({
      parcelle_id: parsed.data.parcelle_id,
      campagne_id: parsed.data.campagne_id || null,
      type_culture: parsed.data.type_culture || null,
      variete_culture: parsed.data.variete_culture || null,
      nombre_plants: parsed.data.nombre_plants ?? null,
      date_plantation: parsed.data.date_plantation || null,
      est_actuel: true,
      version: 1,
      action_historique: "INSERT",
      modifie_par: user!.id,
    })
    .select(PLANTATION_DETAIL_SELECT)
    .single();

  if (error) return json({ success: false, error: error.message }, 400);
  return json({ success: true, data }, 201);
}
