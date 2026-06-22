import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuthRbac, validateBody, json } from "@/lib/api-helpers";
import { scoreFromReponses } from "@/lib/stock/checklist-local";

const checklistBodySchema = z.object({
  reponses: z.record(z.string(), z.boolean()),
  observations: z.string().max(2000).optional(),
  date_verification: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 8), 30);

  let query = auth.supabase
    .from("checklist_stockage")
    .select("id, reponses, score_pct, date_verification, observations, created_at")
    .order("date_verification", { ascending: false })
    .limit(limit);

  if (auth.access.exploitationId) {
    query = query.eq("exploitation_id", auth.access.exploitationId);
  }

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({ data: data ?? [], latest: data?.[0] ?? null });
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const { data: validated, error: valErr } = validateBody(body, checklistBodySchema);
  if (valErr) return valErr;

  const score_pct = scoreFromReponses(validated.reponses);
  const date_verification =
    validated.date_verification ?? new Date().toISOString().split("T")[0];

  const row: Record<string, unknown> = {
    reponses: validated.reponses,
    score_pct,
    date_verification,
    observations: validated.observations?.trim() || null,
    verificateur_id: auth.user.id,
  };

  if (auth.access.exploitationId) {
    row.exploitation_id = auth.access.exploitationId;
  }

  const { data, error } = await auth.supabase
    .from("checklist_stockage")
    .insert(row)
    .select("id, reponses, score_pct, date_verification, observations, created_at")
    .single();

  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
