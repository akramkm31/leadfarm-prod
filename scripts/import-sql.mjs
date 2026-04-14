/**
 * Import gestion_stock_sba_2025.sql data into Supabase
 * Maps MySQL schema → Supabase PostgreSQL schema
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rjvmygudsemlnkpfdfzd.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdm15Z3Vkc2VtbG5rcGZkZnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDMyNDcsImV4cCI6MjA4NzI3OTI0N30.45pU-Gjla48N2omKAyBIyv6pgVTi6p8XGjSWCaW2nH8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SQL_PATH = "C:/Users/User/Downloads/gestion_stock_sba_2025.sql";

// ── Parse INSERT statements from SQL ──
function parseInserts(sql, tableName) {
  const regex = new RegExp(
    `INSERT INTO ${tableName}\\s*\\([^)]+\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    "gi"
  );
  const rows = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const valuesBlock = match[1];
    // Split by ),\n( pattern
    const rowStrings = valuesBlock.split(/\),\s*\n?\s*\(/);
    for (let rs of rowStrings) {
      rs = rs.replace(/^\s*\(/, "").replace(/\)\s*$/, "");
      rows.push(parseRow(rs));
    }
  }
  return rows;
}

function parseRow(rowStr) {
  const values = [];
  let current = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < rowStr.length; i++) {
    const ch = rowStr[i];
    if (escape) { current += ch; escape = false; continue; }
    if (ch === "\\") { escape = true; current += ch; continue; }
    if (ch === "'" && !inString) { inString = true; continue; }
    if (ch === "'" && inString) {
      if (rowStr[i + 1] === "'") { current += "'"; i++; continue; }
      inString = false; continue;
    }
    if (ch === "," && !inString) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());

  return values.map((v) => {
    if (v === "NULL" || v === "null" || v === "") return null;
    const num = Number(v);
    if (!isNaN(num) && v !== "") return num;
    return v;
  });
}

// ── Category mapping SQL→Supabase ──
const CATEGORY_MAP = {
  "FONGICIDE": "fongicide",
  "INSECTICIDE": "insecticide",
  "HERBICIDE": "herbicide",
  "ENGRAIS": "engrais",
  "ACARICIDE": "acaricide",
  "ADJUVANT": "adjuvant",
  "ACIDE NITRIQUE": "acide_nitrique",
  "ACIDE SULFURIQUE": "acide_sulfurique",
  "ACIDE PHOSPHORIQUE": "acide_phosphorique",
  "ACIDE HUMIQUE": "acide_humique",
  "MATIERE ORGANIQUE": "matiere_organique",
  "FER": "fer",
  "DRMX": "drmx",
  "AUTRE": "autre",
  "SEMENCE": "autre",
};

const CULTURE_MAP = {
  "A PEPINS": "a_pepins",
  "A NOYAU": "a_noyau",
  "VIGNE": "vigne",
  "TT": "autre",
  "ZEGLA": "autre",
  "/": null,
  "": null,
};

function mapCategory(cat) {
  if (!cat) return "autre";
  return CATEGORY_MAP[cat.toUpperCase().trim()] || "autre";
}

function mapCulture(cult) {
  if (!cult) return null;
  return CULTURE_MAP[cult.toUpperCase().trim()] ?? "autre";
}

// ── Main ──
async function main() {
  console.log("Reading SQL file...");
  const sql = fs.readFileSync(SQL_PATH, "utf-8");

  // 1. Parse all data from SQL
  console.log("Parsing SQL inserts...");

  const fournisseurs = parseInserts(sql, "fournisseurs");
  const distributeurs = parseInserts(sql, "distributeurs");
  const produits = parseInserts(sql, "produits");
  const mouvements = parseInserts(sql, "mouvements");
  const siteRows = parseInserts(sql, "sites");

  console.log(`  Fournisseurs: ${fournisseurs.length}`);
  console.log(`  Distributeurs: ${distributeurs.length}`);
  console.log(`  Produits: ${produits.length}`);
  console.log(`  Mouvements: ${mouvements.length}`);
  console.log(`  Sites: ${siteRows.length}`);

  // 2. Clear existing data (order matters for FKs)
  console.log("\nClearing existing data...");
  await supabase.from("alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("stock_levels").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("movements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("treatment_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("treatments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("suppliers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("sites").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("zones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("regions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("  Done.");

  // 3. Insert suppliers (fabricants + distributeurs)
  console.log("\nInserting suppliers...");
  const supplierRecords = [];
  const supplierNameToId = {};

  for (const row of fournisseurs) {
    const nom = row[0];
    if (!nom) continue;
    supplierRecords.push({ name: nom, role: "fabricant" });
  }
  for (const row of distributeurs) {
    const nom = row[0];
    if (!nom) continue;
    supplierRecords.push({ name: nom, role: "distributeur" });
  }

  // Dedupe by name
  const uniqueSuppliers = [...new Map(supplierRecords.map(s => [s.name, s])).values()];

  for (let i = 0; i < uniqueSuppliers.length; i += 50) {
    const batch = uniqueSuppliers.slice(i, i + 50);
    const { data, error } = await supabase.from("suppliers").insert(batch).select("id, name");
    if (error) { console.error("Supplier insert error:", error.message); continue; }
    for (const s of data) supplierNameToId[s.name.toUpperCase()] = s.id;
  }
  console.log(`  ${Object.keys(supplierNameToId).length} suppliers inserted.`);

  // 4. Insert products
  // produits columns: id, nom_commercial, categorie, matiere_active, teneur_ma, formulation, famille_chimique
  console.log("\nInserting products...");
  const productNameToId = {};
  const productRecords = produits.map(([nom, cat, ma, teneur, formulation, famille]) => ({
    trade_name: nom || "INCONNU",
    category: mapCategory(cat),
    active_substance: ma && ma !== "/" ? ma : null,
    teneur_ma: teneur && teneur !== "/" ? teneur : null,
    formulation: formulation && formulation !== "/" ? formulation : null,
    famille_chimique: famille && famille !== "/" ? famille : null,
    unit: (formulation && formulation.toLowerCase() === "kg") ? "Kg" : "L",
  }));

  // Dedupe by trade_name + category
  const seen = new Set();
  const uniqueProducts = productRecords.filter((p) => {
    const key = `${p.trade_name}||${p.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (let i = 0; i < uniqueProducts.length; i += 50) {
    const batch = uniqueProducts.slice(i, i + 50);
    const { data, error } = await supabase.from("products").insert(batch).select("id, trade_name, category");
    if (error) { console.error(`Product batch ${i} error:`, error.message); continue; }
    for (const p of data) {
      productNameToId[p.trade_name.toUpperCase()] = p.id;
    }
  }
  console.log(`  ${Object.keys(productNameToId).length} products inserted.`);

  // 5. Create region + zones + sites
  console.log("\nCreating regions/zones/sites...");
  const { data: regionData } = await supabase.from("regions").insert({ name: "SBA" }).select("id").single();
  const regionId = regionData?.id;

  // Main zones from SQL parcelles
  const mainZones = ["TENIRA", "SEFYOUN", "MEZAOUROU", "SIDIHMAD", "KOUANKA", "SYS V", "MAGUER", "TIRMANE"];
  const zoneNameToId = {};

  for (const z of mainZones) {
    const { data } = await supabase.from("zones").insert({ name: z, region_id: regionId, culture_type: "a_pepins" }).select("id").single();
    if (data) zoneNameToId[z.toUpperCase()] = data.id;
  }

  // Insert unique sites from SQL
  const siteNameToId = {};
  const uniqueSiteNames = [...new Set(siteRows.map(([nom]) => nom).filter(Boolean))];

  for (const siteName of uniqueSiteNames) {
    // Try to match to a zone
    const upper = siteName.toUpperCase();
    let zoneId = null;
    for (const [zName, zId] of Object.entries(zoneNameToId)) {
      if (upper.includes(zName)) { zoneId = zId; break; }
    }
    if (!zoneId) zoneId = Object.values(zoneNameToId)[0]; // fallback to first zone

    if (!siteNameToId[upper]) {
      const { data } = await supabase.from("sites").insert({ name: siteName, zone_id: zoneId }).select("id").single();
      if (data) siteNameToId[upper] = data.id;
    }
  }
  console.log(`  ${Object.keys(siteNameToId).length} sites inserted.`);

  // 6. Insert movements (the big one — 6903 rows)
  // mouvements columns: id, date_mouvement, categorie, produit, matiere_active, teneur_ma,
  //   formulation, famille_chimique, dose, cible, stock_initial_2024,
  //   transfert, entrees, retours, sorties, culture, site, details_site,
  //   dar, fournisseur, distributeur, observations, n_val, p_val, k_val, ca_val, zinc_val, autres_obs
  console.log("\nInserting movements...");

  let movCount = 0;
  let skipCount = 0;
  const movBatch = [];

  for (const row of mouvements) {
    const [dateMouv, categorie, produit, , , , , , ,
      stockInit, transfert, entrees, retours, sorties,
      culture, site, detailsSite, , fournisseur, distributeur,
      observations, nVal, pVal, kVal, caVal, zincVal, autresObs] = row;

    const productId = produit ? productNameToId[produit.toUpperCase()] : null;
    const supplierId = fournisseur ? supplierNameToId[fournisseur.toUpperCase()] : null;
    const distributorId = distributeur ? supplierNameToId[distributeur.toUpperCase()] : null;
    const siteId = site ? siteNameToId[site.toUpperCase()] : null;
    const cat = mapCategory(categorie);
    const cult = mapCulture(culture);

    // Split into separate movement rows for each qty type
    const types = [
      { type: "transfert", qty: transfert },
      { type: "entree", qty: entrees },
      { type: "retour", qty: retours },
      { type: "sortie", qty: sorties },
    ];

    for (const { type, qty } of types) {
      if (!qty || qty === 0) continue;

      movBatch.push({
        date: dateMouv || "2025-01-01",
        product_id: productId,
        category: cat,
        movement_type: type,
        quantity: Math.abs(qty),
        culture: cult,
        site_id: siteId,
        site_name: site || null,
        details_site: detailsSite || null,
        supplier_id: type === "entree" ? supplierId : null,
        distributor_id: type === "entree" ? distributorId : null,
        observations: [observations, autresObs].filter(Boolean).join(" | ") || null,
        n_units: nVal ? Number(nVal) || null : null,
        p_units: pVal ? Number(pVal) || null : null,
        k_units: kVal ? Number(kVal) || null : null,
        ca_units: caVal ? Number(caVal) || null : null,
        zinc_units: zincVal ? Number(zincVal) || null : null,
      });

      if (movBatch.length >= 200) {
        const { error } = await supabase.from("movements").insert(movBatch);
        if (error) {
          console.error(`  Movement batch error: ${error.message}`);
          skipCount += movBatch.length;
        } else {
          movCount += movBatch.length;
        }
        movBatch.length = 0;
        if (movCount % 1000 === 0) process.stdout.write(`  ${movCount} inserted...\r`);
      }
    }
  }

  // Flush remaining
  if (movBatch.length > 0) {
    const { error } = await supabase.from("movements").insert(movBatch);
    if (error) { console.error(`  Final batch error: ${error.message}`); skipCount += movBatch.length; }
    else movCount += movBatch.length;
  }

  console.log(`\n  ${movCount} movements inserted, ${skipCount} skipped.`);

  // 7. Recalculate stock levels
  console.log("\nRecalculating stock levels...");
  const { data: allMovements } = await supabase.from("movements").select("product_id, movement_type, quantity");

  if (allMovements) {
    const stockMap = {};
    for (const m of allMovements) {
      if (!m.product_id) continue;
      if (!stockMap[m.product_id]) stockMap[m.product_id] = 0;
      if (m.movement_type === "entree" || m.movement_type === "retour") {
        stockMap[m.product_id] += Number(m.quantity);
      } else {
        stockMap[m.product_id] -= Number(m.quantity);
      }
    }

    const stockRecords = Object.entries(stockMap).map(([productId, qty]) => ({
      product_id: productId,
      current_quantity: qty,
      min_threshold: 10,
      max_capacity: Math.max(Math.abs(qty) * 2, 1000),
      status: qty < 0 ? "negative" : qty < 10 ? "critical" : qty < 50 ? "low" : "ok",
      unit: "L",
    }));

    for (let i = 0; i < stockRecords.length; i += 50) {
      const batch = stockRecords.slice(i, i + 50);
      await supabase.from("stock_levels").upsert(batch, { onConflict: "product_id" });
    }
    console.log(`  ${stockRecords.length} stock levels calculated.`);
  }

  // 8. Generate alerts for negative/critical stock
  console.log("\nGenerating alerts...");
  const { data: criticalStock } = await supabase
    .from("stock_levels")
    .select("product_id, current_quantity, status, products(trade_name)")
    .or("status.eq.negative,status.eq.critical");

  if (criticalStock) {
    const alertRecords = criticalStock.slice(0, 100).map((s) => ({
      type: s.current_quantity < 0 ? "negative_stock" : "critical_stock",
      severity: "critical",
      message: s.current_quantity < 0
        ? `Stock négatif détecté pour ${s.products?.trade_name}`
        : `Stock critique pour ${s.products?.trade_name}`,
      product_id: s.product_id,
      acknowledged: false,
    }));

    for (let i = 0; i < alertRecords.length; i += 50) {
      await supabase.from("alerts").insert(alertRecords.slice(i, i + 50));
    }
    console.log(`  ${alertRecords.length} alerts created.`);
  }

  console.log("\n✅ Import complete!");
  console.log(`  Products: ${Object.keys(productNameToId).length}`);
  console.log(`  Suppliers: ${Object.keys(supplierNameToId).length}`);
  console.log(`  Sites: ${Object.keys(siteNameToId).length}`);
  console.log(`  Movements: ${movCount}`);
}

main().catch(console.error);
