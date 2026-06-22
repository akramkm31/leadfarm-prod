import { NextRequest } from "next/server";
import {
  lfMovementInsertSchema,
  mapMovementInputToLfRow,
} from "@/lib/movements/lf-movement";
import { movementSchema } from "@/lib/validations";
import { withAuthRbac, validateBody, json, parsePagination } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const culture = sp.get("culture");
  const product_id = sp.get("product_id");
  const site = sp.get("site");
  const from = sp.get("from");
  const to = sp.get("to");
  const { limit, offset } = parsePagination(sp);

  let query = auth.supabase
    .from("lf_movements")
    .select("*, lf_products(name, category, unit)", { count: "exact" })
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("flow", type);
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
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const body = await req.json();

  let row: Record<string, unknown>;
  if ("flow" in body) {
    const { data: validated, error: valErr } = validateBody(body, lfMovementInsertSchema);
    if (valErr) return valErr;
    row = validated as Record<string, unknown>;
  } else {
    const { data: validated, error: valErr } = validateBody(
      { ...body, quantity: Math.abs(Number(body.quantity)) },
      movementSchema
    );
    if (valErr) return valErr;
    try {
      row = mapMovementInputToLfRow(validated as Record<string, unknown>);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Données mouvement invalides";
      return json({ error: message }, 400);
    }
  }

  const { data, error } = await auth.supabase
    .from("lf_movements")
    .insert(row)
    .select("*, lf_products(name, category, unit)")
    .single();

  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
