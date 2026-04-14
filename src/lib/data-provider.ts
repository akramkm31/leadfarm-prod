/**
 * Data Provider — Supabase when configured, mock-data fallback.
 * Pages import from here instead of mock-data or queries directly.
 */
import { supabase } from "./supabase";

const SUPABASE_CONFIGURED =
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export { SUPABASE_CONFIGURED };

// Types are imported directly from mock-data by consumers.
// Data arrays are loaded dynamically via import("./mock-data") inside each function
// to keep the mock data out of the production bundle when Supabase is configured.

// ============================================================
// Snake→Camel mappers (Supabase returns snake_case)
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapStockLevel(row: any): any {
  const p = row.products || {};
  return {
    productId: row.product_id,
    productName: p.trade_name || "Inconnu",
    category: p.category || "autre",
    currentQuantity: row.current_quantity ?? 0,
    unit: p.unit || "L",
    minThreshold: row.min_threshold ?? 0,
    maxCapacity: row.max_capacity ?? 1,
    lastEntryDate: row.updated_at || "",
    lastExitDate: null,
    totalValueDZD: 0,
    avgUnitPriceDZD: 0,
    status: row.status || "ok",
    expiryDate: "",
    stockInitial: p.stock_initial_2024 ?? 0,
  };
}

function mapProduct(row: any): any {
  return {
    id: row.id,
    tradeName: row.trade_name,
    category: row.category,
    activeSubstance: row.active_substance || "",
    teneurMA: row.teneur_ma || "",
    teneurMAUnit: row.teneur_ma_unit || "",
    formulation: row.formulation || "",
    familleChimique: row.famille_chimique || "",
    dose: row.dose || "",
    cible: row.cible ? (Array.isArray(row.cible) ? row.cible : [row.cible]) : [],
    doseUnit: row.dose_unit || "L",
    dar: row.dar,
    unit: row.unit || "L",
    priceDzd: row.price_dzd ?? 0,
    stockInitial2024: row.stock_initial_2024 ?? 0,
    expiryDate: row.expiry_date || "",
    notes: row.notes || "",
    supplierName: "",
    pictograms: [],
    toxicityClass: "",
  };
}

function mapSupplier(row: any): any {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    wilaya: row.wilaya,
    registrationNumber: row.registration_number,
    active: row.active,
  };
}

const MOVEMENT_TYPE_MAP: Record<string, string> = {
  entree: "entry",
  sortie: "exit",
  transfert: "transfer",
  retour: "return",
  entry: "entry",
  exit: "exit",
  transfer: "transfer",
  adjustment: "adjustment",
  treatment_consumption: "treatment_consumption",
};

function mapMovement(row: any): any {
  const p = row.products || {};
  const rawType = row.movement_type || "";
  const normalizedType = MOVEMENT_TYPE_MAP[rawType] || rawType;
  return {
    id: row.id,
    date: row.date,
    productId: row.product_id,
    productName: p.trade_name || "",
    category: row.category,
    movementType: normalizedType,
    type: normalizedType,
    movementCategory: row.category || "autre",
    quantity: row.quantity,
    culture: row.culture,
    siteId: row.site_id,
    siteName: row.site_name,
    detailsSite: row.details_site,
    supplierId: row.supplier_id,
    distributorId: row.distributor_id,
    observations: row.observations,
    unit: p.unit || "L",
    stockInitial: p.stock_initial_2024 ?? null,
    nUnits: row.n_units ?? null,
    pUnits: row.p_units ?? null,
    kUnits: row.k_units ?? null,
    caUnits: row.ca_units ?? null,
    zincUnits: row.zinc_units ?? null,
  };
}

function mapTreatment(row: any): any {
  return {
    id: row.id,
    siteId: row.site_id,
    parcelleName: row.site_name || "",
    sousParcelleName: "",
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
    notes: row.notes,
    totalCostDzd: row.total_cost_dzd ?? 0,
    products: (row.treatment_products || []).map((tp: any) => ({
      productId: tp.product_id,
      productName: tp.products?.trade_name || "",
      quantityUsed: tp.quantity_used,
      unit: tp.unit || tp.products?.unit || "L",
      dosePerHectare: tp.dose_per_hectare,
    })),
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
    role: row.role,
    phone: row.phone,
    certificationNumber: row.certification_number,
    active: row.active,
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
  const data = await fetchFromSupabase("products", "*", {
    order: { column: "trade_name" },
  });
  if (data) return data.map(mapProduct);
  const { products } = await import("./mock-data");
  return products;
}

// ============================================================
// Suppliers
// ============================================================

export async function fetchSuppliers() {
  const data = await fetchFromSupabase("suppliers", "*", {
    order: { column: "name" },
  });
  if (data) return data.map(mapSupplier);
  const { suppliers } = await import("./mock-data");
  return suppliers;
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
    let query = supabase
      .from("movements")
      .select("*, products(trade_name, category, active_substance, unit, stock_initial_2024)")
      .order("date", { ascending: false })
      .limit(filters?.limit || 200);

    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.movement_type) query = query.eq("movement_type", filters.movement_type);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapMovement);
  } catch {
    const { stockEntries } = await import("./mock-data");
    return stockEntries;
  }
}

