/* Dump structure of the Groupe Lechehab Excel files for analysis. */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DOWNLOADS = "C:\\Users\\User\\Downloads";
const KEYWORDS = [
  "GESTION DU STOCK",
  "RESTE_EN_STOCK",
  "Phytosanitaires",
  "RESTE DES BESOINS",
  "PLANIFICATION ENGRAIS",
];

const dest = path.join(process.cwd(), "docs", "lechehab-xlsx-dump.txt");
fs.mkdirSync(path.dirname(dest), { recursive: true });
const stream = fs.createWriteStream(dest, { encoding: "utf8" });
const log = (s = "") => stream.write(s + "\n");
const progress = (s) => process.stderr.write("[progress] " + s + "\n");

const cell = (v) => {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v).replace(/\s+/g, " ").trim().slice(0, 42);
};

let files = [];
try {
  files = fs
    .readdirSync(DOWNLOADS)
    .filter((f) => f.toLowerCase().endsWith(".xlsx"))
    .filter((f) => KEYWORDS.some((k) => f.toLowerCase().includes(k.toLowerCase())));
} catch (e) {
  progress("readdir error: " + e.message);
}
progress("matched files: " + files.length);

for (const f of files) {
  const full = path.join(DOWNLOADS, f);
  progress("reading: " + f);
  log("\n" + "=".repeat(90));
  log("FILE: " + f);
  log("=".repeat(90));
  let wb;
  try {
    wb = XLSX.readFile(full, { cellDates: true, sheetStubs: false });
  } catch (e) {
    log("  !! read error: " + e.message);
    progress("read error " + e.message);
    continue;
  }
  log("Sheets (" + wb.SheetNames.length + "): " + wb.SheetNames.join(" | "));

  for (const name of wb.SheetNames) {
    try {
      const ws = wb.Sheets[name];
      const ref = ws["!ref"] || "A1";
      // Clamp range — some sheets have a bloated !ref that hangs sheet_to_json.
      const dec = XLSX.utils.decode_range(ref);
      const clamped = XLSX.utils.encode_range({
        s: { r: dec.s.r, c: dec.s.c },
        e: { r: Math.min(dec.e.r, 500), c: Math.min(dec.e.c, 40) },
      });
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "", range: clamped });
      const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
      log("\n  --- SHEET: " + name + "  (ref " + ref + " -> read " + clamped + ", rows=" + rows.length + ", cols=" + maxCols + ") ---");
      const limit = Math.min(rows.length, 24);
      for (let i = 0; i < limit; i++) {
        const r = (rows[i] || []).slice(0, 18).map(cell);
        if (r.every((c) => c === "")) continue;
        log("   r" + String(i).padStart(2, "0") + " | " + r.join(" | "));
      }
      if (rows.length > limit) log("   ... (" + (rows.length - limit) + " more rows)");
      progress("  sheet '" + name + "' rows=" + rows.length);
    } catch (e) {
      log("  !! sheet error (" + name + "): " + e.message);
      progress("  sheet error " + name + ": " + e.message);
    }
  }
}

stream.end(() => {
  progress("DONE -> " + dest);
});
