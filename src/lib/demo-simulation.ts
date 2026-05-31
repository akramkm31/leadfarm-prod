/**
 * Chaîne démo Supabase : Parcelle (regions) → Plantation → Produit → Traitement → Alerte
 * IDs fixes pour ré-exécution idempotente (soutenance / simulation).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEMO_IDS = {
  exploitation: "a0000000-0000-4000-8000-000000000001",
  parcelle: "b1000000-0000-4000-8000-000000000012",
  campagne: "c1000000-0000-4000-8000-000000000001",
  plantationLineage: "d1000000-0000-4000-8000-000000000001",
  product: "10a07b7a-34be-48cf-930f-85c99531eb23", // CONFIDOR (seed 002)
  operator: "e1000000-0000-4000-8000-000000000001",
  treatment: "f1000000-0000-4000-8000-000000000001",
  alert: "a2000000-0000-4000-8000-000000000001",
} as const;

const PARCELLE = {
  name: "Verger A12 — Simulation",
  site: "Sefyoun Nord",
  crop_type: "Pommier",
  variete: "Golden Delicious",
  color: "#10b981",
  area_hectares: 8.4,
  center: [34.9871, -0.5361] as [number, number],
  boundary: [
    [34.9885, -0.5375],
    [34.9885, -0.5345],
    [34.9855, -0.5345],
    [34.9855, -0.5375],
  ] as [number, number][],
};

export type DemoSimulationStep = {
  key: string;
  label: string;
  status: "ok" | "error";
  detail?: string;
  href?: string;
};

export type DemoSimulationResult = {
  ok: boolean;
  steps: DemoSimulationStep[];
  links: {
    parcelleId: string;
    campagneId: string;
    productId: string;
    treatmentId: string;
    alertId: string;
    plantationId?: string;
  };
};

export async function runDemoSimulation(
  admin: SupabaseClient
): Promise<DemoSimulationResult> {
  const steps: DemoSimulationStep[] = [];
  const links: DemoSimulationResult["links"] = {
    parcelleId: DEMO_IDS.parcelle,
    campagneId: DEMO_IDS.campagne,
    productId: DEMO_IDS.product,
    treatmentId: DEMO_IDS.treatment,
    alertId: DEMO_IDS.alert,
  };

  const push = (step: DemoSimulationStep) => {
    steps.push(step);
    if (step.status === "error") throw new Error(step.detail || step.label);
  };

  try {
    // 1 — Exploitation
    const { error: expErr } = await admin.from("exploitations").upsert(
      {
        id: DEMO_IDS.exploitation,
        name: "Domaine Khelifa",
        wilaya: "Sidi Bel Abbès",
        commune: "Ténira",
        site: "SBA",
      },
      { onConflict: "id" }
    );
    push({
      key: "exploitation",
      label: "Exploitation",
      status: expErr ? "error" : "ok",
      detail: expErr?.message,
      href: "/settings",
    });

    // 2 — Parcelle canonique (regions + miroir parcelles)
    const { error: regErr } = await admin.from("regions").upsert(
      {
        id: DEMO_IDS.parcelle,
        name: PARCELLE.name,
        parent_id: null,
        area_hectares: PARCELLE.area_hectares,
        crop_type: PARCELLE.crop_type,
        variete: PARCELLE.variete,
        culture_type: "arboriculture",
        color: PARCELLE.color,
        center: PARCELLE.center,
        boundary: PARCELLE.boundary,
        site: PARCELLE.site,
      },
      { onConflict: "id" }
    );
    push({
      key: "parcelle",
      label: "Parcelle (carte)",
      status: regErr ? "error" : "ok",
      detail: regErr?.message,
      href: `/parcelles?highlight=${DEMO_IDS.parcelle}`,
    });

    await admin.from("parcelles").upsert(
      {
        id: DEMO_IDS.parcelle,
        exploitation_id: DEMO_IDS.exploitation,
        code_parcelle: "A12-DEMO",
        nom: PARCELLE.name,
        surface_ha: PARCELLE.area_hectares,
        centroide_lat: PARCELLE.center[0],
        centroide_lng: PARCELLE.center[1],
        geojson: {
          type: "Polygon",
          coordinates: [[...PARCELLE.boundary, PARCELLE.boundary[0]]],
        },
        culture_actuelle: PARCELLE.crop_type,
        variete: PARCELLE.variete,
        statut: "active",
      },
      { onConflict: "id" }
    );

    // 3 — Campagne
    const { error: campErr } = await admin.from("campagnes").upsert(
      {
        id: DEMO_IDS.campagne,
        exploitation_id: DEMO_IDS.exploitation,
        nom: "Campagne Simulation 2026",
        date_debut: "2026-01-01",
        date_fin: "2026-12-31",
        statut: "en_cours",
      },
      { onConflict: "id" }
    );
    push({
      key: "campagne",
      label: "Campagne",
      status: campErr ? "error" : "ok",
      detail: campErr?.message,
      href: "/campagnes",
    });

    // 4 — Plantation (SCD2 courante)
    const { data: existingPlant } = await admin
      .from("plantations")
      .select("id")
      .eq("lineage_id", DEMO_IDS.plantationLineage)
      .eq("est_actuel", true)
      .maybeSingle();

    if (existingPlant?.id) {
      links.plantationId = existingPlant.id;
      await admin
        .from("plantations")
        .update({
          parcelle_id: DEMO_IDS.parcelle,
          campagne_id: DEMO_IDS.campagne,
          type_culture: PARCELLE.crop_type,
          variete_culture: PARCELLE.variete,
        })
        .eq("id", existingPlant.id);
    } else {
      const { data: plantation, error: plantErr } = await admin
        .from("plantations")
        .insert({
          lineage_id: DEMO_IDS.plantationLineage,
          parcelle_id: DEMO_IDS.parcelle,
          campagne_id: DEMO_IDS.campagne,
          type_culture: PARCELLE.crop_type,
          variete_culture: PARCELLE.variete,
          nombre_plants: 420,
          date_plantation: "2024-11-15",
          est_actuel: true,
          version: 1,
          action_historique: "INSERT",
        })
        .select("id")
        .single();

      if (plantErr) {
        push({
          key: "plantation",
          label: "Plantation",
          status: "error",
          detail: plantErr.message,
          href: "/campagnes",
        });
      } else {
        links.plantationId = plantation?.id;
      }
    }
    push({
      key: "plantation",
      label: "Plantation",
      status: "ok",
      href: "/campagnes",
    });

    // 5 — Produit phyto + stock
    const { data: existingProduct } = await admin
      .from("products")
      .select("id, trade_name")
      .eq("id", DEMO_IDS.product)
      .maybeSingle();

    if (!existingProduct) {
      const { error: prodInsErr } = await admin.from("products").insert({
        id: DEMO_IDS.product,
        trade_name: "CONFIDOR DEMO",
        category: "insecticide",
        active_substance: "Imidaclopride",
        unit: "L",
        cible: "Pucerons",
      });
      if (prodInsErr) {
        push({
          key: "product",
          label: "Produit phyto",
          status: "error",
          detail: prodInsErr.message,
          href: "/products",
        });
      }
    }

    await admin.from("stock_levels").upsert(
      {
        product_id: DEMO_IDS.product,
        current_quantity: 120,
        min_threshold: 20,
        max_capacity: 500,
        status: "ok",
      },
      { onConflict: "product_id" }
    );

    push({
      key: "product",
      label: "Produit & stock",
      status: "ok",
      href: `/products`,
    });

    // 6 — Opérateur
    await admin.from("operators").upsert(
      {
        id: DEMO_IDS.operator,
        name: "L. Mansour (démo)",
        role: "operateur",
        phone: "+213 550 00 00 01",
        certification_number: "OP-DEMO-2026",
        active: true,
      },
      { onConflict: "id" }
    );

    // 7 — Traitement lié
    const plannedDate = new Date().toISOString().slice(0, 10);
    const { error: trtErr } = await admin.from("treatments").upsert(
      {
        id: DEMO_IDS.treatment,
        site_name: PARCELLE.name,
        parcelle_id: DEMO_IDS.parcelle,
        operator_id: DEMO_IDS.operator,
        operator_name: "L. Mansour (démo)",
        status: "completed",
        type: "pulverisation",
        planned_date: plannedDate,
        executed_date: plannedDate,
        area_treated_hectares: PARCELLE.area_hectares,
        volume_bouillie: 840,
        volume_bouillie_unit: "L",
        culture: PARCELLE.crop_type,
        variete: PARCELLE.variete,
        cible: "Pucerons · Tavelure préventive",
        mode_application: "Pulvérisation tracteur",
        materiel: "Pulvérisateur démonstration",
        date_reelle: plannedDate,
        dar_jours: 21,
        efficacite: "Bonne",
        notes: "Simulation LeadFarm — chaîne plantation → produit → traitement",
      },
      { onConflict: "id" }
    );
    push({
      key: "treatment",
      label: "Traitement",
      status: trtErr ? "error" : "ok",
      detail: trtErr?.message,
      href: `/treatments?id=${DEMO_IDS.treatment}`,
    });

    await admin.from("treatment_products").delete().eq("treatment_id", DEMO_IDS.treatment);
    await admin.from("treatment_products").insert({
      treatment_id: DEMO_IDS.treatment,
      product_id: DEMO_IDS.product,
      dose_per_hectare: 0.75,
      quantity_used: 6.3,
      unit: "L",
    });

    // 8 — Trajectoire GPS (simulation passage tracteur)
    const trajPoints = PARCELLE.boundary.map((p, i) => [
      p[0],
      p[1],
      4.2 + i * 0.3,
      new Date(Date.now() - (4 - i) * 60000).toISOString(),
    ]);
    await admin.from("treatment_trajectories").upsert(
      {
        treatment_id: DEMO_IDS.treatment,
        points: trajPoints,
        start_time: new Date(Date.now() - 4 * 60000).toISOString(),
        end_time: new Date().toISOString(),
        total_distance: 1240,
      },
      { onConflict: "treatment_id" }
    );

    // 9 — Alerte liée
    await admin.from("alerts").upsert(
      {
        id: DEMO_IDS.alert,
        type: "treatment_overdue",
        severity: "warning",
        message: `Simulation : traitement terminé sur ${PARCELLE.name} — vérifier DAR 21 j`,
        related_id: DEMO_IDS.treatment,
        acknowledged: false,
        timestamp: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    push({
      key: "alert",
      label: "Alerte",
      status: "ok",
      href: `/dashboard?alerts=1&highlight=${DEMO_IDS.alert}`,
    });

    push({
      key: "trace",
      label: "Traçabilité",
      status: "ok",
      href: `/trace/${DEMO_IDS.treatment}`,
    });

    return { ok: true, steps, links };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!steps.some((s) => s.status === "error")) {
      steps.push({ key: "fatal", label: "Erreur", status: "error", detail: msg });
    }
    return { ok: false, steps, links };
  }
}
