import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, requireFeature, json, validateBody } from "@/lib/api-helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE  = /^#[0-9A-Fa-f]{6}$/;

// Status transition matrix — terminal states and valid moves
const VALID_TRANSITIONS: Record<string, string[]> = {
  planifie:  ["en_cours", "suspendu"],
  en_cours:  ["termine",  "suspendu"],
  suspendu:  ["planifie", "en_cours"],
  termine:   [],
};

const patchSchema = z
  .object({
    nom:         z.string().min(1).max(100).trim().optional(),
    date_debut:  z.string().regex(DATE_RE, "Format AAAA-MM-JJ requis").optional(),
    date_fin:    z.string().regex(DATE_RE, "Format AAAA-MM-JJ requis").optional(),
    statut:      z.enum(["planifie", "en_cours", "termine", "suspendu"]).optional(),
    description: z.string().max(500).optional().nullable(),
    couleur:     z.string().regex(HEX_RE, "Code hex invalide").optional().nullable(),
  })
  .refine(
    (d) => !d.date_debut || !d.date_fin || d.date_debut < d.date_fin,
    { message: "La date de fin doit être strictement après la date de début", path: ["date_fin"] }
  );

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "campagnes");
  if (denied) return denied;

  const { id } = await ctx.params;
  const { data, error } = await auth.supabase
    .from("campagnes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return json({ success: false, error: error.message }, 500);
  if (!data) return json({ success: false, error: "Campagne introuvable" }, 404);
  return json({ success: true, data });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "campagnes");
  if (denied) return denied;

  const { id } = await ctx.params;

  // Fetch current state for transition validation
  const { data: current, error: fetchErr } = await auth.supabase
    .from("campagnes")
    .select("statut, date_debut, date_fin")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return json({ success: false, error: fetchErr.message }, 500);
  if (!current) return json({ success: false, error: "Campagne introuvable" }, 404);

  const body   = await req.json().catch(() => ({}));
  const parsed = validateBody(body, patchSchema);
  if (parsed.error) return parsed.error;

  // Block all edits on terminated campaigns
  if (current.statut === "termine" && (parsed.data.date_debut || parsed.data.date_fin || parsed.data.nom !== undefined))
    return json({ success: false, error: "CAMPAIGN_CLOSED", message: "Une campagne terminée ne peut plus être modifiée." }, 422);

  // Validate status transition
  if (parsed.data.statut && parsed.data.statut !== current.statut) {
    const allowed = VALID_TRANSITIONS[current.statut] ?? [];
    if (!allowed.includes(parsed.data.statut))
      return json({
        success: false,
        error: "INVALID_TRANSITION",
        message: `Transition invalide : ${current.statut} → ${parsed.data.statut}. Transitions autorisées : ${allowed.join(", ") || "aucune"}.`,
      }, 422);
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.nom         !== undefined) patch.nom         = parsed.data.nom;
  if (parsed.data.date_debut  !== undefined) patch.date_debut  = parsed.data.date_debut;
  if (parsed.data.date_fin    !== undefined) patch.date_fin    = parsed.data.date_fin;
  if (parsed.data.statut      !== undefined) patch.statut      = parsed.data.statut;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.couleur     !== undefined) patch.couleur     = parsed.data.couleur;

  const { data, error } = await auth.supabase
    .from("campagnes")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23P01" || error.message.includes("campagnes_no_overlap"))
      return json({ success: false, error: "CAMPAIGN_OVERLAP", message: "Cette période chevauche une campagne existante." }, 409);
    return json({ success: false, error: error.message }, 500);
  }
  if (!data) return json({ success: false, error: "Campagne introuvable" }, 404);
  return json({ success: true, data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "campagnes");
  if (denied) return denied;

  const { id } = await ctx.params;

  const { error } = await auth.supabase.from("campagnes").delete().eq("id", id);
  if (error) return json({ success: false, error: error.message }, 500);
  return new Response(null, { status: 204 });
}
