import { NextRequest } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { requireAuth, json, validateBody } from "@/lib/api-helpers";

const patchSchema = z.object({
  nom: z.string().min(1).max(255).optional(),
  date_debut: z.string().optional().nullable(),
  date_fin: z.string().optional().nullable(),
  statut: z.string().max(50).optional().nullable(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const supabase = createRouteHandlerClient(req);

  const { data, error } = await supabase.from("campagnes").select("*").eq("id", id).maybeSingle();
  if (error) return json({ success: false, error: error.message }, 500);
  if (!data) return json({ success: false, error: "Campagne introuvable" }, 404);
  return json({ success: true, data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = validateBody(body, patchSchema);
  if (parsed.error) return parsed.error;

  const patch: Record<string, unknown> = {};
  if (parsed.data.nom !== undefined) patch.nom = parsed.data.nom;
  if (parsed.data.date_debut !== undefined) patch.date_debut = parsed.data.date_debut;
  if (parsed.data.date_fin !== undefined) patch.date_fin = parsed.data.date_fin;
  if (parsed.data.statut !== undefined) patch.statut = parsed.data.statut;

  if (Object.keys(patch).length === 0) {
    return json({ success: false, error: "Aucun champ à mettre à jour" }, 400);
  }

  const supabase = createRouteHandlerClient(req);
  const { data, error } = await supabase.from("campagnes").update(patch).eq("id", id).select().single();
  if (error) return json({ success: false, error: error.message }, 400);
  return json({ success: true, data });
}
