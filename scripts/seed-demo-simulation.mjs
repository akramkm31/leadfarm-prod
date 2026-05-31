/**
 * Injecte la chaîne démo Supabase (parcelle → plantation → produit → traitement).
 *
 *   node scripts/seed-demo-simulation.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Dynamic import of compiled logic — use inline minimal or import ts
// Node can't import .ts without tsx; duplicate call via fetch to local API or inline

const DEMO_IDS = {
  exploitation: "a0000000-0000-4000-8000-000000000001",
  parcelle: "b1000000-0000-4000-8000-000000000012",
  campagne: "c1000000-0000-4000-8000-000000000001",
  plantationLineage: "d1000000-0000-4000-8000-000000000001",
  product: "10a07b7a-34be-48cf-930f-85c99531eb23",
  operator: "e1000000-0000-4000-8000-000000000001",
  treatment: "f1000000-0000-4000-8000-000000000001",
  alert: "a2000000-0000-4000-8000-000000000001",
};

const PARCELLE = {
  name: "Verger A12 — Simulation",
  site: "Sefyoun Nord",
  crop_type: "Pommier",
  variete: "Golden Delicious",
  color: "#10b981",
  area_hectares: 8.4,
  center: [34.9871, -0.5361],
  boundary: [
    [34.9885, -0.5375],
    [34.9885, -0.5345],
    [34.9855, -0.5345],
    [34.9855, -0.5375],
  ],
};

async function run() {
  console.log("LeadFarm — simulation chaîne complète\n");

  await admin.from("exploitations").upsert(
    {
      id: DEMO_IDS.exploitation,
      name: "Domaine Khelifa",
      wilaya: "Sidi Bel Abbès",
      commune: "Ténira",
    },
    { onConflict: "id" }
  );
  console.log("✓ Exploitation");

  await admin.from("regions").upsert(
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
  console.log("✓ Parcelle (regions)");

  await admin.from("parcelles").upsert(
    {
      id: DEMO_IDS.parcelle,
      exploitation_id: DEMO_IDS.exploitation,
      code_parcelle: "A12-DEMO",
      nom: PARCELLE.name,
      surface_ha: PARCELLE.area_hectares,
      centroide_lat: PARCELLE.center[0],
      centroide_lng: PARCELLE.center[1],
      culture_actuelle: PARCELLE.crop_type,
      variete: PARCELLE.variete,
      statut: "active",
    },
    { onConflict: "id" }
  );
  console.log("✓ Parcelle (miroir MCD)");

  await admin.from("campagnes").upsert(
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
  console.log("✓ Campagne");

  await admin
    .from("plantations")
    .update({ est_actuel: false })
    .eq("lineage_id", DEMO_IDS.plantationLineage)
    .eq("est_actuel", true);

  const { error: pErr } = await admin.from("plantations").insert({
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
  });
  if (pErr && !String(pErr.message).includes("duplicate")) console.warn("Plantation:", pErr.message);
  else console.log("✓ Plantation");

  const { data: prod } = await admin.from("products").select("id").eq("id", DEMO_IDS.product).maybeSingle();
  if (!prod) {
    await admin.from("products").insert({
      id: DEMO_IDS.product,
      trade_name: "CONFIDOR DEMO",
      category: "insecticide",
      active_substance: "Imidaclopride",
      unit: "L",
    });
  }
  await admin.from("stock_levels").upsert(
    { product_id: DEMO_IDS.product, current_quantity: 120, min_threshold: 20, status: "ok" },
    { onConflict: "product_id" }
  );
  console.log("✓ Produit + stock");

  await admin.from("operators").upsert(
    {
      id: DEMO_IDS.operator,
      name: "L. Mansour (démo)",
      role: "operateur",
      active: true,
    },
    { onConflict: "id" }
  );

  const plannedDate = new Date().toISOString().slice(0, 10);
  await admin.from("treatments").upsert(
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
      culture: PARCELLE.crop_type,
      variete: PARCELLE.variete,
      cible: "Pucerons",
      notes: "Simulation LeadFarm",
    },
    { onConflict: "id" }
  );
  await admin.from("treatment_products").delete().eq("treatment_id", DEMO_IDS.treatment);
  await admin.from("treatment_products").insert({
    treatment_id: DEMO_IDS.treatment,
    product_id: DEMO_IDS.product,
    dose_per_hectare: 0.75,
    quantity_used: 6.3,
    unit: "L",
  });
  console.log("✓ Traitement + produits");

  await admin.from("alerts").upsert(
    {
      id: DEMO_IDS.alert,
      type: "treatment_overdue",
      severity: "warning",
      message: `Simulation : traitement terminé sur ${PARCELLE.name}`,
      related_id: DEMO_IDS.treatment,
      acknowledged: false,
    },
    { onConflict: "id" }
  );
  console.log("✓ Alerte");

  console.log("\nLiens:");
  console.log("  Parcelle:    /parcelles");
  console.log("  Traitement:  /treatments?id=" + DEMO_IDS.treatment);
  console.log("  Traçabilité: /trace/" + DEMO_IDS.treatment);
  console.log("  Simulation:  /simulation");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
