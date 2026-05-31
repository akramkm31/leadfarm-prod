import { NextRequest } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { PLANTATION_DETAIL_SELECT } from "@/lib/agri-selects";
import { requireAuth, json, validateBody } from "@/lib/api-helpers";

const patchSchema = z.object({
  type_culture: z.string().max(200).optional().nullable(),
  variete_culture: z.string().max(200).optional().nullable(),
  nombre_plants: z.number().int().nonnegative().optional().nullable(),
  date_plantation: z.string().optional().nullable(),
  campagne_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const supabase = createRouteHandlerClient(req);

  const { data: hit } = await supabase.from("plantations").select("id, lineage_id, est_actuel").eq("id", id).maybeSingle();
  if (!hit) return json({ success: false, error: "Plantation introuvable" }, 404);

  const qId = hit.est_actuel ? hit.id : null;
  let row = null;
  if (qId) {
    const { data } = await supabase.from("plantations").select(PLANTATION_DETAIL_SELECT).eq("id", qId).maybeSingle();
    row = data;
  } else {
    const { data } = await supabase
      .from("plantations")
      .select(PLANTATION_DETAIL_SELECT)
      .eq("lineage_id", hit.lineage_id)
      .eq("est_actuel", true)
      .maybeSingle();
    row = data;
  }

  if (!row) return json({ success: false, error: "Aucune version courante" }, 404);
  return json({ success: true, data: row });
}

/** SCD2: clôt la ligne courante et insère une nouvelle version (corps = champs modifiés). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = validateBody(body, patchSchema);
  if (parsed.error) return parsed.error;

  const supabase = createRouteHandlerClient(req);

  const { data: hit } = await supabase
    .from("plantations")
    .select("*")
    .eq("id", id)
    .eq("est_actuel", true)
    .maybeSingle();

  if (!hit) {
    return json({ success: false, error: "Plantation courante introuvable pour cet id" }, 404);
  }

  const now = new Date().toISOString();
  const { error: closeErr } = await supabase
    .from("plantations")
    .update({
      est_actuel: false,
      date_fin_validite: now,
      date_modification: now,
    })
    .eq("id", hit.id);

  if (closeErr) return json({ success: false, error: closeErr.message }, 400);

  const nextVersion = (hit.version as number) + 1;
  const insertPayload = {
    lineage_id: hit.lineage_id as string,
    parcelle_id: hit.parcelle_id as string,
    campagne_id: parsed.data.campagne_id !== undefined ? parsed.data.campagne_id : hit.campagne_id,
    type_culture: parsed.data.type_culture !== undefined ? parsed.data.type_culture : hit.type_culture,
    variete_culture: parsed.data.variete_culture !== undefined ? parsed.data.variete_culture : hit.variete_culture,
    nombre_plants: parsed.data.nombre_plants !== undefined ? parsed.data.nombre_plants : hit.nombre_plants,
    date_plantation: parsed.data.date_plantation !== undefined ? parsed.data.date_plantation : hit.date_plantation,
    date_debut_validite: now,
    date_fin_validite: null,
    est_actuel: true,
    version: nextVersion,
    action_historique: "UPDATE",
    modifie_par: user!.id,
    date_modification: now,
  };

  const { data: created, error: insErr } = await supabase
    .from("plantations")
    .insert(insertPayload)
    .select(PLANTATION_DETAIL_SELECT)
    .single();

  if (insErr) return json({ success: false, error: insErr.message }, 400);
  return json({ success: true, data: created });
}
