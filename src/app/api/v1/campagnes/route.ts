import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, requireFeature, json, parsePagination, validateBody } from "@/lib/api-helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE  = /^#[0-9A-Fa-f]{6}$/;

const insertSchema = z
  .object({
    nom:         z.string().min(1).max(100).trim(),
    date_debut:  z.string().regex(DATE_RE, "Format AAAA-MM-JJ requis"),
    date_fin:    z.string().regex(DATE_RE, "Format AAAA-MM-JJ requis"),
    statut:      z.enum(["planifie", "en_cours", "termine", "suspendu"]).default("planifie"),
    description: z.string().max(500).optional().nullable(),
    couleur:     z.string().regex(HEX_RE, "Code hex invalide (ex: #00D4AA)").optional().nullable(),
  })
  .refine(
    (d) => d.date_debut < d.date_fin,
    { message: "La date de fin doit être strictement après la date de début", path: ["date_fin"] }
  );

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "campagnes");
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const { limit, offset } = parsePagination(sp, 200);

  const STATUT_VALUES = ["planifie", "en_cours", "termine", "suspendu"] as const;
  const rawStatut = sp.get("statut");
  const statut    = STATUT_VALUES.includes(rawStatut as typeof STATUT_VALUES[number]) ? rawStatut : null;
  const annee     = sp.get("annee") ? parseInt(sp.get("annee")!) : null;

  let query = auth.supabase
    .from("campagnes")
    .select("*", { count: "exact" })
    .order("date_debut", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (auth.access.exploitationId) query = query.eq("exploitation_id", auth.access.exploitationId);
  if (statut) query = query.eq("statut", statut);
  if (annee) {
    query = query
      .lte("date_debut", `${annee}-12-31`)
      .gte("date_fin",   `${annee}-01-01`);
  }

  const { data, error, count } = await query;
  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, data, total: count ?? data?.length ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "campagnes");
  if (denied) return denied;

  const exploitationId = auth.access.exploitationId;
  if (!exploitationId)
    return json({ success: false, error: "Exploitation non configurée pour cet utilisateur" }, 422);

  const body   = await req.json().catch(() => ({}));
  const parsed = validateBody(body, insertSchema);
  if (parsed.error) return parsed.error;

  const { data, error } = await auth.supabase
    .from("campagnes")
    .insert({
      exploitation_id: exploitationId,
      nom:         parsed.data.nom,
      date_debut:  parsed.data.date_debut,
      date_fin:    parsed.data.date_fin,
      statut:      parsed.data.statut,
      description: parsed.data.description ?? null,
      couleur:     parsed.data.couleur ?? "#00D4AA",
    })
    .select()
    .single();

  if (error) {
    // Overlap exclusion constraint violation
    if (error.code === "23P01" || error.message.includes("campagnes_no_overlap"))
      return json({ success: false, error: "CAMPAIGN_OVERLAP", message: "Cette période chevauche une campagne existante pour cette exploitation." }, 409);
    return json({ success: false, error: error.message }, 500);
  }
  return json({ success: true, data }, 201);
}
