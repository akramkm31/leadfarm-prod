/**
 * Import Excel data from "GESTION DU STOCK SBA 2025" into Supabase.
 * Imports: PARCELLES (regions→zones→sites) + MOUVEMENT (products + movements)
 *
 * Usage: node scripts/import-excel.mjs
 */

import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EXCEL_PATH = "C:/Users/User/Downloads/GESTION DU STOCK SBA 2025 (1).xlsx";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ─────────────────────────────────────────────
function excelDateToISO(serial) {
  if (!serial || typeof serial !== "number") return null;
  const d = new Date((serial - 25569) * 86400000);
  return d.toISOString().slice(0, 10);
}

function clean(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  return s === "/" ? "" : s;
}

function num(v) {
  if (v === undefined || v === null || v === "" || v === "/") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : Math.abs(n);
}

const CATEGORY_MAP = {
  "fongicide": "fongicide",
  "insecticide": "insecticide",
  "herbicide": "herbicide",
  "engrais": "engrais",
  "adjuvant": "adjuvant",
  "acaricide": "acaricide",
  "acide nitrique": "acide_nitrique",
  "acide sulfurique": "acide_sulfurique",
  "acide phosphorique": "acide_phosphorique",
  "acide humique": "acide_humique",
  "matiere organique": "matiere_organique",
  "matière organique": "matiere_organique",
  "fer": "fer",
  "drmx": "drmx",
};

const CULTURE_MAP = {
  "a pepins": "a_pepins",
  "a noyau": "a_noyau",
  "vigne": "vigne",
  "agrumes": "agrumes",
};

function mapCategory(raw) {
  if (!raw) return "autre";
  return CATEGORY_MAP[raw.toLowerCase().trim()] || "autre";
}

function mapCulture(raw) {
  if (!raw) return null;
  return CULTURE_MAP[raw.toLowerCase().trim()] || "autre";
}

// ── 1. Import PARCELLES ─────────────────────────────────
async function importParcelles(wb) {
  console.log("\n═══ Importing PARCELLES ═══");
  const ws = wb.Sheets["PARCELLES"];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Parse hierarchical structure (CULTURE, REGION, ZONE, SITE)
  // Empty cells mean "same as above"
  let currentCulture = "";
  let currentRegion = "";
  let currentZone = "";

  const regions = new Map();   // name → { culture, zones: Map<name, sites[]> }

  for (let i = 1; i < json.length; i++) {
    const [, culture, region, zone, site] = json[i];
    if (!site || !String(site).trim()) continue;

    if (String(culture).trim()) currentCulture = String(culture).trim();
    if (String(region).trim()) currentRegion = String(region).trim();
    if (String(zone).trim()) currentZone = String(zone).trim();

    if (!currentRegion || !currentZone) continue;

    if (!regions.has(currentRegion)) {
      regions.set(currentRegion, { zones: new Map() });
    }
    const reg = regions.get(currentRegion);
    if (!reg.zones.has(currentZone)) {
      reg.zones.set(currentZone, { culture: currentCulture, sites: [] });
    }
    reg.zones.get(currentZone).sites.push(String(site).trim());
  }

  // Insert regions
  const regionMap = {};
  for (const [name] of regions) {
    const { data, error } = await supabase
      .from("regions")
      .upsert({ name }, { onConflict: "name" })
      .select("id, name")
      .single();
    if (error) {
      console.error("Region insert error:", name, error.message);
      continue;
    }
    regionMap[name] = data.id;
    console.log(`  Region: ${name} → ${data.id}`);
  }

  // Insert zones + sites
  const siteMap = {};
  for (const [regionName, reg] of regions) {
    const regionId = regionMap[regionName];
    if (!regionId) continue;

    for (const [zoneName, zoneData] of reg.zones) {
      const cultureType = mapCulture(zoneData.culture) || "autre";

      // Check if zone exists
      let { data: existingZone } = await supabase
        .from("zones")
        .select("id")
        .eq("name", zoneName)
        .eq("region_id", regionId)
        .maybeSingle();

      let zoneId;
      if (existingZone) {
        zoneId = existingZone.id;
      } else {
        const { data, error } = await supabase
          .from("zones")
          .insert({ name: zoneName, region_id: regionId, culture_type: cultureType })
          .select("id")
          .single();
        if (error) {
          console.error("Zone insert error:", zoneName, error.message);
          continue;
        }
        zoneId = data.id;
      }
      console.log(`    Zone: ${zoneName} → ${zoneId}`);

      for (const siteName of zoneData.sites) {
        let { data: existingSite } = await supabase
          .from("sites")
          .select("id")
          .eq("name", siteName)
          .eq("zone_id", zoneId)
          .maybeSingle();

        if (existingSite) {
          siteMap[siteName.toLowerCase()] = existingSite.id;
        } else {
          const { data, error } = await supabase
            .from("sites")
            .insert({ name: siteName, zone_id: zoneId })
            .select("id")
            .single();
          if (error) {
            console.error("Site insert error:", siteName, error.message);
            continue;
          }
          siteMap[siteName.toLowerCase()] = data.id;
        }
      }
      console.log(`      Sites: ${zoneData.sites.length}`);
    }
  }

  console.log(`\n  Total regions: ${Object.keys(regionMap).length}`);
  console.log(`  Total sites mapped: ${Object.keys(siteMap).length}`);
  return siteMap;
}

