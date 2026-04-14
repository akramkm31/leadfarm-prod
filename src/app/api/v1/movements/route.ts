import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { movementSchema } from "@/lib/validations";
import { requireAuth, validateBody, json, parsePagination } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const type = sp.get("type");
  const culture = sp.get("culture");
  const product_id = sp.get("product_id");
  const site = sp.get("site");
  const from = sp.get("from");
  const to = sp.get("to");
  const { limit, offset } = parsePagination(sp);

  let query = supabase
    .from("movements")
    .select("*, products(trade_name, category, active_substance, unit)", { count: "exact" })
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (type) query = query.eq("movement_type", type);
  if (culture) query = query.eq("culture", culture);
  if (product_id) query = query.eq("product_id", product_id);
  if (site) query = query.eq("site_name", site);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, count, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ data, total: count });
}

export async function POST(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { data: validated, error: valErr } = validateBody(body, movementSchema);
  if (valErr) return valErr;

  const { data, error } = await supabase.from("movements").insert(validated).select().single();
  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
