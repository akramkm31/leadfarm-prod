import { NextRequest } from "next/server";
import { supplierSchema } from "@/lib/validations";
import { withAuthRbac, validateBody, json } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const role = req.nextUrl.searchParams.get("role");
  let query = auth.supabase.from("suppliers").select("*").order("name");
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const { data: validated, error: valErr } = validateBody(body, supplierSchema);
  if (valErr) return valErr;

  const { data, error } = await auth.supabase.from("suppliers").insert(validated).select().single();
  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
