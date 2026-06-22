/* Backfill lf_purchases.expiry_date from the entrées Excel "Date de péremeption" column.
   The original ETL missed it (header is misspelled "péremeption"). Idempotent.
   Run: node scripts/backfill-purchase-expiry.cjs */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

(function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
})();
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const DOWNLOADS = "C:\\Users\\User\\Downloads";
const find = (kw) => fs.readdirSync(DOWNLOADS).find((f) => f.toLowerCase().endsWith(".xlsx") && f.toLowerCase().includes(kw.toLowerCase()));
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const deaccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const up = (s) => deaccent(norm(s)).toUpperCase();
const toNum = (v) => { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const toDateISO = (v) => {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = norm(v);
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
};

function rowsOf(wb, sheet) {
  const name = wb.SheetNames.find((s) => s.trim() === sheet) || sheet;
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
}
const headerIdx = (rows, kw) => rows.findIndex((r) => r.some((c) => up(c).includes(kw)));
const colmap = (rows, h) => { const head = rows[h].map(up); return (k) => head.findIndex((c) => c.includes(k)); };

function parseSource() {
  const wb = XLSX.readFile(path.join(DOWNLOADS, find("Phytosanitaires")), { cellDates: true });
  const out = [];
  const phyto = rowsOf(wb, "PRODUITS PHYTOSANITAIRES");
  let h = headerIdx(phyto, "DISTRIBUTEUR");
  if (h >= 0) {
    const col = colmap(phyto, h);
    const ci = { prod: col("PRODUIT"), q: col("QUANTITE"), per: col("PEREM"), date: col("DATE") };
    for (let i = h + 1; i < phyto.length; i++) {
      const r = phyto[i]; const name = norm(r[ci.prod]); if (!name) continue;
      out.push({ source: "phyto", product_label: name, quantity: toNum(r[ci.q]), expiry: toDateISO(r[ci.per]) });
    }
  }
  const eng = rowsOf(wb, "ENGRAIS");
  h = headerIdx(eng, "FOURNISSEUR");
  if (h >= 0) {
    const col = colmap(eng, h);
    const ci = { prod: col("PRODUIT"), q: col("QUANTITE"), per: col("PEREM"), date: col("DATE") };
    for (let i = h + 1; i < eng.length; i++) {
      const r = eng[i]; const name = norm(r[ci.prod]); if (!name) continue;
      out.push({ source: "engrais", product_label: name, quantity: toNum(r[ci.q]), expiry: toDateISO(r[ci.per]) });
    }
  }
  return out;
}

(async () => {
  const src = parseSource();
  const withExpiry = src.filter((r) => r.expiry);
  console.log(`Source rows: ${src.length} | with péremption date: ${withExpiry.length}`);

  const { data: rows, error } = await sb
    .from("lf_purchases")
    .select("id, source, product_label, quantity, expiry_date");
  if (error) { console.error(error); process.exit(1); }

  const used = new Set();
  const updates = [];
  for (const s of withExpiry) {
    const match = rows.find(
      (r) => !used.has(r.id) && r.source === s.source && norm(r.product_label) === s.product_label &&
             Number(r.quantity) === Number(s.quantity) && !r.expiry_date
    );
    if (match) { used.add(match.id); updates.push({ id: match.id, expiry_date: s.expiry }); }
  }
  console.log(`Matched DB rows to update: ${updates.length}`);

  let ok = 0;
  for (const u of updates) {
    const { error: e } = await sb.from("lf_purchases").update({ expiry_date: u.expiry_date }).eq("id", u.id);
    if (e) console.warn("update failed", u.id, e.message); else ok++;
  }
  console.log(`Updated: ${ok}/${updates.length}`);
})();
