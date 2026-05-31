import { supabase } from "./supabase";
import type { ProductCategory, MovementType, CultureType, TreatmentStatus } from "./database.types";

// ============================================================
// PRODUCTS
// ============================================================

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("trade_name");
  if (error) throw error;
  return data;
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(product: Record<string, unknown>) {
  const { data, error } = await supabase.from("products").insert(product).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// SUPPLIERS
// ============================================================

export async function getSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getSupplierById(id: string) {
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createSupplier(supplier: Record<string, unknown>) {
  const { data, error } = await supabase.from("suppliers").insert(supplier).select().single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("suppliers").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// MOVEMENTS
// ============================================================

export async function getMovements(filters?: {
  category?: ProductCategory;
  movement_type?: MovementType;
  culture?: CultureType;
  product_id?: string;
  site_name?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  let query: any = supabase
    .from("movements")
    .select("*, products!inner(trade_name, category, active_substance, unit)")
    .order("date", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.movement_type) query = query.eq("movement_type", filters.movement_type);
  if (filters?.culture) query = query.eq("culture", filters.culture);
  if (filters?.product_id) query = query.eq("product_id", filters.product_id);
  if (filters?.site_name) query = query.eq("site_name", filters.site_name);
  if (filters?.date_from) query = query.gte("date", filters.date_from);
  if (filters?.date_to) query = query.lte("date", filters.date_to);

  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMovementCount(filters?: {
  category?: ProductCategory;
  movement_type?: MovementType;
}) {
  let query = supabase.from("movements").select("id", { count: "exact", head: true });
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.movement_type) query = query.eq("movement_type", filters.movement_type);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function createMovement(movement: Record<string, unknown>) {
  const { data, error } = await supabase.from("movements").insert(movement).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// STOCK LEVELS
// ============================================================

export async function getStockLevels() {
  const { data, error } = await supabase
    .from("stock_levels")
    .select("*, products!inner(trade_name, category, active_substance, unit, stock_initial_2024, formulation, famille_chimique)")
    .order("current_quantity", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getStockOverview() {
  const { data, error } = await supabase.rpc("get_stock_overview" as never);
  if (error) {
    // Fallback to direct query if RPC not available
    return getStockLevels();
  }
  return data;
}

// ============================================================
// PARCELLES (Regions → Zones → Sites)
// ============================================================

export async function getRegions() {
  const { data, error } = await supabase
    .from("regions")
    .select("*, zones(*, sites(*))")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getZones() {
  const { data, error } = await supabase
    .from("zones")
    .select("*, region:regions(name), sites(*)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getSites() {
  const { data, error } = await supabase
    .from("sites")
    .select("*, zone:zones(name, culture_type, region:regions(name))")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createSite(site: Record<string, unknown>) {
  const { data, error } = await supabase.from("sites").insert(site).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// OPERATORS
// ============================================================

export async function getOperators() {
  const { data, error } = await supabase
    .from("operators")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createOperator(op: Record<string, unknown>) {
  const { data, error } = await supabase.from("operators").insert(op).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// TREATMENTS
// ============================================================

export async function getTreatments(filters?: { status?: TreatmentStatus }) {
  let query = supabase
    .from("treatments")
    .select("*, treatment_products(*, products(trade_name, unit))")
    .order("planned_date", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTreatment(treatment: Record<string, unknown>) {
  const { data, error } = await supabase.from("treatments").insert(treatment).select().single();
  if (error) throw error;
  return data;
}

export async function updateTreatment(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("treatments").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// ALERTS
// ============================================================

export async function getAlerts(acknowledged?: boolean) {
  let query = supabase
    .from("alerts")
    .select("*")
    .order("timestamp", { ascending: false });

  if (acknowledged !== undefined) query = query.eq("acknowledged", acknowledged);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function acknowledgeAlert(id: string) {
  const { error } = await supabase.from("alerts").update({ acknowledged: true }).eq("id", id);
  if (error) throw error;
}

export async function acknowledgeAllAlerts() {
  const { error } = await supabase.from("alerts").update({ acknowledged: true }).eq("acknowledged", false);
  if (error) throw error;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats() {
  const [products, stockLevels, movements, treatments, alerts] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("stock_levels").select("status"),
    supabase.from("movements").select("id, movement_type, date").gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    supabase.from("treatments").select("id, status"),
    supabase.from("alerts").select("id, acknowledged").eq("acknowledged", false),
  ]);

  const lowStock = (stockLevels.data || []).filter((s: { status: string }) => s.status === "low" || s.status === "critical" || s.status === "negative");
  const monthMovements = movements.data || [];
  const entries = monthMovements.filter((m: { movement_type: string }) => m.movement_type === "entree").length;
  const exits = monthMovements.filter((m: { movement_type: string }) => m.movement_type === "sortie").length;
  const transfers = monthMovements.filter((m: { movement_type: string }) => m.movement_type === "transfert").length;

  return {
    totalProducts: products.count || 0,
    lowStockCount: lowStock.length,
    negativeStockCount: (stockLevels.data || []).filter((s: { status: string }) => s.status === "negative").length,
    entriesThisMonth: entries,
    exitsThisMonth: exits,
    transfersThisMonth: transfers,
    totalMovementsThisMonth: monthMovements.length,
    activeTreatments: (treatments.data || []).filter((t: { status: string }) => t.status === "in_progress").length,
    plannedTreatments: (treatments.data || []).filter((t: { status: string }) => t.status === "planned").length,
    unacknowledgedAlerts: (alerts.data || []).length,
  };
}

// ============================================================
// CONSUMPTION ANALYSIS
// ============================================================

export async function getConsumptionBySite(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from("movements")
    .select("site_name, culture, quantity, products!inner(trade_name, category)")
    .eq("movement_type", "sortie");

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getConsumptionByProduct(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from("movements")
    .select("product_id, quantity, products!inner(trade_name, category, unit)")
    .eq("movement_type", "sortie");

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================================
// RESTE AUTO (Current stock = initial + entries + returns - exits - transfers)
// ============================================================

export async function getResteAuto() {
  const { data, error } = await supabase
    .from("stock_levels")
    .select("*, products!inner(trade_name, category, active_substance, unit, stock_initial_2024)")
    .order("current_quantity", { ascending: true });
  if (error) throw error;
  return data;
}
// ============================================================
// SCD2 AUDIT & HISTORY
// ============================================================

export async function getEntityHistory(tableName: string, businessId: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("identifiant_metier", businessId)
    .order("date_debut_validite", { ascending: false });
  if (error) throw error;
  return data;
}
