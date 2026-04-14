import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, json } from "@/lib/api-helpers";
import { z } from "zod";

const treatmentInsertSchema = z.object({
  parcelle_id: z.string().uuid().optional().nullable(),
  culture: z.string().optional(),
  planned_date: z.string().min(1, "Date requise"),
  actual_date: z.string().optional().nullable(),
  status: z.enum(["planifie", "en_cours", "termine", "annule"]).default("planifie"),
  weather: z.string().max(200).optional(),
  wind_speed: z.number().nonnegative().optional().nullable(),
  temperature: z.number().optional().nullable(),
  humidity: z.number().min(0).max(100).optional().nullable(),
  operator_id: z.string().uuid().optional().nullable(),
  site_name: z.string().max(200).optional(),
  observations: z.string().max(2000).optional(),
  dose_ha: z.number().nonnegative().optional().nullable(),
  volume_bouillie: z.number().nonnegative().optional().nullable(),
  superficie_traitee: z.number().nonnegative().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const status = req.nextUrl.searchParams.get("status");
  let query = supabase
    .from("treatments")
    .select("*, treatment_products(*, products(trade_name, unit))")
    .order("planned_date", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const body = await req.json();
  const parsed = treatmentInsertSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`);
    return json({ error: "Validation échouée", details: messages }, 400);
  }

  const { data, error } = await supabase.from("treatments").insert(parsed.data).select().single();
  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
