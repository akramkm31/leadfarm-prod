"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, AlertTriangle, ArrowUpRight, Loader2, PackageSearch, ChevronDown } from "lucide-react";
import { useStockLevels, useMovements } from "@/hooks/useData";
import type { StockLevel, StockEntry } from "@/lib/mock-data";
import { groupMovementsByProduct } from "@/lib/parcelle-stock";
import ParcelleProductCard from "@/components/dashboard/ParcelleProductCard";
import { cn } from "@/lib/utils";

type Filter = "all" | "alerts";

type Props = {
  compact?: boolean;
  embedded?: boolean;
  className?: string;
};

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  low: "Bas",
  critical: "Critique",
  overstock: "Surstock",
};

export default function DashboardStockOverview({ compact = false, embedded = false, className }: Props) {
  const { data: stockRaw, loading } = useStockLevels();
  const stockLevels = (stockRaw ?? []) as StockLevel[];
  const { data: movementsRaw } = useMovements();
  const movements = (movementsRaw ?? []) as StockEntry[];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const movementsByProduct = useMemo(() => groupMovementsByProduct(movements), [movements]);

  const alertCount = stockLevels.filter((s) => s.status !== "ok").length;

  const visible = useMemo(() => {
    const list = filter === "alerts" ? stockLevels.filter((s) => s.status !== "ok") : stockLevels;
    return [...list].sort((a, b) => {
      const rank = { critical: 0, low: 1, overstock: 2, ok: 3 } as Record<string, number>;
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    });
  }, [stockLevels, filter]);

  if (compact) {
    return (
      <aside
        className={cn("dash-stock-rail", className)}
        aria-label="Inventaire compact"
      >
        <div className="dash-stock-rail-head">
          <div className="dash-stock-rail-title">
            <Boxes className="w-3.5 h-3.5 text-[var(--color-valley-green)]" aria-hidden />
            <span>Inventaire</span>
          </div>
          <Link href="/stock" className="dash-stock-rail-link">
            Stock
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="dash-stock-rail-kpis">
          <span className="dash-stock-rail-kpi">
            <strong>{stockLevels.length}</strong> produits
          </span>
          <span className={cn("dash-stock-rail-kpi", alertCount > 0 && "is-alert")}>
            <strong>{alertCount}</strong> alertes
          </span>
        </div>

        <div className="dash-stock-rail-filters">
          <Chip compact active={filter === "all"} onClick={() => setFilter("all")}>
            Tous
          </Chip>
          <Chip compact active={filter === "alerts"} onClick={() => setFilter("alerts")}>
            Alertes
          </Chip>
        </div>

        <div className="dash-stock-rail-list">
          {loading ? (
            <div className="dash-stock-rail-empty">
              <Loader2 className="w-4 h-4 animate-spin opacity-40" />
            </div>
          ) : visible.length === 0 ? (
            <div className="dash-stock-rail-empty">
              <PackageSearch className="w-5 h-5 opacity-25" />
              <p>Aucun produit</p>
            </div>
          ) : (
            visible.map((stock) => {
              const open = expandedId === stock.productId;
              const status = stock.status ?? "ok";
              return (
                <div key={stock.productId} className="dash-stock-rail-item">
                  <button
                    type="button"
                    className="dash-stock-rail-row"
                    onClick={() =>
                      setExpandedId((cur) => (cur === stock.productId ? null : stock.productId))
                    }
                    aria-expanded={open}
                  >
                    <span className={cn("dash-stock-rail-badge", `is-${status}`)}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                    <span className="dash-stock-rail-name">{stock.productName}</span>
                    <span className="dash-stock-rail-qty">
                      {stock.currentQuantity?.toFixed(1) ?? "0"} {stock.unit}
                    </span>
                    <ChevronDown className={cn("dash-stock-rail-chevron", open && "is-open")} />
                  </button>
                  {open && (
                    <div className="dash-stock-rail-detail">
                      <ParcelleProductCard
                        product={{
                          productId: stock.productId,
                          name: stock.productName,
                          unit: stock.unit,
                          stock,
                        }}
                        movements={movementsByProduct.get(stock.productId) ?? []}
                        expanded
                        onToggle={() => setExpandedId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    );
  }

  return (
    <section className={cn("max-w-[1200px] w-full mx-auto px-1", embedded ? "" : "mt-5 mb-6", className)}>
      {!embedded && (
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-[var(--color-valley-green)]" />
            <h2 className="text-sm font-bold text-[var(--color-adaline-ink)]">Inventaire — vue d&apos;ensemble</h2>
          </div>
          <Link
            href="/stock"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-valley-green)] hover:opacity-80 transition-opacity"
          >
            Gérer le stock
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi icon={<Boxes className="w-4 h-4" />} label="Produits" value={String(stockLevels.length)} tone="ink" />
        <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="En alerte" value={String(alertCount)} tone="amber" />
      </div>

      <div className="flex items-center gap-2 mb-3 px-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>Tous ({stockLevels.length})</Chip>
        <Chip active={filter === "alerts"} onClick={() => setFilter("alerts")}>Alertes ({alertCount})</Chip>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--color-adaline-ink)]/40">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <PackageSearch className="w-8 h-8 text-[var(--color-adaline-ink)]/20" />
          <p className="text-xs text-[var(--color-adaline-ink)]/50">
            Aucun produit {filter === "alerts" ? "en alerte" : "en stock"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((stock) => (
            <ParcelleProductCard
              key={stock.productId}
              product={{ productId: stock.productId, name: stock.productName, unit: stock.unit, stock }}
              movements={movementsByProduct.get(stock.productId) ?? []}
              expanded={expandedId === stock.productId}
              onToggle={() => setExpandedId((cur) => (cur === stock.productId ? null : stock.productId))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "ink" | "amber" | "green" }) {
  const toneCls =
    tone === "amber" ? "text-amber-600" : tone === "green" ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]";
  return (
    <div className="rounded-xl border border-[var(--color-stone-moss)] bg-white/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/45">
        <span className={toneCls}>{icon}</span>
        {label}
      </div>
      <p className={`text-lg font-bold mt-1 ${toneCls}`}>{value}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full font-semibold border transition-colors",
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]",
        active
          ? "bg-[var(--color-valley-green)] text-white border-transparent"
          : "bg-white/60 text-[var(--color-adaline-ink)]/60 border-[var(--color-stone-moss)] hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}
