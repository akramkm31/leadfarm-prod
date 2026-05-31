/**
 * repositories/stock.repository.ts
 */
import { supabase as rawSupabase, SUPABASE_CONFIGURED } from "@/lib/supabase/client";
const supabase = rawSupabase as any;
import type {
  StockLevel,
  StockLevelWithProduct,
  Movement,
  MovementWithProduct,
  MovementType,
  ProductCategory,
} from "@/lib/database.types";

// ── Mappers ────────────────────────────────────────────────────────────────

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

export function toStockLevel(row: StockLevelWithProduct): StockLevel {
  const p = row.products;
  return {
    productId: row.product_id,
    productName: p?.trade_name ?? "Inconnu",
    category: p?.category ?? "autre",
    currentQuantity: row.current_quantity,
    unit: p?.unit ?? "L",
    minThreshold: row.min_threshold,
    maxCapacity: row.max_capacity,
    lastEntryDate: row.updated_at,
    lastExitDate: null,
    totalValueDZD: 0,
    avgUnitPriceDZD: 0,
    status: row.status,
    expiryDate: "",
    stockInitial: p?.stock_initial_2024 ?? 0,
  };
}

export function toMovement(row: MovementWithProduct): Movement {
  const p = row.products;
  const rawType = row.movement_type ?? "";
  const normalizedType = MOVEMENT_TYPE_MAP[rawType] ?? rawType;
  return {
    id: row.id,
    date: row.date,
    productId: row.product_id,
    productName: p?.trade_name ?? "",
    category: row.category,
    movementType: normalizedType,
    type: normalizedType,
    movementCategory: row.category ?? "autre",
    quantity: row.quantity,
    culture: row.culture,
    siteId: row.site_id,
    siteName: row.site_name,
    detailsSite: row.details_site,
    supplierId: row.supplier_id,
    distributorId: row.distributor_id,
    observations: row.observations,
    unit: p?.unit ?? "L",
    stockInitial: p?.stock_initial_2024 ?? null,
    nUnits: row.n_units,
    pUnits: row.p_units,
    kUnits: row.k_units,
    caUnits: row.ca_units,
    zincUnits: row.zinc_units,
  };
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getStockLevels(): Promise<StockLevel[]> {
  if (!SUPABASE_CONFIGURED) return [];

  const { data, error } = await supabase
    .from("stock_levels")
    .select(
      "*, products(trade_name, category, active_substance, unit, stock_initial_2024, formulation, teneur_ma, teneur_ma_unit, famille_chimique)"
    )
    .order("current_quantity", { ascending: true });

  if (error) throw new Error(`[StockRepository.getStockLevels] ${error.message}`);
  return (data as StockLevelWithProduct[]).map(toStockLevel);
}

export async function getMovements(filters: {
  category?: ProductCategory;
  movement_type?: MovementType;
  date_from?: string;
  date_to?: string;
  limit?: number;
} = {}): Promise<Movement[]> {
  if (!SUPABASE_CONFIGURED) return [];

  let query = supabase
    .from("movements")
    .select("*, products(trade_name, category, active_substance, unit, stock_initial_2024)")
    .order("date", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.movement_type) query = query.eq("movement_type", filters.movement_type);
  if (filters.date_from) query = query.gte("date", filters.date_from);
  if (filters.date_to) query = query.lte("date", filters.date_to);

  const { data, error } = await query;
  if (error) throw new Error(`[StockRepository.getMovements] ${error.message}`);
  return (data as MovementWithProduct[]).map(toMovement);
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function createMovement(
  input: Omit<MovementWithProduct, "id" | "created_at" | "products">
): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error("[StockRepository] Supabase not configured.");

  const { error } = await supabase.from("movements").insert(input);
  if (error) throw new Error(`[StockRepository.createMovement] ${error.message}`);
}
