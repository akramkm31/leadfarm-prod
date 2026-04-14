export type TreatmentStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType = "low_stock" | "critical_stock" | "treatment_overdue" | "parcel_untreated" | "stock_expiry" | "device_offline";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export const VALID_TRANSITIONS: Record<TreatmentStatus, TreatmentStatus[]> = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isValidTransition(from: TreatmentStatus, to: TreatmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
