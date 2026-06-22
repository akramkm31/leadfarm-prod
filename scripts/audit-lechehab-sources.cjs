/* Audit: inspect the Lechehab source Excel files vs DB expectations.
   Read-only. Run: node scripts/audit-lechehab-sources.cjs */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DOWNLOADS = "C:\\Users\\User\\Downloads";
const find = (kw) => fs.readdirSync(DOWNLOADS).find((f) => f.toLowerCase().endsWith(".xlsx") && f.toLowerCase().includes(kw.toLowerCase()));
const FILES = {
  entrees: find("Phytosanitaires"),
  resteStock: find("RESTE_EN_STOCK"),
  besoins: find("RESTE DES BESOINS"),
  fertigation: find("PLANIFICATION ENGRAIS"),
};
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const deaccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const up = (s) => deaccent(norm(s)).toUpperCase();

function inspect(label, file) {
  console.log(`\n=== ${label}: ${file || "(NOT FOUND)"} ===`);
  if (!file) return;
  const wb = XLSX.readFile(path.join(DOWNLOADS, file), { cellDates: true });
  for (const sheet of wb.SheetNames) {
    const ws = wb.Sheets[sheet];
    if (!ws || !ws["!ref"]) { console.log(`  [${sheet}] empty`); continue; }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
    // find header row = first row with >=3 non-empty cells
    let h = rows.findIndex((r) => r.filter((c) => norm(c)).length >= 3);
    if (h < 0) h = 0;
    const header = (rows[h] || []).map(norm).filter(Boolean);
    const dataRows = rows.slice(h + 1).filter((r) => r.some((c) => norm(c)));
    console.log(`  [${sheet}] ${dataRows.length} data rows | headers: ${header.slice(0, 14).join(" | ")}`);
    // flag expiry/peremption columns
    const expiryCols = header.filter((c) => /PEREMPTION|PERIMP|EXPIR|VALIDIT|DLU|DLC/.test(up(c)));
    if (expiryCols.length) {
      const headRow = (rows[h] || []).map(up);
      for (const ec of expiryCols) {
        const idx = headRow.findIndex((c) => c.includes(up(ec)));
        const nonEmpty = idx >= 0 ? dataRows.filter((r) => norm(r[idx])).length : 0;
        console.log(`     -> expiry col "${ec}" : ${nonEmpty}/${dataRows.length} non-empty`);
      }
    }
  }
}

for (const [label, file] of Object.entries(FILES)) inspect(label, file);
