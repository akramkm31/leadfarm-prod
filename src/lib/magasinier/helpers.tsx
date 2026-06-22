"use client";

import { categoryColors, categoryLabels, type ProductCategory } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { MagBadge, MagGauge } from "@/components/magasinier/ui";

export const MAG_STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  low: "Bas",
  critical: "Critique",
  overstock: "Surstock",
};

export const MAG_TREAT_STATUS: Record<string, { label: string; tone: "blue" | "green" | "amber" | "gray" | "red" }> = {
  planned: { label: "Planifié", tone: "blue" },
  in_progress: { label: "En cours", tone: "amber" },
  completed: { label: "Terminé", tone: "green" },
  cancelled: { label: "Annulé", tone: "red" },
  draft: { label: "Brouillon", tone: "gray" },
  pending_approval: { label: "En attente", tone: "amber" },
  approved: { label: "Approuvé", tone: "blue" },
};

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function formatMagDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatMagQty(n: number): string {
  const abs = Math.abs(n);
  return abs >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

export function formatDZD(n: number): string {
  return `${n.toLocaleString("fr-DZ")} DZD`;
}

export function statusTone(status?: string): "green" | "amber" | "red" | "blue" {
  if (status === "critical") return "red";
  if (status === "low") return "amber";
  if (status === "overstock") return "blue";
  return "green";
}

export function statusBadge(status?: string) {
  const tone = statusTone(status);
  return <MagBadge tone={tone}>{MAG_STATUS_LABEL[status ?? "ok"] ?? status}</MagBadge>;
}

export function expiryBadge(dateStr?: string | null) {
  if (!dateStr) return <span className="mag-muted">—</span>;
  const d = daysUntil(dateStr);
  if (d < 0) return <MagBadge tone="red">PÉRIMÉ</MagBadge>;
  if (d <= 7) return <MagBadge tone="red">{`J-${d}`}</MagBadge>;
  if (d <= 30) return <MagBadge tone="amber">{`J-${d}`}</MagBadge>;
  return <span className="mag-mono mag-muted" style={{ fontSize: 11 }}>{formatMagDate(dateStr)}</span>;
}

export function gaugeBar(stock: { currentQuantity?: number; minThreshold?: number; maxCapacity?: number; status?: string }) {
  const qty = stock.currentQuantity ?? 0;
  const max = stock.maxCapacity || qty || 1;
  const pct = Math.round((qty / max) * 100);
  const color =
    stock.status === "critical" ? "#dc2626" : stock.status === "low" ? "#d97706" : stock.status === "overstock" ? "#2563eb" : "#16a34a";
  return (
    <div>
      <MagGauge pct={pct} color={color} />
      <div className="mag-row-between mag-muted" style={{ fontSize: 10.5, marginTop: 4 }}>
        <span>min {stock.minThreshold ?? 0}</span>
        <span>max {stock.maxCapacity ?? qty} </span>
      </div>
    </div>
  );
}

export function prodIcon(cat?: string, size = 38) {
  const label = categoryLabels[cat as ProductCategory] || cat || "?";
  const color = categoryColors[cat as ProductCategory] || "#64748b";
  return (
    <div
      className="mag-prod-icon"
      style={{ width: size, height: size, background: `${color}18`, color }}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function distRow(label: string, n: number, total: number, color: string) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 9 }}>
      <div className="mag-row-between" style={{ fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--mag-text-secondary)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{n}</span>
      </div>
      <MagGauge pct={pct} color={color} />
    </div>
  );
}
