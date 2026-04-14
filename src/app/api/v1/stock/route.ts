import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, json } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from("stock_levels")
    .select("*, products(trade_name, category, active_substance, unit, stock_initial_2024, formulation, famille_chimique)")
    .order("current_quantity", { ascending: true });
  if (error) return json({ error: error.message }, 500);
  return json(data);
}
