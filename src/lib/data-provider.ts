/**
 * Data Provider — Supabase when configured, mock-data fallback.
 * Pages import from here instead of mock-data or queries directly.
 */
import { supabase } from "./supabase";
import { SUPABASE_CONFIGURED } from "./data-provider-config";
import { deductStockForTreatment } from "./treatments/stock-deduction";

export { SUPABASE_CONFIGURED };
export {
  fetchParcelles,
  insertParcelle,
  updateParcelle,
  deleteParcelle,
  type ParcelleUI,
} from "./parcelles/repository";

// Types are imported directly from mock-data by consumers.
// Data arrays are loaded dynamically via import("./mock-data") inside each function
// to keep the mock data out of the production bundle when Supabase is configured.

function toIsoDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null): string {
  if (!error) return "Erreur inconnue";
  return [error.message, error.code, error.details, error.hint].filter(Boolean).join(" — ");
}

async function resolveExploitationId(parcelleId: string | null): Promise<string | null> {
  if (!parcelleId || !SUPABASE_CONFIGURED) return null;
  const { data: parcelle } = await supabase
    .from("parcelles")
    .select("exploitation_id")
    .eq("id", parcelleId)
    .maybeSingle();
  if (parcelle?.exploitation_id) return parcelle.exploitation_id;
  return null;
}

async function loadTreatmentProducts(treatmentId: string): Promise<
  { product_id: string; quantity_used?: number | null; unit?: string | null; nom_commercial?: string | null }[]
> {
  const [tpRes, tdRes] = await Promise.all([
    supabase
      .from("treatment_products")
      .select("product_id, quantity_used, unit, products(trade_name)")
      .eq("treatment_id", treatmentId),
    supabase
      .from("treatment_detail_products")
      .select("product_id, nom_commercial, quantite_sortir")
      .eq("treatment_id", treatmentId),
  ]);

  const rows: {
    product_id: string;
    quantity_used?: number | null;
    unit?: string | null;
    nom_commercial?: string | null;
  }[] = [];

  for (const p of tpRes.data ?? []) {
    const legacyName = (p as { products?: { trade_name?: string } }).products?.trade_name;
    if (!p.product_id && !legacyName) continue;
    rows.push({
      product_id: p.product_id ?? "",
      quantity_used: p.quantity_used,
      unit: p.unit,
      nom_commercial: legacyName ?? null,
    });
  }

  for (const p of tdRes.data ?? []) {
    const qty = p.quantite_sortir ? parseFloat(String(p.quantite_sortir)) : null;
    if (!p.product_id && !p.nom_commercial) continue;
    if (!qty || qty <= 0) continue;
    rows.push({
      product_id: p.product_id ?? "",
      quantity_used: qty,
      unit: "l",
      nom_commercial: p.nom_commercial ?? null,
    });
  }

  return rows;
}

async function registerTraceCertificate(treatmentId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch(`/api/v1/treatments/${treatmentId}/trace`, { method: "POST" });
  } catch {
    // best-effort — PDF route also registers trace
  }
}

// ============================================================
// Snake→Camel mappers (Supabase returns snake_case)
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Real-data (lf_*) taxonomy → legacy UI taxonomy ──────────────
const LF_CATEGORY_TO_LEGACY: Record<string, string> = {
  FONGICIDE: "fongicide",
  HERBICIDE: "herbicide",
  INSECTICIDE: "insecticide",
  ENGRAIS: "engrais",
  FER: "fer",
  ACIDE: "acide",
  DORMANCE: "dormance",
  HORMONE: "hormone",
  AUTRE: "autre",
};
const lfCategory = (c?: string | null): string =>
  LF_CATEGORY_TO_LEGACY[(c || "").toUpperCase()] || "autre";

const LF_FLOW_TO_TYPE: Record<string, string> = {
  stock_initial: "stock_initial",
  transfert: "transfer",
  entree: "entry",
  retour: "return",
  sortie: "exit",
};
const LF_FLOW_TO_CATEGORY: Record<string, string> = {
  stock_initial: "ajustement_inventaire",
  transfert: "transfert_externe",
  entree: "entree_fournisseur",
  retour: "retour_parcelle",
  sortie: "sortie_traitement",
};

// Enriched catalogue row (lf_products_full) → PhytoProduct UI shape.
function mapProduct(row: any): any {
  const reste = Number(row.reste) || 0;
  return {
    id: row.id,
    name: row.name,
    tradeName: row.name,
    registrationNumber: "",
    activeSubstance: row.active_ingredient || "",
    composition: row.composition || "",
    teneurMA: row.teneur_ma || "",
    teneurMAUnit: "",
    category: lfCategory(row.category),
    categoryRaw: row.category,
    familleChimique: row.famille_chimique || "",
    formulation: row.formulation || "",
    cible: row.cible ? [row.cible] : [],
    dar: row.dar_days ?? null,
    unit: row.unit || "l",
    subcategory: row.subcategory || "",
    priceDZD: 0,
    supplierId: row.last_supplier_id || null,
    supplierName: row.last_supplier || "",
    expiryDate: row.next_expiry || "",
    stockInitial: row.snapshot_qty ?? 0,
    reste,
    status: row.is_negative ? "negative" : reste > 0 ? "ok" : "empty",
    pictograms: [],
    toxicityClass: "",
  };
}

// Enriched catalogue row (lf_products_full) → StockLevel UI shape.
function mapStockLevel(row: any): any {
  const reste = Number(row.reste) || 0;
  return {
    productId: row.id,
    productName: row.name,
    category: lfCategory(row.category),
    currentQuantity: reste,
    unit: row.unit || "l",
    minThreshold: 0,
    maxCapacity: Math.max(reste, Number(row.snapshot_qty) || 0, 1),
    lastEntryDate: row.last_purchase_date || "",
    lastExitDate: null,
    totalValueDZD: 0,
    avgUnitPriceDZD: 0,
    status: row.is_negative ? "critical" : "ok",
    expiryDate: row.next_expiry || "",
    lotNumber: undefined,
    stockInitial: row.snapshot_qty ?? 0,
    isNegative: !!row.is_negative,
    subcategory: row.subcategory || "",
    activeSubstance: row.active_ingredient || "",
  };
}

