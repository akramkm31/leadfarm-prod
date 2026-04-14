import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, json } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from("regions")
    .select("*, zones(*, sites(*))")
    .order("name");
  if (error) return json({ error: error.message }, 500);
  return json(data);
}
