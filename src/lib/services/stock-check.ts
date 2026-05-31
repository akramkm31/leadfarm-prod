import { createServerClient } from "@/lib/supabase/server";

export interface StockCheckResult {
  valid: boolean;
  manquant: Array<{ produit: string; requis: number; disponible: number; unite: string }>;
}

export async function checkStockForPlanning(
  tenantId: number,
  datePrevue: string,
  produitsRequis: Array<{ id_produit: number; quantite: number; unite: string }>
): Promise<StockCheckResult> {
  const supabase = createServerClient() as any;
  const manquant: StockCheckResult["manquant"] = [];

  for (const req of produitsRequis) {
    // Sum current stock - all planned future consumptions before datePrevue
    const { data: stockData } = await supabase
      .rpc("get_projected_stock", {
        p_tenant_id:   tenantId,
        p_produit_id:  req.id_produit,
        p_date_limite: datePrevue,
      });

    const disponible = (stockData as number) ?? 0;
    if (disponible < req.quantite) {
      const { data: produit } = await supabase
        .from("PRODUIT_PHYTOSANITAIRE")
        .select("nom_produit")
        .eq("identifiant_produit", req.id_produit)
        .single();

      manquant.push({
        produit:     produit?.nom_produit ?? `Produit #${req.id_produit}`,
        requis:      req.quantite,
        disponible,
        unite:       req.unite,
      });
    }
  }

  return { valid: manquant.length === 0, manquant };
}
