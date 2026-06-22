import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuthRbac, validateBody, json, requireFeature } from "@/lib/api-helpers";
import { fetchMaladies, fetchEvenementsMaladie } from "@/lib/mcd/client";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const insertSchema = z.object({
  maladie_id: z.string().uuid(),
  parcelle_id: z.string().uuid().optional().nullable(),
  severite: z.enum(["faible", "moderee", "elevee", "critique"]),
  date_observation: z.string().regex(DATE_RE, "Format AAAA-MM-JJ requis"),
  notes: z.string().max(2000).trim().optional().nullable(),
  source: z.enum(["MANUEL", "IA"]).default("MANUEL"),
});

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "maladies");
  if (denied) return denied;

  const includeEvents = req.nextUrl.searchParams.get("events") === "1";
  const maladies = await fetchMaladies(auth.supabase);
  if (!includeEvents) return json({ success: true, data: maladies });
  const evenements = await fetchEvenementsMaladie(auth.supabase);
  return json({ success: true, data: { maladies, evenements } });
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "maladies");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const parsed = validateBody(body, insertSchema);
  if (parsed.error) return parsed.error;

  const { data, error } = await auth.supabase
    .from("evenements_maladie")
    .insert({
      maladie_id: parsed.data.maladie_id,
      parcelle_id: parsed.data.parcelle_id ?? null,
      severite: parsed.data.severite,
      date_observation: parsed.data.date_observation,
      notes: parsed.data.notes ?? null,
      source: parsed.data.source,
    })
    .select("*, maladies(nom), parcelles(name)")
    .single();

  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, data }, 201);
}
