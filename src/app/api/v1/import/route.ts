import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac, json } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const CATEGORY_MAP: Record<string, string> = {
  fongicide: "fongicide",
  insecticide: "insecticide",
  herbicide: "herbicide",
  engrais: "engrais",
  adjuvant: "adjuvant",
  acaricide: "acaricide",
  "acide nitrique": "acide_nitrique",
  "acide sulfurique": "acide_sulfurique",
  "acide phosphorique": "acide_phosphorique",
  "acide humique": "acide_humique",
  "matiere organique": "matiere_organique",
  "matière organique": "matiere_organique",
  fer: "fer",
  drmx: "drmx",
};

const CULTURE_MAP: Record<string, string> = {
  "a pepins": "a_pepins",
  "à pépins": "a_pepins",
  "a noyau": "a_noyau",
  "à noyau": "a_noyau",
  vigne: "vigne",
  agrumes: "agrumes",
};

function normalizeCategory(raw: string): string {
  if (!raw) return "autre";
  const lower = raw.toLowerCase().trim();
  return CATEGORY_MAP[lower] || "autre";
}

function normalizeCulture(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  return CULTURE_MAP[lower] || "autre";
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(raw).trim();
  // Try DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Try YYYY-MM-DD
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return str;
  return null;
}

function parseNum(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return isNaN(n) ? 0 : Math.abs(n);
}

// Normalize header text to match expected columns
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
}

interface ParsedRow {
  date: string;
  category: string;
  productName: string;
  stockInitial: number;
  transfert: number;
  entree: number;
  retour: number;
  sortie: number;
  culture: string | null;
  siteName: string;
  detailsSite: string;
  observations: string;
  n: number;
  f: number;
  k: number;
  c: number;
  zin: number;
  autre: string;
}

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i] || "");
    if (h.includes("date")) map.date = i;
    else if (h.includes("categorie") || h.includes("category")) map.category = i;
    else if (h.includes("produit") || h.includes("nom commercial")) map.product = i;
    else if (h.includes("stock initial")) map.stockInitial = i;
    else if (h.includes("transfert")) map.transfert = i;
    else if (h.includes("entree") || h.includes("entre")) map.entree = i;
    else if (h.includes("retour")) map.retour = i;
    else if (h.includes("sortie")) map.sortie = i;
    else if (h.includes("culture")) map.culture = i;
    else if (h === "site" || h.includes("site") && !h.includes("detail")) map.site = i;
    else if (h.includes("details site") || h.includes("detail")) map.detailsSite = i;
    else if (h.includes("observation") || h.includes("autres")) map.observations = i;
    else if (h === "n") map.n = i;
    else if (h === "p" || h === "f") map.f = i;
    else if (h === "k") map.k = i;
    else if (h === "c" || h === "ca") map.c = i;
    else if (h.includes("zin") || h === "zn") map.zin = i;
    else if (h.includes("autre")) map.autre = i;
  }
  return map;
}

