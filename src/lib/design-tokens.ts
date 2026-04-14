/**
 * Shared design tokens — single source of truth for status colors,
 * badge styles, and category mappings used across all pages.
 */

export const STATUS_COLORS = {
  ok: { bg: "bg-green-400/10", text: "text-green-400", border: "border-green-400/25", dot: "bg-green-400" },
  low: { bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/25", dot: "bg-amber-400" },
  critical: { bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/25", dot: "bg-red-400" },
  negative: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/25", dot: "bg-red-500" },
  over: { bg: "bg-blue-400/10", text: "text-blue-400", border: "border-blue-400/25", dot: "bg-blue-400" },
} as const;

export const STATUS_LABELS: Record<string, string> = {
  ok: "Normal",
  low: "Bas",
  critical: "Critique",
  negative: "Négatif",
  over: "Surplus",
};

export const SEVERITY_COLORS = {
  critical: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/25", dot: "bg-red-500" },
  high: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/25", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/25", dot: "bg-amber-400" },
  low: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/25", dot: "bg-blue-400" },
  info: { bg: "bg-white/5", text: "text-white/50", border: "border-white/10", dot: "bg-white/40" },
} as const;

export const MOVEMENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  entry: { bg: "bg-green-400/10", text: "text-green-400" },
  exit: { bg: "bg-red-400/10", text: "text-red-400" },
  treatment_consumption: { bg: "bg-purple-400/10", text: "text-purple-400" },
  adjustment: { bg: "bg-amber-400/10", text: "text-amber-400" },
  transfer: { bg: "bg-orange-400/10", text: "text-orange-400" },
  return: { bg: "bg-blue-400/10", text: "text-blue-400" },
  stock_initial: { bg: "bg-white/5", text: "text-white/50" },
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  entry: "Entrée",
  exit: "Sortie",
  treatment_consumption: "Consommation",
  adjustment: "Ajustement",
  transfer: "Transfert",
  return: "Retour",
  stock_initial: "Stock Initial",
};

export function getStatusStyle(status: string) {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.ok;
}

export function getSeverityStyle(severity: string) {
  return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.info;
}
