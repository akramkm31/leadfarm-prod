import { NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { requireAuth, json } from "@/lib/api-helpers";

/**
 * GET /api/v1/plantations/:id/historique — toutes les versions SCD2 de la lignée.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const supabase = createRouteHandlerClient(req);

  const { data: row } = await supabase.from("plantations").select("lineage_id").eq("id", id).maybeSingle();
  if (!row) return json({ success: false, error: "Plantation introuvable" }, 404);

  const { data, error } = await supabase
    .from("plantations")
    .select("*")
    .eq("lineage_id", row.lineage_id)
    .order("version", { ascending: true });

  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true, data });
}