function parseRows(sheet: XLSX.WorkSheet): ParsedRow[] {
  const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
  if (json.length < 2) return [];

  // Find header row (first row with "Date" or "Produit")
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, json.length); i++) {
    const row = json[i];
    if (row.some((c: unknown) => normalizeHeader(String(c)).includes("date"))) {
      headerIdx = i;
      break;
    }
  }

  const headerMap = mapHeaders((json[headerIdx] as string[]).map(String));
  if (headerMap.date === undefined || headerMap.product === undefined) {
    throw new Error("Colonnes 'Date' et 'Produit' requises dans le fichier");
  }

  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < json.length; i++) {
    const r = json[i] as unknown[];
    const productName = String(r[headerMap.product] || "").trim();
    if (!productName) continue;

    const date = parseDate(r[headerMap.date]);
    if (!date) continue;

    rows.push({
      date,
      category: normalizeCategory(String(r[headerMap.category] || "")),
      productName,
      stockInitial: parseNum(r[headerMap.stockInitial]),
      transfert: parseNum(r[headerMap.transfert]),
      entree: parseNum(r[headerMap.entree]),
      retour: parseNum(r[headerMap.retour]),
      sortie: parseNum(r[headerMap.sortie]),
      culture: normalizeCulture(String(r[headerMap.culture] || "")),
      siteName: String(r[headerMap.site] || "").trim(),
      detailsSite: String(r[headerMap.detailsSite] || "").trim(),
      observations: String(r[headerMap.observations] || "").trim(),
      n: parseNum(r[headerMap.n]),
      f: parseNum(r[headerMap.f]),
      k: parseNum(r[headerMap.k]),
      c: parseNum(r[headerMap.c]),
      zin: parseNum(r[headerMap.zin]),
      autre: String(r[headerMap.autre] || "").trim(),
    });
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const supabase = auth.supabase;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return json({ error: "Aucun fichier fourni" }, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return json({ error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsed = parseRows(sheet);

    if (parsed.length === 0) {
      return NextResponse.json({ error: "Aucune ligne valide trouvée" }, { status: 400 });
    }

    // 1. Collect unique product names and upsert
    const uniqueProducts = [...new Set(parsed.map((r) => r.productName))];
    const productMap: Record<string, string> = {};

    // Fetch existing products
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, trade_name")
      .in("trade_name", uniqueProducts);

    for (const p of existingProducts || []) {
      productMap[p.trade_name.toLowerCase()] = p.id;
    }

    // Insert missing products
    const missingProducts = uniqueProducts.filter(
      (name) => !productMap[name.toLowerCase()]
    );
    if (missingProducts.length > 0) {
      // Find category from parsed rows for each missing product
      const toInsert = missingProducts.map((name) => {
        const row = parsed.find((r) => r.productName === name);
        return {
          trade_name: name,
          category: row?.category || "autre",
          stock_initial_2024: row?.stockInitial || 0,
        };
      });

      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert(toInsert)
        .select("id, trade_name");

      if (insertErr) {
        return NextResponse.json(
          { error: `Erreur insertion produits: ${insertErr.message}` },
          { status: 500 }
        );
      }

      for (const p of inserted || []) {
        productMap[p.trade_name.toLowerCase()] = p.id;
      }
    }

    // Update stock_initial for existing products if provided
    for (const row of parsed) {
      if (row.stockInitial > 0) {
        const pid = productMap[row.productName.toLowerCase()];
        if (pid) {
          await supabase
            .from("products")
            .update({ stock_initial_2024: row.stockInitial, category: row.category })
            .eq("id", pid);
        }
      }
    }

    // 2. Collect unique sites
    const uniqueSites = [...new Set(parsed.filter((r) => r.siteName).map((r) => r.siteName))];
    const siteMap: Record<string, string> = {};

    if (uniqueSites.length > 0) {
      const { data: existingSites } = await supabase
        .from("sites")
        .select("id, name");

      for (const s of existingSites || []) {
        siteMap[s.name.toLowerCase()] = s.id;
      }
    }

    // 3. Build movement records
    const MOVEMENT_TYPES = ["transfert", "entree", "retour", "sortie"] as const;
    const movements: Record<string, unknown>[] = [];

    for (const row of parsed) {
      const productId = productMap[row.productName.toLowerCase()];
      if (!productId) continue;

      const siteId = row.siteName ? siteMap[row.siteName.toLowerCase()] || null : null;

      for (const type of MOVEMENT_TYPES) {
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
          observations: row.observations || null,
          n_units: row.n || null,
          p_units: row.f || null,
          k_units: row.k || null,
          ca_units: row.c || null,
          zinc_units: row.zin || null,
        });
      }
    }

    if (movements.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          rowsParsed: parsed.length,
          productsCreated: missingProducts.length,
          movementsInserted: 0,
        },
        message: "Aucun mouvement avec quantité > 0 trouvé",
      });
    }

    // 4. Batch insert movements (500 at a time)
    const BATCH_SIZE = 500;
    let totalInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < movements.length; i += BATCH_SIZE) {
      const batch = movements.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("movements").insert(batch);
      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        totalInserted += batch.length;
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      stats: {
        rowsParsed: parsed.length,
        productsCreated: missingProducts.length,
        productsUpdated: uniqueProducts.length - missingProducts.length,
        movementsInserted: totalInserted,
        movementsTotal: movements.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
