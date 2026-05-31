/**
 * Shared design tokens — single source of truth for status colors,
 * badge styles, and category mappings used across all pages.
 */

export const STATUS_COLORS = {
  ok: { bg: "bg-green-400/10", text: "text-green-400", border: "border-green-400/25", dot: "bg-green-400" },
  low: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]", border: "border-emerald-400/25", dot: "bg-emerald-400" },
  critical: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]", border: "border-emerald-400/25", dot: "bg-emerald-400" },
  negative: { bg: "bg-[var(--color-valley-green)]/10", text: "text-[var(--color-valley-green)]", border: "border-[var(--color-valley-green)]/25", dot: "bg-[var(--color-valley-green)]" },
  over: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]", border: "border-emerald-400/25", dot: "bg-emerald-400" },
} as const;

export const STATUS_LABELS: Record<string, string> = {
  ok: "Normal",
  low: "Bas",
  critical: "Critique",
  negative: "Négatif",
  over: "Surplus",
};

export const SEVERITY_COLORS = {
  critical: { bg: "bg-[var(--color-valley-green)]/15", text: "text-[var(--color-valley-green)]", border: "border-[var(--color-valley-green)]/25", dot: "bg-[var(--color-valley-green)]" },
  high: { bg: "bg-[var(--color-valley-green)]/15", text: "text-[var(--color-valley-green)]", border: "border-[var(--color-valley-green)]/25", dot: "bg-[var(--color-valley-green)]" },
  medium: { bg: "bg-[var(--color-valley-green)]/15", text: "text-[var(--color-valley-green)]", border: "border-[var(--color-valley-green)]/25", dot: "bg-emerald-400" },
  low: { bg: "bg-[var(--color-valley-green)]/15", text: "text-[var(--color-valley-green)]", border: "border-[var(--color-valley-green)]/25", dot: "bg-emerald-400" },
  info: { bg: "bg-[var(--color-canvas-ice)]", text: "text-[var(--color-adaline-ink)]/50", border: "border-[var(--color-stone-moss)]", dot: "bg-white/40" },
} as const;

export const MOVEMENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  entry: { bg: "bg-green-400/10", text: "text-green-400" },
  exit: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]" },
  treatment_consumption: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]" },
  adjustment: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]" },
  transfer: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]" },
  return: { bg: "bg-emerald-400/10", text: "text-[var(--color-valley-green)]" },
  stock_initial: { bg: "bg-[var(--color-canvas-ice)]", text: "text-[var(--color-adaline-ink)]/50" },
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
