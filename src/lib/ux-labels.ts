/** Libellés UX partagés (FR) — éviter les clés techniques visibles par l'utilisateur */

export const ALERT_TYPE_LABELS: Record<string, string> = {
  critical: "Critique",
  warning: "Avertissement",
  disease: "Maladie",
  stock: "Stock",
  weather: "Météo",
  iot: "Capteur IoT",
  info: "Information",
};

export function alertTypeLabel(type: string): string {
  return ALERT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export const TREATMENT_STATUS_SHORT: Record<string, string> = {
  planned: "PLANIFIÉ",
  in_progress: "EN COURS",
  completed: "TERMINÉ",
  cancelled: "ANNULÉ",
  pending_approval: "ATTENTE",
  approved: "APPROUVÉ",
  evaluated: "ÉVALUÉ",
};

export const FARM_DISPLAY_NAME =
  process.env.NEXT_PUBLIC_FARM_NAME ?? "Domaine Khelifa";
