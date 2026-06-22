/* Full ETL of the Groupe Lechehab Excel files into Supabase (lf_ schema).
   Uses @supabase/supabase-js with the service role key (bypasses RLS).
   Idempotent: clears each target table before loading.
   Run: node scripts/etl-lechehab-full.cjs */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

// ── env ──────────────────────────────────────────────────────────
(function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
})();
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// service-role key in .env.local is stale; anon works because lf_ tables grant insert to anon + permissive RLS
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Missing SUPABASE URL / key"); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// ── xlsx helpers ─────────────────────────────────────────────────
const DOWNLOADS = "C:\\Users\\User\\Downloads";
const find = (kw) => fs.readdirSync(DOWNLOADS).find((f) => f.toLowerCase().endsWith(".xlsx") && f.toLowerCase().includes(kw.toLowerCase()));
const FILES = {
  resteStock: find("RESTE_EN_STOCK"),
  entrees: find("Phytosanitaires"),
  besoins: find("RESTE DES BESOINS"),
  fertigation: find("PLANIFICATION ENGRAIS"),
  stock2026: fs.existsSync(path.join(DOWNLOADS, "GESTION DU STOCK SBA 2026.xlsx")) ? "GESTION DU STOCK SBA 2026.xlsx" : "GESTION DU STOCK SBA 2026 (1).xlsx",
  stock2025: "GESTION DU STOCK SBA 2025 (1).xlsx",
};
const open = (f) => (f && fs.existsSync(path.join(DOWNLOADS, f)) ? XLSX.readFile(path.join(DOWNLOADS, f), { cellDates: true }) : null);
const rowsOf = (wb, name, maxRow = 8000) => {
  if (!wb) return [];
  const realName = wb.SheetNames.find((s) => s.trim() === name.trim()) || name;
  const ws = wb.Sheets[realName];
  if (!ws) return [];
  const dec = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const ref = XLSX.utils.encode_range({ s: dec.s, e: { r: Math.min(dec.e.r, maxRow), c: Math.min(dec.e.c, 30) } });
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "", range: ref });
};
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const deaccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const up = (s) => deaccent(norm(s)).toUpperCase();
const headerIdx = (rows, ...keys) => rows.findIndex((r) => r.some((c) => keys.some((k) => up(c).includes(k))));
const colmap = (rows, h) => { const head = rows[h].map(up); return (k) => head.findIndex((c) => c.includes(k)); };
const toNum = (v) => { if (v === "" || v == null) return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const toDate = (v) => { if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10); const d = new Date(v); return isNaN(d) ? null : (String(v).match(/^\d{4}-\d{2}-\d{2}/) ? String(v).slice(0, 10) : null); };
const unitOf = (u, cat) => { const x = up(u); if (x === "KG") return "kg"; if (x === "L") return "l"; if (x === "QX") return "qx"; return cat === "ENGRAIS" ? "kg" : "l"; };
const CATS = new Set(["FONGICIDE", "HERBICIDE", "INSECTICIDE", "ENGRAIS", "FER", "ACIDE", "DORMANCE", "HORMONE", "AUTRE"]);
function canonCat(raw) {
  const c = up(raw); if (!c || c === "/") return null;
  if (c.startsWith("FONG")) return "FONGICIDE"; if (c.startsWith("HERB")) return "HERBICIDE";
  if (c.startsWith("INSECT") || c === "ACARICIDE") return "INSECTICIDE"; if (c.startsWith("ENGRAIS")) return "ENGRAIS";
  if (c === "FER") return "FER"; if (c.startsWith("ACIDE")) return "ACIDE";
  return CATS.has(c) ? c : "AUTRE";
}
function culture(raw) { const c = up(raw); if (!c) return null; if (c.includes("PEPIN") || c.includes("POMMIER") || c.includes("POIRIER")) return "a_pepins"; if (c.includes("NOYAU")) return "a_noyau"; if (c.includes("VIGNE")) return "vigne"; return null; }

async function clear(table) { const { error } = await sb.from(table).delete().not("id", "is", null); if (error) console.warn("clear " + table + ":", error.message); }
async function insertBatched(table, rows, size = 500) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + size));
    if (error) { console.warn(table + " batch " + i + ":", error.message); }
    else ok += Math.min(size, rows.length - i);
  }
  return ok;
}