// ============================================================
// Stock Levels
// ============================================================

export async function fetchStockLevels() {
  const data = await fetchFromSupabase("stock_levels", "*, products(trade_name, category, active_substance, unit, stock_initial_2024, formulation, teneur_ma, teneur_ma_unit, famille_chimique)", {
    order: { column: "current_quantity" },
  });
  if (data) return data.map(mapStockLevel);
  const { stockLevels } = await import("./mock-data");
  return stockLevels;
}

// ============================================================
// Parcelles (Regions → Zones → Sites)
// ============================================================

function mapRegionToParcelle(r: any, children: any[] = [], treatmentStats?: { count: number; lastDate: string | null }): any {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id ?? null,
    exploitationId: "exp-001",
    areaHectares: r.area_hectares ?? 0,
    cropType: r.crop_type || "Non défini",
    variete: "",
    cultureType: r.culture_type || "arboriculture",
    soilType: "Non défini",
    site: "Ferme Principale",
    zone: "Zone",
    secteur: "Secteur",
    irrigation: "aucune",
    center: r.center || [0, 0],
    boundary: r.boundary || [],
    color: r.color || "#10b981",
    children,
    lastTreatmentDate: treatmentStats?.lastDate ?? null,
    treatmentCount: treatmentStats?.count ?? 0,
  };
}

export async function fetchParcelles() {
  if (!SUPABASE_CONFIGURED) {
    const { parcelles } = await import("./mock-data");
    return parcelles;
  }

  try {
    const [regionsRes, treatmentsRes] = await Promise.all([
      supabase.from("regions").select("*").order("created_at", { ascending: true }),
      supabase.from("treatments").select("site_name, planned_date").order("planned_date", { ascending: false }),
    ]);
    if (regionsRes.error) throw regionsRes.error;

    const rows = regionsRes.data || [];
    const treatments = treatmentsRes.data || [];

    // Build treatment stats by site_name
    const treatmentMap = new Map<string, { count: number; lastDate: string | null }>();
    treatments.forEach((t: any) => {
      const key = (t.site_name || "").toLowerCase();
      const existing = treatmentMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        treatmentMap.set(key, { count: 1, lastDate: t.planned_date });
      }
    });

    const childrenByParent = new Map<string, any[]>();
    rows
      .filter((r: any) => r.parent_id)
      .forEach((r: any) => {
        const list = childrenByParent.get(r.parent_id) || [];
        const stats = treatmentMap.get((r.name || "").toLowerCase());
        list.push(mapRegionToParcelle(r, [], stats));
        childrenByParent.set(r.parent_id, list);
      });

    return rows
      .filter((r: any) => !r.parent_id)
      .map((r: any) => {
        const stats = treatmentMap.get((r.name || "").toLowerCase());
        return mapRegionToParcelle(r, childrenByParent.get(r.id) || [], stats);
      });
  } catch (err) {
    console.error("[fetchParcelles] Supabase error:", err);
    const { parcelles } = await import("./mock-data");
    return parcelles;
  }
}

