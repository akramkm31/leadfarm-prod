import { supabase as rawSupabase, SUPABASE_CONFIGURED } from "@/lib/supabase/client";
const supabase = rawSupabase as any;
import type { Alert, AlertType, AlertSeverity } from "@/lib/database.types";

/**
 * Service for managing alerts and generating actionable recommendations.
 */
export const AlertService = {
  /**
   * Creates a new system alert.
   */
  async createAlert(input: {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    relatedId?: string | null;
  }): Promise<Alert | null> {
    if (!SUPABASE_CONFIGURED) return null;

    const { data, error } = await supabase
      .from("alerts")
      .insert({
        type: input.type,
        severity: input.severity,
        message: input.message,
        related_id: input.relatedId ?? null,
        acknowledged: false,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[AlertService] Error creating alert:", error.message);
      return null;
    }

    return {
      id: data.id,
      type: data.type,
      severity: data.severity,
      message: data.message,
      relatedId: data.related_id,
      acknowledged: data.acknowledged,
      timestamp: data.timestamp,
    };
  },

  /**
   * Derives a deep-link action URL based on the alert type and related context.
   */
  getActionForAlert(alert: Alert): { label: string; url: string } | null {
    switch (alert.type) {
      case "low_stock":
      case "critical_stock":
        return { label: "Commander stock", url: `/stock?productId=${alert.relatedId}` };
      case "parcel_untreated":
        return { label: "Planifier traitement", url: `/operations?action=new&parcelleId=${alert.relatedId}` };
      case "dar_violation":
        return { label: "Bloquer récolte", url: `/recoltes?parcelleId=${alert.relatedId}` };
      default:
        return null;
    }
  }
};
