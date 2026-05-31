import { supabase as rawSupabase, SUPABASE_CONFIGURED } from "@/lib/supabase/client";
const supabase = rawSupabase as any;
import { getTreatmentById, updateTreatment } from "@/lib/repositories/treatment.repository";
import { createMovement } from "@/lib/repositories/stock.repository";
import type { TreatmentProduct } from "@/lib/database.types";

/**
 * Service orchestrating complex business workflows across domains.
 */
export const TreatmentWorkflowService = {
  /**
   * Completes a treatment and automatically deducts stock for all used products.
   */
  async completeTreatment(treatmentId: string) {
    if (!SUPABASE_CONFIGURED) {
      throw new Error("Supabase non configuré");
    }

    const treatment = await getTreatmentById(treatmentId);
    if (!treatment) throw new Error("Traitement introuvable");
    if (treatment.status === "completed") {
      return treatment; // Already completed
    }

    // 1. Mark as completed and set executed date
    const updated = await updateTreatment(treatmentId, {
      status: "completed",
      dateReelle: new Date().toISOString(),
    });

    // 2. Deduct stock via movements
    for (const prod of updated.products) {
      if (prod.productId && prod.quantityUsed) {
        await createMovement({
          date: new Date().toISOString(),
          product_id: prod.productId,
          category: "autre", // Can be fetched from product if needed, defaulting for now
          movement_type: "sortie",
          quantity: prod.quantityUsed,
          culture: updated.culture as any || null,
          site_id: updated.siteId || null,
          site_name: updated.parcelleName || null,
          details_site: null,
          supplier_id: null,
          distributor_id: null,
          observations: `Consommation automatique pour traitement ${updated.id}`,
          n_units: null,
          p_units: null,
          k_units: null,
          ca_units: null,
          zinc_units: null,
        });
        
        // In a real V2 Postgres DB, a trigger on movements should update stock_levels.
        // We ensure the movement is recorded as the source of truth.
      }
    }

    return updated;
  },

  /**
   * Registers an AI vision detection as an actionable event.
   */
  async createDiseaseEventFromVision(prediction: { label: string; score: number }, parcelleId?: string) {
    if (!SUPABASE_CONFIGURED) return;
    
    const diseaseName = prediction.label.split("__").pop()?.replace(/_/g, " ") || prediction.label;
    
    // In V2, this creates an evenement_maladie and triggers moteur-decision.
    // For now, we generate a high-priority Alert that acts as a decision prompt.
    const { error } = await supabase.from("alerts").insert({
      type: "parcel_untreated",
      severity: "warning",
      message: `Détection IA: Probabilité de ${diseaseName} (${Math.round(prediction.score * 100)}%). Action requise.`,
      related_id: parcelleId || null,
      acknowledged: false,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("[TreatmentWorkflowService] Failed to create disease event:", error);
      throw new Error("Impossible d'enregistrer l'évènement.");
    }
  }
};