// lf_suppliers_full → Supplier UI shape.
function mapSupplier(row: any): any {
  return {
    id: row.id,
    name: row.name,
    type: row.role === "manufacturer" ? "fabricant" : "distributeur",
    role: row.role,
    phone: row.phone || "",
    email: row.email || undefined,
    address: row.address || undefined,
    city: row.city || "",
    wilaya: row.wilaya || "",
    registrationNumber: row.registration_number || undefined,
    totalDeliveries: Number(row.delivery_count) || 0,
    totalValueDZD: 0,
    totalQuantity: Number(row.total_quantity) || 0,
    productCount: Number(row.product_count) || 0,
    lastDeliveryDate: row.last_delivery || null,
    active: row.active ?? true,
  };
}

// lf_movements (+ joined lf_products) → StockEntry/movement UI shape.
function mapMovement(row: any): any {
  const p = row.lf_products || {};
  const flow = row.flow || "";
  const type = LF_FLOW_TO_TYPE[flow] || flow;
  const magnitude = Math.abs(Number(row.quantity) || 0);
  const signed = flow === "sortie" || flow === "transfert" ? -magnitude : magnitude;
  return {
    id: row.id,
    date: row.date,
    productId: row.product_id,
    productName: p.name || "",
    category: lfCategory(p.category),
    movementType: type,
    type,
    flow,
    movementCategory: LF_FLOW_TO_CATEGORY[flow] || "ajustement_inventaire",
    quantity: signed,
    unit: row.unit || p.unit || "l",
    reference: row.source_tag || undefined,
    lotNumber: undefined,
    culture: row.culture || undefined,
    siteId: row.site_id || undefined,
    siteName: row.site_name || undefined,
    detailsSite: row.details_site || undefined,
    supplierId: row.supplier_id || null,
    supplierName: "",
    observations: row.notes || undefined,
    notes: row.notes || undefined,
    dar: row.dar_days ?? null,
    stockInitial: null,
    nUnits: null,
    pUnits: null,
    kUnits: null,
    caUnits: null,
    zincUnits: null,
  };
}

