/* Extract a CLEAN referential (active ingredients, products, suppliers, geography,
   stations) from the Groupe Lechehab Excel files -> docs/lechehab-referentiel.json. */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DOWNLOADS = "C:\\Users\\User\\Downloads";
const find = (kw) =>
  fs.readdirSync(DOWNLOADS).find((f) => f.toLowerCase().endsWith(".xlsx") && f.toLowerCase().includes(kw.toLowerCase()));
const FILES = {
  resteStock: find("RESTE_EN_STOCK"),
  entrees: find("Phytosanitaires"),
  besoins: find("RESTE DES BESOINS"),
  fertigation: find("PLANIFICATION ENGRAIS"),
  stock2026: fs.existsSync(path.join(DOWNLOADS, "GESTION DU STOCK SBA 2026.xlsx")) ? "GESTION DU STOCK SBA 2026.xlsx" : "GESTION DU STOCK SBA 2026 (1).xlsx",
  stock2025: "GESTION DU STOCK SBA 2025 (1).xlsx",
};

const open = (f) => (f && fs.existsSync(path.join(DOWNLOADS, f)) ? XLSX.readFile(path.join(DOWNLOADS, f), { cellDates: true }) : null);
const rowsOf = (wb, name, maxRow = 1200) => {
  if (!wb) return [];
  const realName = wb.SheetNames.find((s) => s.trim() === name.trim()) || name;
  const ws = wb.Sheets[realName];
  if (!ws) return [];
  const dec = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const clamped = XLSX.utils.encode_range({ s: dec.s, e: { r: Math.min(dec.e.r, maxRow), c: Math.min(dec.e.c, 30) } });
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "", range: clamped });
};
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const up = (s) => norm(s).toUpperCase();
const headerIdx = (rows, ...keys) => rows.findIndex((r) => r.some((c) => keys.some((k) => up(c).includes(k))));
const colmap = (rows, h) => {
  const head = rows[h].map(up);
  return (k) => head.findIndex((c) => c.includes(k));
};

// Canonical top-level category. Everything nutrient/specialty -> AUTRE (raw kept as subcategory).
function canonCat(raw) {
  const c = up(raw);
  if (!c || c === "/") return "";
  if (c.startsWith("FONG")) return "FONGICIDE";
  if (c.startsWith("HERB")) return "HERBICIDE";
  if (c.startsWith("INSECT") || c === "ACARICIDE" || c === "NEMATICIDE") return "INSECTICIDE";
  if (c.startsWith("ENGRAIS")) return "ENGRAIS";
  if (c === "FER") return "FER";
  if (c.startsWith("ACIDE")) return "ACIDE";
  if (c === "DRMX" || c.includes("DORMANCE") || c.includes("LEVEE")) return "DORMANCE";
  if (c === "HORMONES" || c.includes("HORMONE") || c.includes("ECLAIRC")) return "HORMONE";
  return "AUTRE";
}
const CANON = ["FONGICIDE", "HERBICIDE", "INSECTICIDE", "ENGRAIS", "FER", "ACIDE", "DORMANCE", "HORMONE", "AUTRE"];

const ref = {
  units: new Set(),
  subcategories: new Set(),
  ai: new Map(),
  products: new Map(), // lowercased name -> product
  suppliers: new Map(),
  regions: new Set(),
  zones: new Set(),
  sites: new Set(),
  cultures: new Set(),
  stations: new Map(),
};

function addProduct({ name, ma, topCat, sub, unit, composition }) {
  name = norm(name);
  if (!name || name === "/" || up(name) === "PRODUIT" || up(name).startsWith("(VIDE")) return;
  const key = name.toLowerCase();
  const p = ref.products.get(key) || { name, category: "", subcategory: "", ma: "", unit: "", composition: "" };
  const cat = canonCat(topCat);
  if (cat) {
    // prefer a specific category over AUTRE
    if (!p.category || (p.category === "AUTRE" && cat !== "AUTRE")) p.category = cat;
  }
  if (sub && canonCat(sub) === "AUTRE" && up(sub) !== "AUTRE" && norm(sub) !== "/") p.subcategory = p.subcategory || up(sub);
  if (ma && norm(ma) !== "/" && !up(ma).startsWith("(VIDE")) p.ma = p.ma || norm(ma);
  if (unit) { p.unit = p.unit || up(unit); ref.units.add(up(unit)); }
  if (composition && norm(composition) !== "/") p.composition = p.composition || norm(composition);
  if (p.subcategory) ref.subcategories.add(p.subcategory);
  if (p.ma) ref.ai.set(p.ma.toLowerCase(), { name: p.ma });
  ref.products.set(key, p);
}
function addSupplier(name, role) {
  name = up(name);
  if (!name || name === "/" || name.startsWith("(VIDE")) return;
  const s = ref.suppliers.get(name) || { name, roles: new Set() };
  s.roles.add(role);
  ref.suppliers.set(name, s);
}