async function main() {
  // referential maps already loaded by seed
  const { data: prods } = await sb.from("lf_products").select("id,name,category,unit");
  const prodByName = new Map();
  for (const p of prods || []) if (!prodByName.has(p.name.toLowerCase())) prodByName.set(p.name.toLowerCase(), p);
  const { data: sups } = await sb.from("lf_suppliers").select("id,name");
  const supByName = new Map((sups || []).map((s) => [up(s.name), s.id]));

  async function ensureProduct(name, cat) {
    const key = norm(name).toLowerCase();
    if (!key) return null;
    if (prodByName.has(key)) return prodByName.get(key).id;
    const c = canonCat(cat) || "AUTRE";
    const { data, error } = await sb.from("lf_products").insert({ name: norm(name), category: c, unit: c === "ENGRAIS" ? "kg" : "l" }).select("id,name,category,unit").single();
    if (error || !data) return null;
    prodByName.set(key, data);
    return data.id;
  }

  // ── 1) SITES (Région→Zone→Site) from 2025 PARCELLES ──
  const wb25 = open(FILES.stock2025);
  const siteByName = new Map();
  if (wb25) {
    const p = rowsOf(wb25, "PARCELLES");
    const h = headerIdx(p, "REGION", "SITE");
    if (h >= 0) {
      const col = colmap(p, h);
      const ci = { cult: col("CULTURE"), reg: col("REGION"), zone: col("ZONE"), site: col("SITE") };
      let region = "", zone = "", cult = "";
      const sites = [];
      for (let i = h + 1; i < p.length; i++) {
        const r = p[i];
        if (norm(r[ci.reg])) region = norm(r[ci.reg]);
        if (norm(r[ci.zone])) zone = norm(r[ci.zone]);
        if (ci.cult >= 0 && norm(r[ci.cult])) cult = norm(r[ci.cult]);
        const site = norm(r[ci.site]);
        if (site && !siteByName.has(site.toLowerCase())) {
          siteByName.set(site.toLowerCase(), true);
          sites.push({ name: site, zone: zone || null, region: region || null, culture: culture(cult) });
        }
      }
      await clear("lf_sites");
      await insertBatched("lf_sites", sites);
      const { data: srows } = await sb.from("lf_sites").select("id,name");
      siteByName.clear();
      for (const s of srows || []) siteByName.set(s.name.toLowerCase(), s.id);
      console.log("sites:", sites.length);
    }
  }

  // ── 2) STATIONS + SECTEURS (fertigation PARCELLES) ──
  const wbF = open(FILES.fertigation);
  const stationByName = new Map();
  let fertLines = [];
  if (wbF) {
    const p = rowsOf(wbF, "PARCELLES");
    const h = headerIdx(p, "SUP");
    if (h >= 0) {
      const head = p[h].map(up);
      const stCol = head.indexOf("STATIONS") >= 0 ? head.indexOf("STATIONS") : head.indexOf("STATION");
      const sectCol = head.findIndex((c) => c.includes("SECTEUR"));
      const supCol = head.indexOf("SUP");
      // intrant columns = everything after SUP that has a header
      const inputCols = [];
      for (let c = supCol + 1; c < head.length; c++) if (norm(head[c])) inputCols.push({ idx: c, label: norm(p[h][c]) });
      const stations = new Map();
      let current = "";
      for (let i = h + 1; i < p.length; i++) {
        const r = p[i];
        if (norm(r[stCol])) current = norm(r[stCol]);
        const st = current;
        const code = sectCol >= 0 ? norm(r[sectCol]) : "";
        const sup = supCol >= 0 ? toNum(r[supCol]) : null;
        if (!st || !code) continue;
        if (!stations.has(st)) stations.set(st, []);
        stations.get(st).push({ code, sup });
        for (const ic of inputCols) {
          const dose = toNum(r[ic.idx]);
          if (dose != null) fertLines.push({ station_label: st, sector_code: code, surface_ha: sup, input_label: ic.label, dose });
        }
      }
      const stationRows = [...stations.keys()].map((name) => ({ name }));
      await clear("lf_fertigation_lines"); await clear("lf_sectors"); await clear("lf_stations");
      await insertBatched("lf_stations", stationRows);
      const { data: strows } = await sb.from("lf_stations").select("id,name");
      for (const s of strows || []) stationByName.set(s.name.toLowerCase(), s.id);
      const sectorRows = [];
      for (const [st, secs] of stations) { const sid = stationByName.get(st.toLowerCase()); const seen = new Set(); for (const s of secs) { if (sid && s.code && !seen.has(s.code)) { seen.add(s.code); sectorRows.push({ station_id: sid, code: s.code, surface_ha: s.sup }); } } }
      await insertBatched("lf_sectors", sectorRows);
      fertLines = fertLines.map((l) => ({ ...l, station_id: stationByName.get(l.station_label.toLowerCase()) || null }));
      await insertBatched("lf_fertigation_lines", fertLines);
      console.log("stations:", stationRows.length, "secteurs:", sectorRows.length, "fertigation lignes:", fertLines.length);
    }
  }

  // ── 3) MOUVEMENTS (ledger, all rows, 5 flows) ──
  const wbM = open(FILES.stock2026);
  if (wbM) {
    const m = rowsOf(wbM, "MOUVEMENT", 8000);
    const h = headerIdx(m, "MATIERE ACTIVE");
    if (h >= 0) {
      const col = colmap(m, h);
      const ci = { date: col("DATE"), cat: col("CATEGORIE"), prod: col("PRODUIT"), dose: col("DOSE"), dar: col("DAR"), si: col("STOCK INITIAL"), tr: col("TRANSFERT"), en: col("ENTREE"), re: col("RETOUR"), so: col("SORTIE"), cult: col("CULTURE"), site: col("SITE"), det: col("DETAILS") };
      const flows = [["si", "stock_initial"], ["tr", "transfert"], ["en", "entree"], ["re", "retour"], ["so", "sortie"]];
      const out = [];
      for (let i = h + 1; i < m.length; i++) {
        const r = m[i];
        const name = norm(r[ci.prod]);
        const date = toDate(r[ci.date]);
        if (!name || !date) continue;
        const cat = r[ci.cat];
        const pid = await ensureProduct(name, cat);
        const base = { date, product_id: pid, unit: unitOf(prodByName.get(name.toLowerCase())?.unit, canonCat(cat)), culture: culture(r[ci.cult]), site_name: ci.site >= 0 ? norm(r[ci.site]) || null : null, details_site: ci.det >= 0 ? norm(r[ci.det]) || null : null, dose: ci.dose >= 0 && norm(r[ci.dose]) !== "/" ? norm(r[ci.dose]) || null : null, dar_days: ci.dar >= 0 ? (Number.isInteger(toNum(r[ci.dar])) ? toNum(r[ci.dar]) : null) : null };
        base.site_id = base.site_name ? siteByName.get(base.site_name.toLowerCase()) || null : null;
        for (const [k, flow] of flows) {
          const qty = ci[k] >= 0 ? toNum(r[ci[k]]) : null;
          if (qty != null && qty !== 0) out.push({ ...base, flow, quantity: Math.abs(qty), source_tag: "import" });
        }
      }
      await clear("lf_movements");
      const ok = await insertBatched("lf_movements", out);
      console.log("mouvements:", out.length, "insérés:", ok);
    }
  }

  // ── 4) ACHATS / ENTRÉES (avec péremption) ──
  const wbE = open(FILES.entrees);
  if (wbE) {
    const purchases = [];
    const phyto = rowsOf(wbE, "PRODUITS PHYTOSANITAIRES");
    let h = headerIdx(phyto, "DISTRIBUTEUR");
    if (h >= 0) {
      const col = colmap(phyto, h);
      const ci = { date: col("DATE"), cat: col("CATEGORIE"), prod: col("PRODUIT"), ma: col("MATIERE"), q: col("QUANTITE"), unit: col("UNIT"), dist: col("DISTRIBUTEUR"), per: col("PEREM") };
      for (let i = h + 1; i < phyto.length; i++) {
        const r = phyto[i]; const name = norm(r[ci.prod]); if (!name) continue;
        const cat = canonCat(r[ci.cat]);
        purchases.push({ date: toDate(r[ci.date]), product_id: prodByName.get(name.toLowerCase())?.id || null, product_label: name, active_ingredient_text: norm(r[ci.ma]) || null, category: cat, quantity: toNum(r[ci.q]), unit: unitOf(r[ci.unit], cat), supplier_id: supByName.get(up(r[ci.dist])) || null, supplier_label: norm(r[ci.dist]) || null, expiry_date: toDate(r[ci.per]), source: "phyto" });
      }
    }
    const eng = rowsOf(wbE, "ENGRAIS");
    h = headerIdx(eng, "FOURNISSEUR");
    if (h >= 0) {
      const col = colmap(eng, h);
      const ci = { date: col("DATE"), prod: col("PRODUIT"), q: col("QUANTITE"), unit: col("UNIT"), four: col("FOURNISSEUR"), per: col("PEREM") };
      for (let i = h + 1; i < eng.length; i++) {
        const r = eng[i]; const name = norm(r[ci.prod]); if (!name) continue;
        purchases.push({ date: toDate(r[ci.date]), product_id: prodByName.get(name.toLowerCase())?.id || null, product_label: name, category: "ENGRAIS", quantity: toNum(r[ci.q]), unit: unitOf(r[ci.unit], "ENGRAIS"), supplier_id: supByName.get(up(r[ci.four])) || null, supplier_label: norm(r[ci.four]) || null, expiry_date: toDate(r[ci.per]), source: "engrais" });
      }
    }
    await clear("lf_purchases");
    console.log("achats:", await insertBatched("lf_purchases", purchases));
  }

  // ── 5) SNAPSHOT (RESTE_EN_STOCK daté) ──
  const wbS = open(FILES.resteStock);
  if (wbS) {
    const snapDate = (FILES.resteStock.match(/(\d{2})\.(\d{2})\.(\d{4})/) || []).slice(1);
    const snapshot_date = snapDate.length === 3 ? `${snapDate[2]}-${snapDate[1]}-${snapDate[0]}` : "2026-06-11";
    const snaps = [];
    for (const sheet of wbS.SheetNames) {
      const rows = rowsOf(wbS, sheet);
      const h = headerIdx(rows, "PRODUIT");
      if (h < 0) continue;
      const col = colmap(rows, h);
      const ci = { ma: col("MATIERE"), prod: col("PRODUIT"), comp: col("COMPOSITION"), unit: col("UNITE"), q: col("QUANTITE") };
      const cat = canonCat(sheet);
      for (let i = h + 1; i < rows.length; i++) {
        const r = rows[i]; const name = norm(r[ci.prod]); if (!name) continue;
        snaps.push({ snapshot_date, product_id: prodByName.get(name.toLowerCase())?.id || null, product_label: name, active_ingredient_text: ci.ma >= 0 ? norm(r[ci.ma]) || null : null, category: cat, composition: ci.comp >= 0 ? norm(r[ci.comp]) || null : null, quantity: toNum(r[ci.q]), unit: unitOf(ci.unit >= 0 ? r[ci.unit] : "", cat) });
      }
    }
    await clear("lf_stock_snapshots");
    console.log("snapshot (" + snapshot_date + "):", await insertBatched("lf_stock_snapshots", snaps));
  }

  // ── 6) BESOINS ──
  const wbB = open(FILES.besoins);
  if (wbB) {
    const needs = [];
    for (const sheet of wbB.SheetNames) {
      const rows = rowsOf(wbB, sheet);
      const h = headerIdx(rows, "RESTE DES BESOINS", "RESTE BESOIN");
      if (h < 0) continue;
      const col = colmap(rows, h);
      const ci = { ma: col("MATIERE"), cat: col("CATEGORIE"), prod: col("PRODUIT"), unit: col("UNITE"), q: head => 0 };
      const qCol = rows[h].map(up).findIndex((c) => c.includes("RESTE"));
      const sheetCat = { FONG: "FONGICIDE", INSECT: "INSECTICIDE", AUTRE: "AUTRE", ENGRAIS: "ENGRAIS", HERB: "HERBICIDE" }[up(sheet)] || "AUTRE";
      for (let i = h + 1; i < rows.length; i++) {
        const r = rows[i]; const prod = norm(r[ci.prod]); if (!prod) continue;
        needs.push({ campaign_year: 2026, category: sheetCat, active_ingredient_text: ci.ma >= 0 ? norm(r[ci.ma]) || null : null, product_label: prod, unit: unitOf(ci.unit >= 0 ? r[ci.unit] : "", sheetCat), quantity_needed: toNum(r[qCol]) });
      }
    }
    await clear("lf_needs");
    console.log("besoins:", await insertBatched("lf_needs", needs));
  }

  // ── récap ──
  const tables = ["lf_active_ingredients", "lf_products", "lf_suppliers", "lf_sites", "lf_stations", "lf_sectors", "lf_movements", "lf_purchases", "lf_stock_snapshots", "lf_needs", "lf_fertigation_lines"];
  console.log("\n=== RÉCAP BDD ===");
  for (const t of tables) { const { count } = await sb.from(t).select("id", { count: "exact", head: true }); console.log(t.padEnd(24), count); }
}

main().then(() => { console.log("\nETL terminé."); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
