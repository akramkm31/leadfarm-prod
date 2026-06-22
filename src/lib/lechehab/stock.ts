import { getSupabaseBrowser } from "@/lib/supabase-browser";

export interface LfStockLevel {
  product_id: string;
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  active_ingredient: string | null;
  reste: number;
  is_negative: boolean;
}

export interface LfMovement {
  id: string;
  date: string;
  flow: "stock_initial" | "transfert" | "entree" | "retour" | "sortie";
  quantity: number;
  unit: string | null;
  culture: string | null;
  site_name: string | null;
  details_site: string | null;
  lf_products?: { name: string; category: string } | null;
}

/** Stock réel — quantités comptées (RESTE EN STOCK 11.06.2026), avec repli
 *  sur le RESTE calculé depuis le ledger des mouvements quand l'inventaire
 *  ne couvre pas le produit. `is_negative` = anomalie ledger (à réconcilier). */
export async function fetchLfStock(): Promise<LfStockLevel[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("lf_stock_real")
    .select("product_id, name, category, subcategory, unit, active_ingredient, reste, is_negative")
    .order("reste", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LfStockLevel[];
}

/** Derniers mouvements du ledger (avec le produit lié). */
export async function fetchLfMovements(limit = 80): Promise<LfMovement[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("lf_movements")
    .select("id, date, flow, quantity, unit, culture, site_name, details_site, lf_products(name, category)")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as LfMovement[];
}