// 1) RESTE_EN_STOCK -> canonical product list (sheet name = top category for FONG/HERB/INSECT)
const wbStock = open(FILES.resteStock);
if (wbStock)
  for (const sheet of wbStock.SheetNames) {
    const rows = rowsOf(wbStock, sheet);
    const h = headerIdx(rows, "PRODUIT");
    if (h < 0) continue;
    const col = colmap(rows, h);
    const ci = { ma: col("MATIERE"), prod: col("PRODUIT"), comp: col("COMPOSITION"), unit: col("UNITE"), cat: col("CATEGORIE") };
    const sheetCat = canonCat(sheet);
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!norm(r[ci.prod])) continue;
      const subRaw = ci.cat >= 0 ? r[ci.cat] : "";
      addProduct({ name: r[ci.prod], ma: r[ci.ma], topCat: sheet, sub: subRaw, unit: ci.unit >= 0 ? r[ci.unit] : "", composition: ci.comp >= 0 ? r[ci.comp] : "" });
    }
  }

// 2) Liste des Entrées -> enrich + distributors (+ Qx units on engrais)
const wbEnt = open(FILES.entrees);
if (wbEnt) {
  const phyto = rowsOf(wbEnt, "PRODUITS PHYTOSANITAIRES");
  let h = headerIdx(phyto, "DISTRIBUTEUR");
  if (h >= 0) {
    const col = colmap(phyto, h);
    const ci = { cat: col("CATEGORIE"), prod: col("PRODUIT"), ma: col("MATIERE"), unit: col("UNITE"), dist: col("DISTRIBUTEUR") };
    for (let i = h + 1; i < phyto.length; i++) {
      const r = phyto[i];
      if (!norm(r[ci.prod])) continue;
      addProduct({ name: r[ci.prod], ma: r[ci.ma], topCat: r[ci.cat], unit: r[ci.unit] });
      addSupplier(r[ci.dist], "distributor");
    }
  }
  const eng = rowsOf(wbEnt, "ENGRAIS");
  h = headerIdx(eng, "FOURNISSEUR");
  if (h >= 0) {
    const col = colmap(eng, h);
    const ci = { prod: col("PRODUIT"), unit: col("UNITE"), four: col("FOURNISSEUR") };
    for (let i = h + 1; i < eng.length; i++) {
      const r = eng[i];
      if (!norm(r[ci.prod])) continue;
      addProduct({ name: r[ci.prod], topCat: "ENGRAIS", unit: r[ci.unit] });
      addSupplier(r[ci.four], "distributor");
    }
  }
}

// 3) 2025 ENTREES sheet -> manufacturer + distributor pairs (BAYER / CASAP, etc.)
const wb25 = open(FILES.stock2025);
if (wb25) {
  const ent = rowsOf(wb25, "ENTREES");
  const h = headerIdx(ent, "FOURNISSEUR", "DISTRIBUTEUR");
  if (h >= 0) {
    const col = colmap(ent, h);
    const ci = { prod: col("PRODUIT"), ma: col("MATIERE"), cat: col("CATEGORIE"), four: col("FOURNISSEUR"), dist: col("DISTRIBUTEUR"), unit: col("ENTREE") };
    for (let i = h + 1; i < ent.length; i++) {
      const r = ent[i];
      if (norm(r[ci.prod])) addProduct({ name: r[ci.prod], ma: r[ci.ma], topCat: r[ci.cat] });
      addSupplier(r[ci.four], "manufacturer");
      addSupplier(r[ci.dist], "distributor");
    }
  }
  // PARCELLES (region/zone/site)
  const p = rowsOf(wb25, "PARCELLES");
  const hp = headerIdx(p, "REGION", "SITE");
  if (hp >= 0) {
    const col = colmap(p, hp);
    const ci = { cult: col("CULTURE"), reg: col("REGION"), zone: col("ZONE"), site: col("SITE") };
    for (let i = hp + 1; i < p.length; i++) {
      const r = p[i];
      if (norm(r[ci.reg])) ref.regions.add(norm(r[ci.reg]));
      if (norm(r[ci.zone])) ref.zones.add(norm(r[ci.zone]));
      if (norm(r[ci.site])) ref.sites.add(norm(r[ci.site]));
      if (norm(r[ci.cult])) ref.cultures.add(up(r[ci.cult]));
    }
  }
}

