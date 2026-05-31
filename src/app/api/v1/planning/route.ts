import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const supabase = createServerClient() as any;

    // Map Auth User -> UTILISATEUR serial INT
    const { data: dbUser } = await supabase
      .from("UTILISATEUR")
      .select("identifiant_utilisateur")
      .eq("adresse_email", auth.user.email || "")
      .single();

    const dbUserId = dbUser ? dbUser.identifiant_utilisateur : 1;

    const { data: planning, error } = await supabase
      .from("planning_operationnel")
      .insert({
        id_plan:             body.id_plan || null,
        id_agronome:         dbUserId,
        id_parcelle:         body.id_parcelle,
        id_campagne:         body.id_campagne || null,
        date_prevue:         body.date_prevue,
        type_intervention:   body.type_intervention,
        produits_requis:     body.produits_requis || [],
        operateurs_assignes: body.operateurs_assignes || [],
        statut:              "planifie",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, planning });
  } catch (err) {
    console.error("Failed to create planning:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create planning" },
      { status: 500 }
    );
  }
}
