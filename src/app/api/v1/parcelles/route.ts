import { NextRequest } from "next/server";
import { withAuthRbac, json } from "@/lib/api-helpers";
import { CANONICAL_PARCELLE_TABLE } from "@/lib/parcelles/constants";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .select("*")
    .order("name");
  if (error) return json({ error: error.message }, 500);
  return json(data);
}