// 4) MOUVEMENT 2026 -> enrich + sites/cultures
const wbMvt = open(FILES.stock2026);
if (wbMvt) {
  const mvt = rowsOf(wbMvt, "MOUVEMENT", 800);
  const h = headerIdx(mvt, "MATIERE ACTIVE");
  if (h >= 0) {
    const col = colmap(mvt, h);
    const ci = { cat: col("CATEGORIE"), prod: col("PRODUIT"), ma: col("MATIERE"), cult: col("CULTURE"), site: col("SITE") };
    for (let i = h + 1; i < mvt.length; i++) {
      const r = mvt[i];
      if (norm(r[ci.prod])) addProduct({ name: r[ci.prod], ma: r[ci.ma], topCat: r[ci.cat] });
      if (norm(r[ci.cult])) ref.cultures.add(up(r[ci.cult]));
      if (norm(r[ci.site])) ref.sites.add(norm(r[ci.site]));
    }
  }
  const listes = rowsOf(wbMvt, "_LISTES");
  for (let i = 1; i < listes.length; i++) {
    if (norm(listes[i][2])) ref.sites.add(norm(listes[i][2]));
    if (norm(listes[i][5])) ref.cultures.add(up(listes[i][5]));
  }
}

// 5) Fertigation PARCELLES -> stations + sectors + surface (use French columns)
const wbF = open(FILES.fertigation);
if (wbF) {
  const p = rowsOf(wbF, "PARCELLES");
  const h = headerIdx(p, "SUP");
  if (h >= 0) {
    const head = p[h].map(up);
    const idxStations = head.findIndex((c) => c === "STATIONS");
    const idxStation = head.findIndex((c) => c === "STATION");
    const stCol = idxStations >= 0 ? idxStations : idxStation;
    const sectCol = head.findIndex((c) => c.includes("SECTEUR"));
    const supCol = head.findIndex((c) => c === "SUP");
    let current = "";
    for (let i = h + 1; i < p.length; i++) {
      const r = p[i];
      const st = norm(r[stCol]) || current;
      if (norm(r[stCol])) current = norm(r[stCol]);
      if (!st) continue;
      const station = ref.stations.get(st) || { name: st, sectors: [] };
      const code = sectCol >= 0 ? norm(r[sectCol]) : "";
      const sup = supCol >= 0 ? Number(r[supCol]) || null : null;
      if (code) station.sectors.push({ code, surface_ha: sup });
      ref.stations.set(st, station);
    }
  }
}

const catsUsed = [...new Set([...ref.products.values()].map((p) => p.category).filter(Boolean))].sort();
const out = {
  generatedFrom: FILES,
  topCategories: catsUsed,
  canonicalCategories: CANON,
  subcategories: [...ref.subcategories].sort(),
  units: [...ref.units].sort(),
  cultures: [...ref.cultures].sort(),
  activeIngredients: [...ref.ai.values()].sort((a, b) => a.name.localeCompare(b.name)),
  products: [...ref.products.values()].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name)),
  suppliers: [...ref.suppliers.values()].map((s) => ({ name: s.name, roles: [...s.roles] })).sort((a, b) => a.name.localeCompare(b.name)),
  geography: { regions: [...ref.regions].sort(), zones: [...ref.zones].sort(), sites: [...ref.sites].sort() },
  stations: [...ref.stations.values()],
};
const dest = path.join(process.cwd(), "docs", "lechehab-referentiel.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");
const noMA = out.products.filter((p) => !p.ma).length;
const noCat = out.products.filter((p) => !p.category).length;
console.log("topCategories:", out.topCategories.join(", "));
console.log("subcategories:", out.subcategories.length, "->", out.subcategories.join(", "));
console.log("units:", out.units.join(", "));
console.log("activeIngredients:", out.activeIngredients.length);
console.log("products:", out.products.length, "| sans MA:", noMA, "| sans catégorie:", noCat);
console.log("suppliers:", out.suppliers.length, "->", out.suppliers.map((s) => s.name + "[" + s.roles.join("/") + "]").join(", "));
console.log("regions:", out.geography.regions.length, "zones:", out.geography.zones.length, "sites:", out.geography.sites.length);
console.log("cultures:", out.cultures.join(", "));
console.log("stations:", out.stations.length, "->", out.stations.map((s) => s.name + "(" + s.sectors.length + "sect)").join(", "));
console.log("WROTE", dest);
