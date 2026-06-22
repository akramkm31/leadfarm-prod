/* Generate SQL seed (active ingredients + products + suppliers) from the
   extracted referential JSON -> supabase/migrations/025_lechehab_seed_referentiel.sql */
const fs = require("fs");
const path = require("path");

const ref = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs", "lechehab-referentiel.json"), "utf8"));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const CATS = new Set(["FONGICIDE", "HERBICIDE", "INSECTICIDE", "ENGRAIS", "FER", "ACIDE", "DORMANCE", "HORMONE", "AUTRE"]);
const unit = (u, cat) => {
  const x = String(u || "").toUpperCase();
  if (x === "KG") return "kg";
  if (x === "L") return "l";
  if (x === "QX") return "qx";
  return cat === "ENGRAIS" ? "kg" : "l";
};
const cat = (c) => (CATS.has(c) ? c : "AUTRE");

const lines = [];
lines.push("-- Seed référentiel Groupe Lechehab (généré depuis docs/lechehab-referentiel.json)");
lines.push("-- Matières actives");
for (const ai of ref.activeIngredients) {
  lines.push(`insert into lf_active_ingredients (name) values (${q(ai.name)}) on conflict (name) do nothing;`);
}
lines.push("\n-- Fournisseurs");
for (const s of ref.suppliers) {
  const role = s.roles.includes("manufacturer") && !s.roles.includes("distributor") ? "manufacturer" : s.roles.includes("manufacturer") ? "manufacturer" : "distributor";
  lines.push(`insert into lf_suppliers (name, role) values (${q(s.name)}, '${role}') on conflict (name) do nothing;`);
}
lines.push("\n-- Produits");
for (const p of ref.products) {
  const c = cat(p.category);
  const u = unit(p.unit, c);
  const cols = ["name", "category", "unit"];
  const vals = [q(p.name), `'${c}'`, `'${u}'`];
  if (p.subcategory) { cols.push("subcategory"); vals.push(q(p.subcategory)); }
  if (p.composition) { cols.push("composition"); vals.push(q(p.composition)); }
  if (p.ma) {
    cols.push("active_ingredient_text"); vals.push(q(p.ma));
    cols.push("active_ingredient_id"); vals.push(`(select id from lf_active_ingredients where name = ${q(p.ma)})`);
  }
  lines.push(`insert into lf_products (${cols.join(", ")}) values (${vals.join(", ")}) on conflict (name, category) do nothing;`);
}

const dest = path.join(process.cwd(), "supabase", "migrations", "025_lechehab_seed_referentiel.sql");
fs.writeFileSync(dest, lines.join("\n"), "utf8");
console.log("AI:", ref.activeIngredients.length, "| suppliers:", ref.suppliers.length, "| products:", ref.products.length);
console.log("statements:", lines.filter((l) => l.startsWith("insert")).length, "-> bytes:", lines.join("\n").length);
console.log("WROTE", dest);
