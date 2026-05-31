import { NextRequest } from "next/server";
import { productSchema } from "@/lib/validations";
import { withAuthRbac, validateBody, json } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const searchParams = req.nextUrl.searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let query = auth.supabase.from("products").select("*").order("trade_name");

  if (category) query = query.eq("category", category);
  if (search) query = query.or(`trade_name.ilike.%${search}%,active_substance.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const { data: validated, error: valErr } = validateBody(body, productSchema);
  if (valErr) return valErr;

  const { data, error } = await auth.supabase.from("products").insert(validated).select().single();
  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