export async function insertParcelle(data: {
  name: string;
  cropType: string;
  color: string;
  boundary: [number, number][];
  areaHectares: number;
  center: [number, number];
  parentId?: string | null;
}) {
  if (!SUPABASE_CONFIGURED) {
    const { parcelles } = await import("./mock-data");
    const newParcelle = {
      id: `p-${Date.now()}`,
      name: data.name,
      parentId: null,
      exploitationId: "exp-001",
      areaHectares: data.areaHectares,
      cropType: data.cropType,
      variete: "",
      cultureType: "arboriculture" as const,
      soilType: "Non défini",
      site: "Ferme Principale",
      zone: "Nouvelle Zone",
      secteur: "Nouveau Secteur",
      altitude: undefined,
      irrigation: "aucune" as const,
      observations: "",
      center: data.center,
      boundary: data.boundary,
      color: data.color,
      children: [],
      lastTreatmentDate: null,
      treatmentCount: 0,
    };
    parcelles.push(newParcelle);
    return newParcelle;
  }

  const { data: region, error } = await supabase
    .from("regions")
    .insert({
      name: data.name,
      boundary: data.boundary,
      color: data.color,
      area_hectares: data.areaHectares,
      crop_type: data.cropType,
      center: data.center,
      culture_type: "arboriculture",
      parent_id: data.parentId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[insertParcelle] Supabase error:", error);
    throw new Error(error.message || "Erreur lors de l'enregistrement");
  }
  return mapRegionToParcelle(region);
}

export async function updateParcelle(id: string, data: {
  name?: string;
  cropType?: string;
  color?: string;
  areaHectares?: number;
}) {
  if (!SUPABASE_CONFIGURED) return null;
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.cropType !== undefined) updates.crop_type = data.cropType;
  if (data.color !== undefined) updates.color = data.color;
  if (data.areaHectares !== undefined) updates.area_hectares = data.areaHectares;

  const { data: row, error } = await supabase
    .from("regions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRegionToParcelle(row);
}

export async function deleteParcelle(id: string) {
  if (!SUPABASE_CONFIGURED) return null;
  // Delete children first (sous-parcelles)
  await supabase.from("regions").delete().eq("parent_id", id);
  const { error } = await supabase.from("regions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

// ============================================================
// Treatments
// ============================================================

export async function fetchTreatments(status?: string) {
  if (!SUPABASE_CONFIGURED) {
    const { treatments } = await import("./mock-data");
    return status ? treatments.filter(t => t.status === status) : treatments;
  }

  try {
    let query = supabase
      .from("treatments")
      .select("*, treatment_products(*, products(trade_name, unit))")
      .order("planned_date", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTreatment);
  } catch {
    const { treatments } = await import("./mock-data");
    return status ? treatments.filter(t => t.status === status) : treatments;
  }
}

export async function insertTreatment(data: {
  parcelleName: string;
  type: string;
  plannedDate: string;
  operatorName?: string;
  areaTreatedHectares?: number;
  volumeBouillie?: number;
  volumeBouillieUnit?: string;
  notes?: string;
  status?: "planned" | "in_progress" | "completed" | "cancelled";
}) {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("Supabase non configuré");
  }

  const { data: row, error } = await supabase
    .from("treatments")
    .insert({
      site_name: data.parcelleName,
      type: data.type,
      planned_date: data.plannedDate,
      operator_name: data.operatorName || null,
      area_treated_hectares: data.areaTreatedHectares ?? null,
      volume_bouillie: data.volumeBouillie ?? null,
      volume_bouillie_unit: data.volumeBouillieUnit || null,
      notes: data.notes || null,
      status: data.status || "planned",
    })
    .select()
    .single();

  if (error) {
    console.error("[insertTreatment] Supabase error:", error);
    throw new Error(error.message || "Erreur lors de la planification");
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
  return mapTreatment(row);
}

// ============================================================
// Operators
// ============================================================

export async function fetchOperators() {
  const data = await fetchFromSupabase("operators", "*", {
    order: { column: "name" },
  });
  if (data) return data.map(mapOperator);
  const { operators } = await import("./mock-data");
  return operators;
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
    const [products, stockLevels, treatments, alertsRes, sites] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("stock_levels").select("status"),
      supabase.from("treatments").select("id, status"),
      supabase.from("alerts").select("id, acknowledged").eq("acknowledged", false),
      supabase.from("sites").select("id, area_hectares"),
    ]);

    const lowStock = (stockLevels.data || []).filter((s: { status: string }) =>
      s.status === "low" || s.status === "critical" || s.status === "negative"
    );

    const sitesData = sites.data || [];
    const totalAreaHectares = sitesData.reduce(
      (sum: number, s: { area_hectares: number | null }) => sum + (s.area_hectares ?? 0),
      0
    );

    return {
      totalProducts: products.count || 0,
      lowStockCount: lowStock.length,
      treatmentsThisMonth: (treatments.data || []).length,
      treatmentsTrend: 0,
      totalAreaHectares: Math.round(totalAreaHectares * 100) / 100,
      totalParcelles: sitesData.length,
      alertsCount: (alertsRes.data || []).length,
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
  productSchema,
  supplierSchema,
  stockLevelUpdateSchema,
  alertUpdateSchema,
} from "./validations";

export async function insertMovement(movement: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = movementSchema.parse(movement);
  const { data, error } = await supabase.from("movements").insert(validated).select().single();
  if (error) throw error;
  return data;
}

export async function updateMovement(id: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = movementSchema.partial().parse(updates);
  const { data, error } = await supabase
    .from("movements")
    .update(validated)
    .eq("id", id)
    .select("*, products(trade_name, category, active_substance, unit, stock_initial_2024)")
    .single();
  if (error) throw error;
  return data;
}

export async function insertProduct(product: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = productSchema.parse(product);
  const { data, error } = await supabase.from("products").insert(validated).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = productSchema.partial().parse(updates);
  const { data, error } = await supabase.from("products").update(validated).eq("id", id).select().single();
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
  const validated = supplierSchema.partial().parse(updates);
  const { data, error } = await supabase.from("suppliers").update(validated).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function insertSupplier(supplier: Record<string, unknown>) {
  if (!SUPABASE_CONFIGURED) return null;
  const validated = supplierSchema.parse(supplier);
  const { data, error } = await supabase.from("suppliers").insert(validated).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMovement(id: string) {
  if (!SUPABASE_CONFIGURED) return null;
  const { error } = await supabase.from("movements").delete().eq("id", id);
  if (error) throw error;
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