import { NextRequest } from "next/server";
import { withAuthRbac, json } from "@/lib/api-helpers";
import { z } from "zod";

const operatorSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  role: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase.from("operators").select("*").order("name");
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const parsed = operatorSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return json({ error: "Validation échouée", details: messages }, 400);
  }

  const { data, error } = await auth.supabase.from("operators").insert(parsed.data).select().single();
  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}
