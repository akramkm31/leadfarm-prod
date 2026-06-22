import { supabase } from "@/lib/supabase";
import { SUPABASE_CONFIGURED } from "@/lib/data-provider-config";
import { resolveLfProductId } from "@/lib/treatments/plan-treatment";

export type TreatmentProductRow = {
  product_id: string;
  quantity_used?: number | null;
  unit?: string | null;
  nom_commercial?: string | null;
};

/** Record stock sorties in lf_movements when a treatment is completed. */
export async function deductStockForTreatment(
  treatmentId: string,
  products: TreatmentProductRow[],
  options?: { siteName?: string; notes?: string }
): Promise<void> {
  if (!SUPABASE_CONFIGURED || !products.length) return;

  const today = new Date().toISOString().slice(0, 10);
  const rows: {
    date: string;
    product_id: string;
    flow: "sortie";
    quantity: number;
    unit: "kg" | "l";
    site_name: string | null;
    notes: string;
  }[] = [];

  for (const p of products) {
    const qty = Math.abs(Number(p.quantity_used) || 0);
    if (qty <= 0) continue;

    const lfProductId = await resolveLfProductId(
      supabase,
      p.product_id || null,
      p.nom_commercial
    );
    if (!lfProductId) {
      console.warn(
        "[deductStockForTreatment] produit ignoré (introuvable dans lf_products):",
        p.product_id || p.nom_commercial
      );
      continue;
    }

    rows.push({
      date: today,
      product_id: lfProductId,
      flow: "sortie",
      quantity: qty,
      unit: p.unit?.toLowerCase() === "kg" ? "kg" : "l",
      site_name: options?.siteName ?? null,
      notes: options?.notes ?? `Traitement ${treatmentId}`,
    });
  }

  if (!rows.length) return;

  const { error } = await supabase.from("lf_movements").insert(rows);
  if (error) {
    throw new Error(`[deductStockForTreatment] ${error.message}`);
  }
}