function parseLegacyForPr6Notes(notes: string | null | undefined): Record<string, unknown> {
  if (!notes || typeof notes !== "string") return {};
  const marker = "---FOR.PR6.003---";
  const idx = notes.indexOf(marker);
  if (idx === -1) return {};
  try {
    return JSON.parse(notes.substring(idx + marker.length).trim()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapTreatment(row: any): any {
  const forData = parseLegacyForPr6Notes(row.notes);
  const pick = (col: string, legacyKey: string, fallback: unknown = "") =>
    row[col] ?? forData[legacyKey] ?? fallback;

  const humanNotes =
    typeof row.notes === "string" && row.notes.includes("---FOR.PR6.003---")
      ? row.notes.split("---FOR.PR6.003---")[0]?.trim() || ""
      : row.notes;

  return {
    id: row.id,
    siteId: row.site_id,
    parcelleName: row.site_name || "",
    sousParcelleName: row.sous_parcelle_name || "",
    sousParcelleId: row.sous_parcelle_id ?? null,
    operatorId: row.operator_id,
    operatorName: row.operator_name || "",
    status: row.status,
    type: row.type,
    plannedDate: row.planned_date,
    executedDate: row.executed_date,
    areaTreatedHectares: row.area_treated_hectares ?? 0,
    treesCount: row.trees_count,
    weatherConditions: row.weather_conditions,
    windSpeed: row.wind_speed,
    temperature: row.temperature,
    humidity: row.humidity,
    volumeBouillie: row.volume_bouillie,
    volumeBouillieUnit: row.volume_bouillie_unit,
    notes: humanNotes,
    parcelleId: row.parcelle_id ?? null,
    totalCostDzd: row.total_cost_dzd ?? 0,
    culture: pick("culture", "culture"),
    variete: pick("variete", "variete"),
    cible: pick("cible", "cible"),
    mode_application: pick("mode_application", "mode_application"),
    materiel: pick("materiel", "materiel"),
    vitesse_kmh: pick("vitesse_kmh", "vitesse_kmh", null),
    pression_bar: pick("pression_bar", "pression_bar", null),
    diametre_pastilles_mm: pick("diametre_pastilles_mm", "diametre_pastilles_mm", null),
    produitsDetail: (() => {
      const fromDetailTable = (row.treatment_detail_products || []).map((p: any) => ({
        productId: p.product_id || "",
        nom_commercial: p.nom_commercial || "",
        matiere_active: p.matiere_active || "",
        dose_hl: p.dose_hl || "",
        quantite_sortir: p.quantite_sortir || "",
        dar_jours: p.dar_jours || 21,
      }));
      if (fromDetailTable.length > 0) return fromDetailTable;
      return ((forData as any).produitsDetail || []).map((p: any) => ({
        productId: p.productId || "",
        nom_commercial: p.nom_commercial || "",
        matiere_active: p.matiere_active || "",
        dose_hl: p.dose_hl || "",
        quantite_sortir: p.quantite_sortir || "",
        dar_jours: p.dar_jours || 21,
      }));
    })(),
    date_reelle: pick("date_reelle", "date_reelle", null),
    heure_debut: pick("heure_debut", "heure_debut", null),
    heure_fin: pick("heure_fin", "heure_fin", null),
    quantite_utilisee: pick("quantite_utilisee", "quantite_utilisee"),
    bouillon_citerne_l: pick("bouillon_citerne_l", "bouillon_citerne_l", null),
    nb_citernes: pick("nb_citernes", "nb_citernes", null),
    date_reentree: pick("date_reentree", "date_reentree", null),
    dar_jours: pick("dar_jours", "dar_jours", null),
    efficacite: pick("efficacite", "efficacite"),
    visa_rt: pick("visa_rt", "visa_rt"),
    // ── products : prefer treatment_products table, fallback to produitsDetail ──
    products: (() => {
      const fromTable = (row.treatment_products || []).map((tp: any) => ({
        productId: tp.product_id,
        productName: tp.products?.trade_name || "",
        quantityUsed: tp.quantity_used,
        unit: tp.unit || tp.products?.unit || "L",
        dosePerHectare: tp.dose_per_hectare,
      }));
      if (fromTable.length > 0) return fromTable;
      const fromDetail = (row.treatment_detail_products || []).map((p: any) => ({
        productId: p.product_id || "",
        productName: p.nom_commercial || "",
        quantityUsed: p.quantite_sortir ? parseFloat(p.quantite_sortir) : null,
        unit: "L",
        dosePerHectare: p.dose_hl ? parseFloat(p.dose_hl) : null,
      }));
      if (fromDetail.length > 0) return fromDetail;
      return ((forData as any).produitsDetail || []).map((p: any) => ({
        productId: p.productId || "",
        productName: p.nom_commercial || "",
        quantityUsed: p.quantite_sortir || null,
        unit: "L",
        dosePerHectare: p.dose_hl ? parseFloat(p.dose_hl) : null,
      }));
    })(),
  };
}

function mapAlert(row: any): any {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    message: row.message,
    relatedId: row.related_id,
    acknowledged: row.acknowledged,
    timestamp: row.timestamp,
  };
}

function mapOperator(row: any): any {
  return {
    id: row.id,
    name: row.name,
    fullName: row.name,
    identifierCode: row.identifier_code || `OP-${String(row.id).slice(0, 3).toUpperCase()}`,
    role: row.role,
    phone: row.phone,
    certificationNumber: row.certification_number,
    active: row.active,
    totalTreatments: row.total_treatments ?? 0,
    lastTreatmentDate: row.last_treatment_date ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// Generic fetcher with fallback
// ============================================================

export async function fetchFromSupabase<T>(
  table: string,
  select: string = "*",
  options?: {
    order?: { column: string; ascending?: boolean };
    eq?: Record<string, string>;
    limit?: number;
  }
): Promise<T[] | null> {
  if (!SUPABASE_CONFIGURED) return null;

  try {
    let query = supabase.from(table).select(select);

    if (options?.eq) {
      for (const [col, val] of Object.entries(options.eq)) {
        query = query.eq(col, val);
      }
    }
    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.warn(`Supabase fetch ${table} failed, using mock:`, error.message);
      return null;
    }
    return data as T[];
  } catch {
    return null;
  }
}

// ============================================================
// Products
// ============================================================

export async function fetchProducts() {
  const data = await fetchFromSupabase("lf_products_full", "*", {
    order: { column: "name" },
  });
  if (data) return data.map(mapProduct);
  if (!SUPABASE_CONFIGURED) {
    const { products } = await import("./mock-data");
    return products;
  }
  return [];
}

// ============================================================
// Suppliers
// ============================================================

export async function fetchSuppliers() {
  const data = await fetchFromSupabase("lf_suppliers_full", "*", {
    order: { column: "name" },
  });
  if (data) return data.map(mapSupplier);
  if (!SUPABASE_CONFIGURED) {
    const { suppliers } = await import("./mock-data");
    return suppliers;
  }
  return [];
}

// ============================================================
// Movements
// ============================================================

export async function fetchMovements(filters?: {
  category?: string;
  movement_type?: string;
  limit?: number;
}) {
  if (!SUPABASE_CONFIGURED) {
    const { stockEntries } = await import("./mock-data");
    return stockEntries;
  }

  try {
    const query = supabase
      .from("lf_movements")
      .select("*, lf_products(name, category, unit)")
      .order("date", { ascending: false })
      .limit(filters?.limit || 300);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapMovement);
  } catch (err) {
    console.warn("[fetchMovements]", err);
    if (!SUPABASE_CONFIGURED) {
      const { stockEntries } = await import("./mock-data");
      return stockEntries;
    }
    return [];
  }
}

// ============================================================
// Stock Levels
// ============================================================

export async function fetchStockLevels() {
  const data = await fetchFromSupabase("lf_products_full", "*", {
    order: { column: "reste", ascending: false },
  });
  if (data) return data.map(mapStockLevel);
  if (!SUPABASE_CONFIGURED) {
    const { stockLevels } = await import("./mock-data");
    return stockLevels;
  }
  return [];
}

// Parcelles: see ./parcelles/repository.ts (ADR-15)

// ============================================================
// Treatments
// ============================================================

export async function fetchTreatments(status?: string) {
  if (!SUPABASE_CONFIGURED) {
    const { treatments } = await import("./mock-data");
    return status ? treatments.filter((t: any) => t.status === status) : treatments;
  }

  try {
    let query = supabase
      .from("treatments")
      .select("*, treatment_products(*, products(trade_name, unit)), treatment_detail_products(*)")
      .order("planned_date", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTreatment);
  } catch (err) {
    console.warn("[fetchTreatments]", err);
    if (!SUPABASE_CONFIGURED) {
      const { treatments } = await import("./mock-data");
      return status ? treatments.filter((t: any) => t.status === status) : treatments;
    }
    return [];
  }
}

export async function insertTreatment(data: {
  parcelleName: string;
  /** UUID parcelle Supabase — alimente `treatments.parcelle_id` / traçabilité */
  parcelleId?: string;
  type: string;
  plannedDate: string;
  operatorName?: string;
  areaTreatedHectares?: number;
  volumeBouillie?: number;
  volumeBouillieUnit?: string;
  notes?: string;
  status?: string;
  products?: { productId: string; dosePerHectare?: number; quantityUsed?: number; unit?: string }[];
  // ── FOR.PR6.003 ──
  culture?: string;
  variete?: string;
  cible?: string;
  modeApplication?: string;
  materiel?: string;
  vitesseKmh?: number;
  pressionBar?: number;
  diametrePastillesMm?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  produitsDetail?: {
    productId: string;
    nom_commercial: string;
    matiere_active: string;
    dose_hl: string;
    quantite_sortir: string;
    dar_jours: number;
  }[];
  dateReelle?: string;
  heureDebut?: string;
  heureFin?: string;
  qteProduitUtilise?: string;
  bouillonParCiterne?: number;
  nbCiternes?: number;
  dateReentree?: string;
  darJours?: number;
  efficacite?: string;
  visaRT?: string;
}) {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("Supabase non configuré");
  }

  const res = await fetch("/api/v1/treatments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = Array.isArray(body.details) ? body.details.join(", ") : "";
    throw new Error(body.error || details || `Erreur HTTP ${res.status}`);
  }
  return mapTreatment(body);
}

export async function deleteTreatment(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error("Supabase non configuré");
  await supabase.from("treatment_detail_products").delete().eq("treatment_id", id);
  await supabase.from("treatment_products").delete().eq("treatment_id", id);
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTreatment(
  id: string,
  data: {
    parcelleName?: string;
    plannedDate?: string;
    operatorName?: string;
    areaTreatedHectares?: number;
    status?: string;
    culture?: string;
    variete?: string;
    cible?: string;
    modeApplication?: string;
    materiel?: string;
    vitesseKmh?: number;
    pressionBar?: number;
    diametrePastillesMm?: number;
    produitsDetail?: {
      productId: string;
      nom_commercial: string;
      matiere_active: string;
      dose_hl: string;
      quantite_sortir: string;
      dar_jours: number;
    }[];
    dateReelle?: string;
    heureDebut?: string;
    heureFin?: string;
    qteProduitUtilise?: string;
    bouillonParCiterne?: number;
    nbCiternes?: number;
    dateReentree?: string;
    darJours?: number;
    efficacite?: string;
    visaRT?: string;
  }
): Promise<any> {
  if (!SUPABASE_CONFIGURED) throw new Error("Supabase non configuré");

  const payload: Record<string, unknown> = {};
  if (data.parcelleName !== undefined) payload.site_name = data.parcelleName;
  if (data.plannedDate !== undefined) payload.planned_date = toIsoDate(data.plannedDate as string);
  if (data.operatorName !== undefined) payload.operator_name = data.operatorName;
  if (data.areaTreatedHectares !== undefined) payload.area_treated_hectares = data.areaTreatedHectares;
  if (data.status !== undefined) payload.status = data.status;
  if (data.culture !== undefined) payload.culture = data.culture;
  if (data.variete !== undefined) payload.variete = data.variete;
  if (data.cible !== undefined) payload.cible = data.cible;
  if (data.modeApplication !== undefined) payload.mode_application = data.modeApplication;
  if (data.materiel !== undefined) payload.materiel = data.materiel;
  if (data.vitesseKmh !== undefined) payload.vitesse_kmh = data.vitesseKmh;
  if (data.pressionBar !== undefined) payload.pression_bar = data.pressionBar;
  if (data.diametrePastillesMm !== undefined) payload.diametre_pastilles_mm = data.diametrePastillesMm;
  if (data.dateReelle !== undefined) payload.date_reelle = toIsoDate(data.dateReelle as string);
  if (data.heureDebut !== undefined) payload.heure_debut = data.heureDebut;
  if (data.heureFin !== undefined) payload.heure_fin = data.heureFin;
  if (data.qteProduitUtilise !== undefined) payload.quantite_utilisee = data.qteProduitUtilise;
  if (data.bouillonParCiterne !== undefined) payload.bouillon_citerne_l = data.bouillonParCiterne;
  if (data.nbCiternes !== undefined) payload.nb_citernes = data.nbCiternes;
  if (data.dateReentree !== undefined) payload.date_reentree = toIsoDate(data.dateReentree as string);
  if (data.darJours !== undefined) payload.dar_jours = data.darJours;
  if (data.efficacite !== undefined) payload.efficacite = data.efficacite;
  if (data.visaRT !== undefined) payload.visa_rt = data.visaRT;

  const { data: row, error } = await supabase
    .from("treatments")
    .update(payload)
    .eq("id", id)
    .select("*, treatment_products(*, products(trade_name, unit))")
    .single();

  if (error) throw new Error(error.message);

  // Refresh treatment_products if produitsDetail provided
  if (data.produitsDetail) {
    await supabase.from("treatment_products").delete().eq("treatment_id", id);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const tpRows = data.produitsDetail
      .filter(p => p.productId && uuidRe.test(p.productId))
      .map(p => ({
        treatment_id: id,
        product_id: p.productId,
        dose_per_hectare: p.dose_hl ? parseFloat(p.dose_hl) || null : null,
        quantity_used: p.quantite_sortir ? parseFloat(p.quantite_sortir) || null : null,
        unit: "L",
      }));
    if (tpRows.length > 0) {
      const { error: tpErr } = await supabase.from("treatment_products").insert(tpRows);
      if (tpErr) console.warn("[updateTreatment] treatment_products warn:", tpErr.message);
    }
  }

  return mapTreatment(row);
}

export async function updateTreatmentStatus(
  id: string,
  status: "planned" | "in_progress" | "completed" | "cancelled",
  extra?: { executedDate?: string; volumeBouillie?: number; areaTreatedHectares?: number; notes?: string }
) {
  if (!SUPABASE_CONFIGURED) throw new Error("Supabase non configuré");

  const payload: Record<string, unknown> = { status };
  if (extra?.executedDate) payload.executed_date = extra.executedDate;
  if (extra?.volumeBouillie !== undefined) payload.volume_bouillie = extra.volumeBouillie;
  if (extra?.areaTreatedHectares !== undefined) payload.area_treated_hectares = extra.areaTreatedHectares;
  if (extra?.notes) payload.notes = extra.notes;

  const { data: row, error } = await supabase
    .from("treatments")
    .update(payload)
    .eq("id", id)
    .select("*, treatment_products(*, products(trade_name, unit))")
    .single();

  if (error) throw new Error(error.message);

  if (status === "completed") {
    const products = await loadTreatmentProducts(id);
    const siteName = (row as { site_name?: string })?.site_name;
    await deductStockForTreatment(id, products, {
      siteName: siteName ?? undefined,
      notes: `Traitement terminé ${id}`,
    });
    await registerTraceCertificate(id);
  }

  return mapTreatment(row);
}

// ============================================================
// Nouveau Flux de Traitement (Real Data Flow)
// ============================================================

export async function recordTreatmentPoint(point: {
  traitement_id: string;
  lat: number;
  lng: number;
  debit1_lpm: number;
  debit2_lpm: number;
  volume_cumul_l: number;
  speed_kmh: number;
}) {
  if (!SUPABASE_CONFIGURED) return;
  const { error } = await supabase.from("traitement_points").insert({
    treatment_id: point.traitement_id,
    lat: point.lat,
    lng: point.lng,
    debit1_lpm: point.debit1_lpm,
    debit2_lpm: point.debit2_lpm,
    volume_cumul_l: point.volume_cumul_l,
    speed_kmh: point.speed_kmh,
  });
  if (error) console.error("Error recording point:", error);
}

export async function finalizeTreatment(id: string, stats: {
  endTime: string;
  totalVolume: number;
  avgDose: number;
  durationSeconds: number;
  distanceM: number;
  areaHa: number;
}) {
  return finalizeTreatmentFull(id, {
    endTime: stats.endTime,
    totalVolume: stats.totalVolume,
    avgDose: stats.avgDose,
    durationSeconds: stats.durationSeconds,
    distanceM: stats.distanceM,
    areaHa: stats.areaHa,
  });
}

export async function fetchActiveTreatment(deviceId: string) {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from("treatments")
    .select("*")
    .eq("device_id", deviceId)
    .eq("status", "in_progress")
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    parcelle_name: data.site_name,
    start_time: data.start_time ?? data.created_at,
  };
}

/** Create a new treatment session instantly from live ESP32 data */
export async function createRealTreatment(params: {
  deviceId: string;
  parcelleName: string;
  type: string;
  startLat: number;
  startLng: number;
  parcelleId?: string;
}): Promise<{ id: string; parcelle_name: string; type: string; start_time: string } | null> {
  if (!SUPABASE_CONFIGURED) {
    return {
      id: `local-${Date.now()}`,
      parcelle_name: params.parcelleName,
      type: params.type,
      start_time: new Date().toISOString(),
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const parcelleId = params.parcelleId && uuidRe.test(params.parcelleId) ? params.parcelleId : null;
  const exploitationId = await resolveExploitationId(parcelleId);

  const { data, error } = await supabase
    .from("treatments")
    .insert({
      device_id: params.deviceId,
      site_name: params.parcelleName,
      parcelle_id: parcelleId,
      exploitation_id: exploitationId,
      type: params.type,
      status: "in_progress",
      planned_date: today,
      executed_date: today,
      start_time: now,
      start_lat: params.startLat,
      start_lng: params.startLng,
    })
    .select("id, type, start_time, site_name")
    .single();

  if (error) {
    console.error("[createRealTreatment]", error);
    return null;
  }
  return {
    id: data.id,
    parcelle_name: data.site_name ?? params.parcelleName,
    type: data.type,
    start_time: data.start_time ?? now,
  };
}

/** Save a full GPS trajectory buffer to traitement_points */
export async function saveTreatmentTrajectory(
  traitementId: string,
  payload: {
    points: [number, number, number, string][];
    startTime: string;
    endTime: string;
  }
): Promise<void> {
  if (!SUPABASE_CONFIGURED || payload.points.length === 0) return;
  const rows = payload.points.map(([lat, lng, speed, ts]) => ({
    treatment_id: traitementId,
    lat,
    lng,
    speed_kmh: speed,
    debit1_lpm: 0,
    debit2_lpm: 0,
    volume_cumul_l: 0,
    timestamp: ts,
  }));
  const { error } = await supabase.from("traitement_points").insert(rows);
  if (error) console.error("[saveTreatmentTrajectory]", error);
}

export async function fetchHistoricalTraitements() {
  if (!SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("treatments")
    .select("*")
    .eq("status", "completed")
    .order("end_time", { ascending: false });

  if (error) return [];
  return data;
}

export async function fetchTreatmentWithPoints(id: string) {
  if (!SUPABASE_CONFIGURED) return null;

  const { data: treatment, error: tError } = await supabase
    .from("treatments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (treatment && !tError) {
    const { data: points } = await supabase
      .from("traitement_points")
      .select("*")
      .eq("treatment_id", id)
      .order("timestamp", { ascending: true });
    return { ...treatment, points: points || [] };
  }

  const { data: legacy, error: legacyError } = await supabase
    .from("traitements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (legacyError || !legacy) return null;

  const { data: points } = await supabase
    .from("traitement_points")
    .select("*")
    .eq("traitement_id", id)
    .order("timestamp", { ascending: true });

  return { ...legacy, points: points || [] };
}

// ============================================================
// Treatment Workflow (State Machine)
// ============================================================

const STATUS_TRANSITIONS: Record<string, string[]> = {
  planned:          ["in_progress"],
  in_progress:      ["completed"],
  completed:        ["cancelled"],
  cancelled:        [],
};

export function canTransition(current: string, next: string): boolean {
  return STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

/** Transition a treatment through the status state machine */
export async function transitionTreatmentStatus(
  id: string,
  newStatus: string,
  meta?: { approbateurId?: string; notes?: string }
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  const payload: Record<string, unknown> = { status: newStatus };
  if (meta?.notes) payload.notes = meta.notes;

  const { data: treatment } = await supabase
    .from("treatments")
    .select("*, treatment_products(*)")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("treatments")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "treatments",
    record_id: id,
    action: newStatus.toUpperCase(),
    new_data: payload,
  }).then(() => {});

  if (newStatus === "completed") {
    const products = await loadTreatmentProducts(id);
    if (products.length > 0) {
      await deductStockForTreatment(id, products, {
        siteName: treatment?.site_name ?? undefined,
        notes: `Traitement ${id}`,
      });
    }
  }
}

/** Finalize treatment with DAR + stock deductions */
export async function finalizeTreatmentFull(
  id: string,
  stats: {
    endTime: string;
    totalVolume: number;
    avgDose: number;
    durationSeconds: number;
    distanceM: number;
    areaHa: number;
    darDays?: number;
    stockDeductions?: { lotId: string; quantite: number }[];
  }
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  const darDays = stats.darDays ?? 0;
  const darDateRecolte = darDays > 0
    ? new Date(Date.now() + darDays * 86400000).toISOString().split("T")[0]
    : null;

  const { error } = await supabase
    .from("treatments")
    .update({
      status: "completed",
      end_time: stats.endTime,
      executed_date: stats.endTime.slice(0, 10),
      total_volume_l: stats.totalVolume,
      avg_dose_ha: stats.avgDose,
      volume_bouillie: stats.totalVolume,
      duration_seconds: stats.durationSeconds,
      distance_m: stats.distanceM,
      area_covered_ha: stats.areaHa,
      area_treated_hectares: stats.areaHa,
      dar_jours: darDays || null,
      date_reentree: darDateRecolte,
      dar_date_recolte_autorisee: darDateRecolte,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const products = await loadTreatmentProducts(id);
  if (products.length > 0) {
    const { data: treatment } = await supabase
      .from("treatments")
      .select("site_name")
      .eq("id", id)
      .maybeSingle();
    await deductStockForTreatment(id, products, {
      siteName: treatment?.site_name ?? undefined,
      notes: `Traitement terminé ${id}`,
    });
  } else if (stats.stockDeductions?.length) {
    await deductStockForTreatment(
      id,
      stats.stockDeductions.map((d) => ({
        product_id: d.lotId,
        quantity_used: d.quantite,
        unit: "l",
      })),
    );
  }

  await supabase.from("audit_log").insert({
    table_name: "treatments",
    record_id: id,
    action: "COMPLETE",
    new_data: { status: "completed", dar_date_recolte_autorisee: darDateRecolte },
  }).then(() => {});

  await registerTraceCertificate(id);
}

// ============================================================
// Operators
// ============================================================

export async function fetchOperators() {
  const data = await fetchFromSupabase("operators", "*", {
    order: { column: "name" },
  });
  if (data) return data.map(mapOperator);
  if (!SUPABASE_CONFIGURED) {
    const { operators } = await import("./mock-data");
    return operators;
  }
  return [];
}

export async function insertOperator(data: {
  name: string;
  role: string;
  phone?: string;
  certificationNumber?: string;
}) {
  if (!SUPABASE_CONFIGURED) throw new Error("Supabase non configuré");

  const { data: row, error } = await supabase
    .from("operators")
    .insert({
      name: data.name,
      role: data.role,
      phone: data.phone || null,
      certification_number: data.certificationNumber || null,
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapOperator(row);
}

// ============================================================
// Alerts
// ============================================================

export async function fetchAlerts() {
  const data = await fetchFromSupabase("alerts", "*", {
    order: { column: "timestamp", ascending: false },
  });
  if (data) return data.map(mapAlert);
  const { alerts } = await import("./mock-data");
  return alerts;
}

// ============================================================
// Dashboard Stats
// ============================================================

export async function fetchDashboardStats() {
  if (!SUPABASE_CONFIGURED) {
    const { dashboardStats } = await import("./mock-data");
    return dashboardStats;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 7);
    })();

    const [products, stock, sectors, sites, needs, treatments] = await Promise.all([
      supabase.from("lf_products").select("id", { count: "exact", head: true }),
      supabase.from("lf_products_full").select("is_negative, next_expiry"),
      supabase.from("lf_sectors").select("surface_ha"),
      supabase.from("lf_sites").select("id", { count: "exact", head: true }),
      supabase.from("lf_needs").select("id", { count: "exact", head: true }),
      supabase.from("treatments").select("status, executed_date, planned_date"),
    ]);

    const stockRows = stock.data || [];
    const negatives = stockRows.filter((s: { is_negative: boolean }) => s.is_negative).length;
    const expiring = stockRows.filter(
      (s: { next_expiry: string | null }) =>
        s.next_expiry && s.next_expiry >= today && s.next_expiry <= in90
    ).length;
    const totalAreaHectares = (sectors.data || []).reduce(
      (sum: number, r: { surface_ha: number | null }) => sum + (r.surface_ha ?? 0),
      0
    );

    const txRows = (treatments.data || []) as { status: string; executed_date: string | null; planned_date: string | null }[];
    const activeTreatments = txRows.filter(t => t.status === "in_progress").length;
    const completedTreatments = txRows.filter(t => t.status === "completed").length;
    const treatmentsThisMonth = txRows.filter(t =>
      (t.executed_date ?? t.planned_date ?? "").startsWith(thisMonth)
    ).length;
    const lastMonthCount = txRows.filter(t =>
      t.status === "completed" && (t.executed_date ?? "").startsWith(lastMonth)
    ).length;
    const treatmentsTrend = lastMonthCount > 0
      ? Math.round(((treatmentsThisMonth - lastMonthCount) / lastMonthCount) * 100)
      : 0;

    return {
      totalProducts: products.count || 0,
      totalStockValue: 0,
      lowStockCount: negatives,
      totalParcelles: sites.count || 0,
      totalAreaHectares: Math.round(totalAreaHectares * 100) / 100,
      activeTreatments,
      completedTreatments,
      treatmentsThisMonth,
      treatmentsTrend,
      operatorsActive: 0,
      alertsCount: negatives,
      avgCostPerHectare: 0,
      totalTransfers: 0,
      productsExpiringSoon: expiring,
      needsCount: needs.count || 0,
    };
  } catch {
    const { dashboardStats } = await import("./mock-data");
    return dashboardStats;
  }
}

// ============================================================
// Mutations (always target Supabase when configured)
// Validated with Zod schemas before hitting the database
// ============================================================

import {
  movementSchema,
  stockLevelUpdateSchema,
  alertUpdateSchema,
} from "./validations";
import {
  lfUnit,
  mapMovementInputToLfRow,
  mapMovementUpdatesToLfRow,
} from "./movements/lf-movement";

async function insertLfMovementViaApi(row: Record<string, unknown>) {
  const res = await fetch("/api/v1/movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(row),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || body?.message || `Erreur HTTP ${res.status}`);
  }
  return body;
}

// ── Add/Edit payload normalizers (legacy UI shape → lf_* columns) ──
const LEGACY_CAT_TO_LF: Record<string, string> = {
  fongicide: "FONGICIDE", herbicide: "HERBICIDE", insecticide: "INSECTICIDE",
  engrais: "ENGRAIS", fer: "FER", acide: "ACIDE",
  acide_phosphorique: "ACIDE", acide_nitrique: "ACIDE", acide_sulfurique: "ACIDE", acide_humique: "ACIDE",
  dormance: "DORMANCE", hormone: "HORMONE", acaricide: "INSECTICIDE",
  matiere_organique: "AUTRE", adjuvant: "AUTRE", semence: "AUTRE", drmx: "AUTRE", autre: "AUTRE",
};
const lfCatUpper = (c?: unknown): string => LEGACY_CAT_TO_LF[String(c ?? "").toLowerCase()] || "AUTRE";

const PRODUCT_COL_TO_LF: Record<string, string> = {
  trade_name: "name", name: "name",
  active_substance: "active_ingredient_text",
  formulation: "formulation", famille_chimique: "famille_chimique",
};
const SUPPLIER_TYPE_TO_ROLE: Record<string, string> = {
  fabricant: "manufacturer", distributeur: "distributor", fournisseur: "distributor",
};

export async function insertMovement(movement: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("Supabase non configuré — enregistrement impossible");
  }

  movementSchema.parse({
    ...movement,
    quantity: Math.abs(Number(movement.quantity)),
  });

  const productId = movement.product_id;
  if (!movement.unit && typeof productId === "string") {
    const { data: prod } = await supabase
      .from("lf_products")
      .select("unit")
      .eq("id", productId)
      .maybeSingle();
    if (prod?.unit) movement.unit = prod.unit;
  }

  const row = mapMovementInputToLfRow(movement);

  try {
    return await insertLfMovementViaApi(row);
  } catch (apiErr) {
    const { data, error } = await supabase
      .from("lf_movements")
      .insert(row)
      .select("*, lf_products(name, category, unit)")
      .single();
    if (error) {
      throw new Error(formatSupabaseError(error));
    }
    if (apiErr instanceof Error) console.warn("[insertMovement] API fallback:", apiErr.message);
    return data;
  }
}

export async function updateMovement(id: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const row = mapMovementUpdatesToLfRow(updates);
  if (Object.keys(row).length === 0) return null;

  const { data, error } = await supabase
    .from("lf_movements")
    .update(row)
    .eq("id", id)
    .select("*, lf_products(name, category, unit)")
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function insertProduct(product: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const row = {
    name: String(product.trade_name || product.name || "").trim(),
    category: lfCatUpper(product.category),
    active_ingredient_text: product.active_substance || null,
    formulation: product.formulation || null,
    unit: lfUnit(product.unit),
  };
  if (!row.name) throw new Error("Nom du produit requis");
  const { data, error } = await supabase.from("lf_products").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) row[PRODUCT_COL_TO_LF[k] || k] = v;
  if ("category" in row) row.category = lfCatUpper(row.category);
  if ("unit" in row) row.unit = lfUnit(row.unit);
  const { data, error } = await supabase.from("lf_products").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateStockLevel(productId: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = stockLevelUpdateSchema.parse(updates);
  const { data, error } = await supabase.from("stock_levels").update(validated).eq("product_id", productId).select().single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(id: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const row: Record<string, unknown> = { ...updates };
  if ("type" in row) { row.role = SUPPLIER_TYPE_TO_ROLE[String(row.type).toLowerCase()] || "distributor"; delete row.type; }
  const { data, error } = await supabase.from("lf_suppliers").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function insertSupplier(supplier: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const row = {
    name: String(supplier.name || "").trim(),
    role: SUPPLIER_TYPE_TO_ROLE[String(supplier.type ?? "").toLowerCase()] || "distributor",
    phone: supplier.phone || null,
    email: supplier.email || null,
    address: supplier.address || null,
    wilaya: supplier.wilaya || null,
  };
  if (!row.name) throw new Error("Nom du fournisseur requis");
  const { data, error } = await supabase.from("lf_suppliers").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMovement(id: string) {
  if (!SUPABASE_CONFIGURED) return null;
  const { error } = await supabase.from("lf_movements").delete().eq("id", id);
  if (error) throw new Error(formatSupabaseError(error));
  return true;
}

export async function updateAlert(id: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = alertUpdateSchema.parse(updates);
  const { data, error } = await supabase.from("alerts").update(validated).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function acknowledgeAllAlerts() {
  if (!SUPABASE_CONFIGURED) return null;
  const { error } = await supabase.from("alerts").update({ acknowledged: true }).eq("acknowledged", false);
  if (error) throw error;
  return true;
}

// ============================================================
// Expiry Alerts — Péremption J-30/15/7/0
// ============================================================

export type ExpiryAlert = {
  lot_id: string;
  numero_lot: string;
  produit_nom: string;
  date_peremption: string;
  stock_disponible: number;
  unite: string;
  days_left: number;
  level: "j30" | "j15" | "j7" | "j0";
};

export async function fetchExpiryAlerts(): Promise<ExpiryAlert[]> {
  if (!SUPABASE_CONFIGURED) return [];

  const { data, error } = await supabase
    .from("lots_stock")
    .select(`id, numero_lot, date_peremption, quantite_initiale, unite,
             produit:produits_ppp(nom_commercial)`)
    .order("date_peremption");

  if (error || !data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data as any[])
    .map(row => {
      const expiry = new Date(row.date_peremption);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      let level: ExpiryAlert["level"] | null = null;
      if (daysLeft <= 0)  level = "j0";
      else if (daysLeft <= 7)  level = "j7";
      else if (daysLeft <= 15) level = "j15";
      else if (daysLeft <= 30) level = "j30";
      if (!level) return null;
      return {
        lot_id: row.id,
        numero_lot: row.numero_lot,
        produit_nom: (row.produit as any)?.nom_commercial || "—",
        date_peremption: row.date_peremption,
        stock_disponible: row.quantite_initiale,
        unite: row.unite,
        days_left: daysLeft,
        level,
      };
    })
    .filter(Boolean) as ExpiryAlert[];
}

// ============================================================
// Météo — Open-Meteo (gratuit, pas de clé)
// ============================================================

export type MeteoData = {
  temperature: number;
  windspeed: number;
  precipitation_prob: number;
  weathercode: number;
  humidity?: number;
  alerts: { message: string; level: "info" | "warning" | "danger" }[];
};

export async function fetchMeteo(lat: number, lng: number): Promise<MeteoData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current_weather=true&hourly=precipitation_probability,temperature_2m,windspeed_10m,relativehumidity_2m` +
      `&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = await res.json();

    const temp   = json.current_weather?.temperature ?? 0;
    const wind   = json.current_weather?.windspeed ?? 0;
    const code   = json.current_weather?.weathercode ?? 0;
    const hour   = new Date().getHours();
    const precip = json.hourly?.precipitation_probability?.[hour] ?? 0;
    const humidity = json.hourly?.relativehumidity_2m?.[hour] ?? undefined;

    const alerts: MeteoData["alerts"] = [];
    if (precip > 40)  alerts.push({ level: "warning", message: `Pluie probable dans les prochaines heures (${precip}%) — risque de lessivage` });
    if (wind > 15)    alerts.push({ level: "danger",  message: `Vent ${wind} km/h — risque de dérive, traitement déconseillé` });
    if (wind > 30)    alerts.push({ level: "danger",  message: `Vent fort ${wind} km/h — traitement interdit` });
    if (temp > 30)    alerts.push({ level: "warning", message: `Température ${temp}°C — risque phytotoxicité sur feuillage humide` });
    if (temp > 35)    alerts.push({ level: "danger",  message: `Canicule ${temp}°C — traitement interdit` });

    return { temperature: temp, windspeed: wind, precipitation_prob: precip, weathercode: code, humidity, alerts };
  } catch {
    return null;
  }
}

// ============================================================
// Dashboard KPIs enrichis
// ============================================================

export type DashboardKPIs = {
  traitementsMois: number;
  surfaceMois: number;
  stockValeurDZD: number;
  parcellesEnDAR: number;
  prochainRecolte: { parcelleName: string; date: string } | null;
  expiryCount: number;
  pendingApproval: number;
  stressedParcels: number;
};

export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const empty: DashboardKPIs = {
    traitementsMois: 0,
    surfaceMois: 0,
    stockValeurDZD: 0,
    parcellesEnDAR: 0,
    prochainRecolte: null,
    expiryCount: 0,
    pendingApproval: 0,
    stressedParcels: 0,
  };

  if (!SUPABASE_CONFIGURED) return empty;

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const today = new Date().toISOString().split("T")[0];
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    const [traitementsRes, stockRes, pendingRes, nowStr] = await Promise.all([
      supabase.from("treatments")
        .select("id, area_treated_hectares, status, planned_date, notes")
        .gte("planned_date", startOfMonth.toISOString().split("T")[0]),
      supabase.from("lf_products_full").select("is_negative, next_expiry"),
      supabase.from("treatments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval"),
      Promise.resolve(new Date().toISOString().split("T")[0]),
    ]);

    const tData = traitementsRes.data || [];
    const completedT = tData.filter(t => ["completed", "in_progress", "terminé"].includes(t.status));
    const traitementsMois = completedT.length;
    const surfaceMois = completedT.reduce((sum, t) => sum + (t.area_treated_hectares || 0), 0);

    const stockRows = stockRes.data || [];
    const expiryCount = stockRows.filter(
      (r: { next_expiry: string | null }) => r.next_expiry && r.next_expiry >= today && r.next_expiry <= in90
    ).length;

    const darTreatments: { parcelleName: string; date: string }[] = [];
    const { data: allCompleted } = await supabase.from("treatments")
      .select("id, site_name, notes, executed_date")
      .eq("status", "completed");

    (allCompleted || []).forEach(t => {
      const parsed = parseLegacyForPr6Notes(t.notes);
      const dateReentree = (parsed.date_reentree || parsed.dateReentree) as string;
      if (dateReentree) {
        const parts = dateReentree.split("/");
        if (parts.length === 3) {
          const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          if (isoDate > nowStr) {
            darTreatments.push({ parcelleName: t.site_name || "Parcelle", date: isoDate });
          }
        }
      }
    });

    const parcellesEnDAR = darTreatments.length;
    darTreatments.sort((a, b) => a.date.localeCompare(b.date));
    const prochainRecolte = darTreatments[0] || null;

    return {
      traitementsMois,
      surfaceMois,
      stockValeurDZD: 0,
      parcellesEnDAR,
      prochainRecolte,
      expiryCount,
      pendingApproval: pendingRes.count || 0,
      stressedParcels: 0,
    };
  } catch {
    return empty;
  }
}