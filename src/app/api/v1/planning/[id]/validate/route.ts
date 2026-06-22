import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const resolvedParams = await params;
  const planningId = parseInt(resolvedParams.id);

  try {
    const supabase = createServerClient() as any;

    // Fetch the planning record
    const { data: planning, error: getErr } = await supabase
      .from("planning_operationnel")
      .select("meteo_valide, stock_valide")
      .eq("id", planningId)
      .single();

    if (getErr || !planning) {
      return NextResponse.json({ error: "Planning record not found" }, { status: 404 });
    }

    if (planning.meteo_valide !== true || planning.stock_valide !== true) {
      return NextResponse.json(
        { 
          error: "Validation échouée", 
          details: "Impossible de lancer cette intervention. La météo et le stock requis doivent être validés." 
        }, 
        { status: 400 }
      );
    }

    const { data: updated, error: updErr } = await supabase
      .from("planning_operationnel")
      .update({
        statut:      "en_cours",
        date_reelle: new Date().toISOString().split("T")[0],
      })
      .eq("id", planningId)
      .select()
      .single();

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, planning: updated });
  } catch (err) {
    console.error("Failed to start intervention:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start intervention" },
      { status: 500 }
    );
  }
}
