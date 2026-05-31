import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";
import { fireAlert } from "@/lib/services/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await withAuth(req);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve params (Next.js 15/16 requires awaiting params if they are a promise)
  const resolvedParams = await params;
  const detectionId = parseInt(resolvedParams.id);

  try {
    const { confirmation_op, notes } = await req.json();
    const supabase = createServerClient() as any;

    // Map Auth User UUID -> UTILISATEUR serial INT by email
    const { data: dbUser } = await supabase
      .from("UTILISATEUR")
      .select("identifiant_utilisateur")
      .eq("adresse_email", auth.user.email || "")
      .single();

    const dbUserId = dbUser ? dbUser.identifiant_utilisateur : 1; // default fallback

    const { data: detection, error: updError } = await supabase
      .from("detection")
      .update({
        confirmation_op,
        confirme_par: dbUserId,
        confirme_at:  new Date().toISOString(),
      })
      .eq("id", detectionId)
      .select()
      .single();

    if (updError) throw updError;

    // Fire alert only on confirmation
    if (confirmation_op === "confirme" && detection) {
      // Look up intervention threshold (seuil_intervention)
      const { data: seuil } = await supabase
        .from("seuil_intervention")
        .select("surface_attaque_pct")
        .eq("id_tenant", detection.id_tenant)
        .eq("type_culture", "default")
        .single();

      const threshold = seuil ? Number(seuil.surface_attaque_pct) : 20.0;
      const eventType = (detection.confiance_pct || 0) >= threshold
        ? "DETECTION_CRITIQUE"
        : "DETECTION_MALADIE_CONFIRMEE";

      await fireAlert({
        eventType,
        tenantId: detection.id_tenant,
        message:  `🚨 Maladie [${detection.maladie_detectee}] confirmée (${Number(detection.confiance_pct).toFixed(0)}%) — Parcelle #${detection.id_parcelle}`,
        data:     { detectionId: detection.id },
      });
    }

    return NextResponse.json({ ok: true, detection });
  } catch (err) {
    console.error("Confirmation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record confirmation" },
      { status: 500 }
    );
  }
}
