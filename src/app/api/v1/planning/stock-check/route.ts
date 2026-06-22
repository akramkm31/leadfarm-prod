import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";
import { checkStockForPlanning } from "@/lib/services/stock-check";

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { planning_id, date_prevue, produits_requis } = body;

    if (!date_prevue || !produits_requis) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const supabase = createServerClient() as any;

    // Map Auth User to tenant ID
    const { data: dbUser } = await supabase
      .from("UTILISATEUR")
      .select("identifiant_exploitation")
      .eq("adresse_email", auth.user.email || "")
      .single();

    const tenantId = dbUser?.identifiant_exploitation || 1;

    const check = await checkStockForPlanning(tenantId, date_prevue, produits_requis);

    // If planning_id is supplied, update the planning record in DB
    if (planning_id) {
      await supabase
        .from("planning_operationnel")
        .update({
          stock_valide:   check.valid,
          stock_manquant: check.manquant,
        })
        .eq("id", parseInt(planning_id));
    }

    return NextResponse.json(check);
  } catch (err) {
    console.error("Stock check error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stock check failed" },
      { status: 500 }
    );
  }
}
