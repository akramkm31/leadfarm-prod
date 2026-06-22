import { getSupabaseBrowser } from "@/lib/supabase-browser";

export interface LfNeed {
  id: string;
  campaign_year: number | null;
  category: string;
  active_ingredient_text: string | null;
  product_label: string | null;
  unit: string;
  quantity_needed: number;
}

export interface LfNeedWithStock extends LfNeed {
  reste: number | null;
}

/** Besoins d'approvisionnement réels (RESTE DES BESOINS 2026 SBA). */
export async function fetchLfNeeds(): Promise<LfNeed[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("lf_needs")
    .select("id, campaign_year, category, active_ingredient_text, product_label, unit, quantity_needed")
    .order("category", { ascending: true })
    .order("quantity_needed", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LfNeed[];
}
