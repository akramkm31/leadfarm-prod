/**
 * repositories/product.repository.ts
 */
import { supabase, SUPABASE_CONFIGURED } from "@/lib/supabase/client";
import type { Product, ProductRow, ProductCategory } from "@/lib/database.types";

// ── Mapper ─────────────────────────────────────────────────────────────────

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    tradeName: row.trade_name,
    category: row.category,
    activeSubstance: row.active_substance ?? "",
    teneurMA: row.teneur_ma ?? "",
    teneurMAUnit: row.teneur_ma_unit ?? "",
    formulation: row.formulation ?? "",
    familleChimique: row.famille_chimique ?? "",
    dose: row.dose ?? "",
    cible: row.cible
      ? Array.isArray(row.cible)
        ? (row.cible as string[])
        : [row.cible as string]
      : [],
    doseUnit: row.dose_unit ?? "L",
    dar: row.dar,
    unit: row.unit,
    priceDzd: row.price_dzd ?? 0,
    stockInitial2024: row.stock_initial_2024,
    expiryDate: row.expiry_date ?? "",
    notes: row.notes ?? "",
  };
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getProducts(filters: {
  category?: ProductCategory;
} = {}): Promise<Product[]> {
  if (!SUPABASE_CONFIGURED) return [];

  let query = (supabase as any)
    .from("products")
    .select("*")
    .order("trade_name");

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`[ProductRepository.getProducts] ${error.message}`);
  return (data as ProductRow[]).map(toProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const { data, error } = await (supabase as any)
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`[ProductRepository.getProductById] ${error.message}`);
  }
  return toProduct(data as ProductRow);
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function createProduct(
  input: Omit<ProductRow, "id" | "created_at">
): Promise<Product> {
  if (!SUPABASE_CONFIGURED) throw new Error("[ProductRepository] Supabase not configured.");

  const { data, error } = await (supabase as any)
    .from("products")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`[ProductRepository.createProduct] ${error.message}`);
  return toProduct(data as ProductRow);
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<ProductRow, "id" | "created_at">>
): Promise<Product> {
  if (!SUPABASE_CONFIGURED) throw new Error("[ProductRepository] Supabase not configured.");

  const { data, error } = await (supabase as any)
    .from("products")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`[ProductRepository.updateProduct] ${error.message}`);
  return toProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) throw new Error("[ProductRepository] Supabase not configured.");

  const { error } = await (supabase as any).from("products").delete().eq("id", id);
  if (error) throw new Error(`[ProductRepository.deleteProduct] ${error.message}`);
}
