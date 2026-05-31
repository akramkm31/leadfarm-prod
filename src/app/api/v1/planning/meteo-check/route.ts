import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createServerClient } from "@/lib/supabase/server";
import { checkPlanningMeteo } from "@/lib/services/meteo";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const lat = parseFloat(searchParams.get("lat") || "35.2");
  const lng = parseFloat(searchParams.get("lng") || "-0.6");
  const planningId = searchParams.get("planning_id");

  if (!date) {
    return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
  }

  try {
    const supabase = createServerClient() as any;

    // Map Auth User to tenant ID
    const { data: dbUser } = await supabase
      .from("UTILISATEUR")
      .select("identifiant_exploitation")
      .eq("adresse_email", auth.user.email || "")
      .single();

    const tenantId = dbUser?.identifiant_exploitation || 1;

    // Load seuil_intervention for this tenant
    const { data: seuil } = await supabase
      .from("seuil_intervention")
      .select("vent_max_km_h, pluie_delai_heures, temperature_min_c, temperature_max_c")
      .eq("id_tenant", tenantId)
      .eq("type_culture", "default")
      .single();

    const threshold = {
      vent_max_km_h:      seuil ? Number(seuil.vent_max_km_h) : 20.0,
      pluie_delai_heures: seuil ? seuil.pluie_delai_heures : 4,
      temperature_min_c:  seuil ? Number(seuil.temperature_min_c) : 5.0,
      temperature_max_c:  seuil ? Number(seuil.temperature_max_c) : 35.0,
    };

    const check = await checkPlanningMeteo(lat, lng, date, threshold);

    // If planningId is provided, persist it in the database
    if (planningId) {
      await supabase
        .from("planning_operationnel")
        .update({
          meteo_valide: check.valid,
          meteo_data:   check.forecast,
        })
        .eq("id", parseInt(planningId));
    }

    return NextResponse.json(check);
  } catch (err) {
    console.error("Meteo check error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Meteo check failed" },
      { status: 500 }
    );
  }
}
