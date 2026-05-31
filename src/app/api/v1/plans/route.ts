import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const supabase = createServerClient() as any;

    // Map Auth User UUID -> UTILISATEUR serial INT by email
    const { data: dbUser } = await supabase
      .from("UTILISATEUR")
      .select("identifiant_utilisateur")
      .eq("adresse_email", auth.user.email || "")
      .single();

    const dbUserId = dbUser ? dbUser.identifiant_utilisateur : 1;

    const { data: plan, error } = await supabase
      .from("plan_consultant")
      .insert({
        id_tenant:       body.id_tenant || 1,
        id_consultant:   dbUserId,
        type_plan:       body.type_plan,
        type_culture:    body.type_culture,
        variete:         body.variete || "*",
        statut:          "draft",
        annee:           body.annee,
        trimestre:       body.trimestre || null,
        date_debut:      body.date_debut,
        date_fin:        body.date_fin,
        protocoles_json: body.protocoles_json || [],
        notes:           body.notes || "",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("Failed to create plan:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create plan" },
      { status: 500 }
    );
  }
}
