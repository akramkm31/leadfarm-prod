import { NextRequest } from "next/server";
import { withAuthRbac, json } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("stock_levels")
    .select(
      "*, products(trade_name, category, active_substance, unit, stock_initial_2024, formulation, famille_chimique)"
    )
    .order("current_quantity", { ascending: true });
  if (error) return json({ error: error.message }, 500);
  return json(data);
}
