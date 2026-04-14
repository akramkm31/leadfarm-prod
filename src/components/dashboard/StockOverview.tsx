"use client";

import { useState } from "react";
import { useStockLevels } from "@/hooks/useData";
import { categoryColors, type StockLevel } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Package, AlertTriangle, ChevronDown, ArrowDownRight, ArrowUpRight } from "lucide-react";

type ViewMode = "critical" | "all";

export default function StockOverview() {
  const { data: stockLevelsRaw } = useStockLevels();
  const stockLevels = (stockLevelsRaw || []) as StockLevel[];
  const [view, setView] = useState<ViewMode>("critical");

  const critical = stockLevels.filter((s) => s.currentQuantity < 0 || s.status === "critical" || s.status === "low");
  const positive = stockLevels.filter((s) => s.currentQuantity > 0 && s.status === "ok");

  const displayed = view === "critical"
    ? critical.sort((a, b) => a.currentQuantity - b.currentQuantity).slice(0, 10)
    : positive.sort((a, b) => b.currentQuantity - a.currentQuantity).slice(0, 10);

  const formatQty = (qty: number, unit: string) => {
    const abs = Math.abs(qty);
    const formatted = abs >= 10000 ? `${(abs / 1000).toFixed(1)}K` : abs.toFixed(0);
    return `${qty < 0 ? "-" : ""}${formatted}${unit}`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/85">Aperçu du Stock</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {stockLevels.length} produits · {critical.length} alertes
          </p>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-black/30 rounded-lg border border-white/10">
          <button
            onClick={() => setView("critical")}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
              view === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-white/40 hover:text-white/60"
            )}
          >
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Alertes
          </button>
          <button
            onClick={() => setView("all")}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
              view === "all" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "text-white/40 hover:text-white/60"
            )}
          >
            <Package className="w-3 h-3 inline mr-1" />
            Top Stock
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {displayed.map((stock) => {
          const isNegative = stock.currentQuantity < 0;
          const isCritical = stock.status === "critical" || isNegative;
          const isLow = stock.status === "low";

          return (
            <div
              key={stock.productId}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all",
                isCritical ? "bg-red-500/[0.06] border border-red-500/10" :
                isLow ? "bg-amber-500/[0.06] border border-amber-500/10" :
                "bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05]"
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                "w-1.5 h-6 rounded-full shrink-0",
                isCritical ? "bg-red-400" : isLow ? "bg-amber-400" : "bg-green-400"
              )} />

              {/* Name */}
              <span className="text-xs font-medium text-white/70 truncate flex-1 min-w-0">
                {stock.productName}
              </span>

              {/* Quantity */}
              <span className={cn(
                "text-xs font-mono font-bold shrink-0 tabular-nums",
                isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-green-400"
              )}>
                {formatQty(stock.currentQuantity, stock.unit)}
              </span>

              {/* Icon */}
              {isCritical ? (
                <ArrowDownRight className="w-3 h-3 text-red-400 shrink-0" />
              ) : isLow ? (
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              ) : (
                <ArrowUpRight className="w-3 h-3 text-green-400/50 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
        <span className="text-[10px] text-white/30 font-mono">
          {view === "critical" ? `${critical.length} produits en alerte` : `${positive.length} produits en stock`}
        </span>
        <span className="text-[10px] text-white/20">
          Top 10
        </span>
      </div>
    </div>
  );
}
