import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";
import { fireAlert } from "@/lib/services/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const resolvedParams = await params;
  const planId = parseInt(resolvedParams.id);

  try {
    const supabase = createServerClient() as any;

    // Map Auth User UUID -> UTILISATEUR serial INT by email
    const { data: dbUser } = await supabase
      .from("UTILISATEUR")
      .select("identifiant_utilisateur")
      .eq("adresse_email", auth.user.email || "")
      .single();

    const dbUserId = dbUser ? dbUser.identifiant_utilisateur : 1;

    // Get current plan to obtain tenantId
    const { data: planData } = await supabase
      .from("plan_consultant")
      .select("id_tenant, type_culture")
      .eq("id", planId)
      .single();

    if (!planData) {
      return NextResponse.json({ error: "Plan not found" }, { status: 44 });
    }

    const { data: plan, error } = await supabase
      .from("plan_consultant")
      .update({
        statut:       "validated",
        validated_at: new Date().toISOString(),
        validated_by: dbUserId,
      })
      .eq("id", planId)
      .select()
      .single();

    if (error) throw error;

    // Fire alert
    await fireAlert({
      eventType: "PLAN_VALIDE",
      tenantId:  planData.id_tenant,
      message:   `📅 Nouveau plan validé pour la culture [${planData.type_culture}]`,
      data:      { planId },
    });

    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("Failed to validate plan:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to validate plan" },
      { status: 500 }
    );
  }
}