// ── 2. Import MOUVEMENT ─────────────────────────────────
async function importMouvement(wb, siteMap) {
  console.log("\n═══ Importing MOUVEMENT (products + movements) ═══");
  const ws = wb.Sheets["MOUVEMENT "];

  // Headers at row 12, data from row 13
  // A=Date, B=Catégorie, C=Produit, D=Matière active, E=Teneur MA,
  // F=Formulation, G=Famille chimique, H=Dose, I=Cible,
  // J=Stock Initial 2024, K=Transfert, L=Entrées, M=Retours,
  // N=Sorties, O=Culture, P=Site, Q=Details Site, R=DAR,
  // S=Fournisseur, T=Distributeur, U=Autres obs, V=N, W=P, X=K, Y=Ca, Z=Zinc

  // Collect all rows
  const rows = [];
  for (let r = 13; r <= 6915; r++) {
    const dateCell = ws["A" + r];
    const productCell = ws["C" + r];
    if (!dateCell || !productCell) continue;

    const date = excelDateToISO(dateCell.v);
    const productName = clean(productCell.v);
    if (!date || !productName) continue;

    rows.push({
      date,
      category: mapCategory(clean(ws["B" + r]?.v)),
      productName,
      activeSubstance: clean(ws["D" + r]?.v),
      teneurMa: clean(ws["E" + r]?.v),
      formulation: clean(ws["F" + r]?.v),
      familleChimique: clean(ws["G" + r]?.v),
      dose: clean(ws["H" + r]?.v),
      cible: clean(ws["I" + r]?.v),
      stockInitial: num(ws["J" + r]?.v),
      transfert: num(ws["K" + r]?.v),
      entree: num(ws["L" + r]?.v),
      retour: num(ws["M" + r]?.v),
      sortie: num(ws["N" + r]?.v),
      culture: mapCulture(clean(ws["O" + r]?.v)),
      siteName: clean(ws["P" + r]?.v),
      detailsSite: clean(ws["Q" + r]?.v),
      dar: clean(ws["R" + r]?.v),
      fournisseur: clean(ws["S" + r]?.v),
      distributeur: clean(ws["T" + r]?.v),
      observations: clean(ws["U" + r]?.v),
      n: num(ws["V" + r]?.v),
      p: num(ws["W" + r]?.v),
      k: num(ws["X" + r]?.v),
      ca: num(ws["Y" + r]?.v),
      zinc: num(ws["Z" + r]?.v),
    });
  }

  console.log(`  Parsed ${rows.length} rows from MOUVEMENT`);

  // ── 2a. Upsert products ───────────────────────────────
  console.log("\n  Upserting products...");
  const productsByName = new Map();
  for (const row of rows) {
    const key = row.productName.toLowerCase();
    if (!productsByName.has(key)) {
      productsByName.set(key, row);
    }
  }

  const productMap = {}; // lowercase name → uuid

  // Fetch existing
  const { data: existingProducts } = await supabase
    .from("products")
    .select("id, trade_name");

  for (const p of existingProducts || []) {
    productMap[p.trade_name.toLowerCase()] = p.id;
  }

  // Insert missing in batches
  const missing = [];
  for (const [key, row] of productsByName) {
    if (productMap[key]) continue;
    missing.push({
      trade_name: row.productName,
      category: row.category,
      active_substance: row.activeSubstance || null,
      teneur_ma: row.teneurMa || null,
      formulation: row.formulation || null,
      famille_chimique: row.familleChimique || null,
      dose: row.dose || null,
      cible: row.cible || null,
      stock_initial_2024: row.stockInitial,
      dar: row.dar && !isNaN(parseInt(row.dar)) ? parseInt(row.dar) : null,
    });
  }

  if (missing.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("products")
        .insert(batch)
        .select("id, trade_name");
      if (error) {
        console.error(`  Product batch ${i / BATCH + 1} error:`, error.message);
        continue;
      }
      for (const p of data || []) {
        productMap[p.trade_name.toLowerCase()] = p.id;
      }
    }
    console.log(`  Created ${missing.length} new products`);
  } else {
    console.log(`  All products already exist`);
  }
  console.log(`  Total products mapped: ${Object.keys(productMap).length}`);

  // ── 2b. Upsert suppliers ──────────────────────────────
  console.log("\n  Upserting suppliers...");
  const supplierNames = new Set();
  const distributorNames = new Set();
  for (const row of rows) {
    if (row.fournisseur) supplierNames.add(row.fournisseur);
    if (row.distributeur) distributorNames.add(row.distributeur);
  }

  const supplierMap = {};
  const { data: existingSuppliers } = await supabase.from("suppliers").select("id, name, role");
  for (const s of existingSuppliers || []) {
    supplierMap[s.name.toLowerCase() + "_" + s.role] = s.id;
  }

  for (const name of supplierNames) {
    const key = name.toLowerCase() + "_fabricant";
    if (!supplierMap[key]) {
      const { data } = await supabase
        .from("suppliers")
        .insert({ name, role: "fabricant" })
        .select("id")
        .single();
      if (data) supplierMap[key] = data.id;
    }
  }
  for (const name of distributorNames) {
    const key = name.toLowerCase() + "_distributeur";
    if (!supplierMap[key]) {
      const { data } = await supabase
        .from("suppliers")
        .insert({ name, role: "distributeur" })
        .select("id")
        .single();
      if (data) supplierMap[key] = data.id;
    }
  }
  console.log(`  Suppliers: ${supplierNames.size}, Distributors: ${distributorNames.size}`);

  // ── 2c. Build + insert movements ──────────────────────
  console.log("\n  Building movements...");
  const TYPES = ["transfert", "entree", "retour", "sortie"];
  const movements = [];

  for (const row of rows) {
    const productId = productMap[row.productName.toLowerCase()];
    if (!productId) continue;

    const siteId = row.siteName ? (siteMap[row.siteName.toLowerCase()] || null) : null;
    const supplierId = row.fournisseur
      ? (supplierMap[row.fournisseur.toLowerCase() + "_fabricant"] || null)
      : null;
    const distributorId = row.distributeur
      ? (supplierMap[row.distributeur.toLowerCase() + "_distributeur"] || null)
      : null;

    for (const type of TYPES) {
      const qty = row[type];
      if (qty <= 0) continue;

      movements.push({
        date: row.date,
        product_id: productId,
        category: row.category,
        movement_type: type,
        quantity: qty,
        culture: row.culture,
        site_id: siteId,
        site_name: row.siteName || null,
        details_site: row.detailsSite || null,
        supplier_id: supplierId,
        distributor_id: distributorId,
        observations: row.observations || null,
        n_units: row.n || null,
        p_units: row.p || null,
        k_units: row.k || null,
        ca_units: row.ca || null,
        zinc_units: row.zinc || null,
      });
    }
  }

  console.log(`  Total movements to insert: ${movements.length}`);

  // Batch insert
  const BATCH = 500;
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < movements.length; i += BATCH) {
    const batch = movements.slice(i, i + BATCH);
    const { error } = await supabase.from("movements").insert(batch);
    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }
    if ((i / BATCH) % 5 === 0) {
      process.stdout.write(`  Progress: ${Math.min(i + BATCH, movements.length)}/${movements.length}\r`);
    }
  }

  console.log(`\n  Inserted: ${inserted} movements (${errors} batch errors)`);
  return { rowsParsed: rows.length, productsCreated: missing.length, movementsInserted: inserted };
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  LeadFarm Excel → Supabase Import           ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\nReading: ${EXCEL_PATH}`);

  const wb = XLSX.readFile(EXCEL_PATH, { sheets: ["PARCELLES", "MOUVEMENT "] });
  console.log("Sheets loaded:", wb.SheetNames);

  // Step 1: Parcelles
  const siteMap = await importParcelles(wb);

  // Step 2: Movements (includes products + suppliers)
  const stats = await importMouvement(wb, siteMap);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  IMPORT COMPLETE                            ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Rows parsed:       ${stats.rowsParsed}`);
  console.log(`  Products created:  ${stats.productsCreated}`);
  console.log(`  Movements inserted: ${stats.movementsInserted}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
