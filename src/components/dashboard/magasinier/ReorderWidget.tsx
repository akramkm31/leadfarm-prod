"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ShoppingCart, PackageCheck, ArrowUpRight } from "lucide-react";
import { useStockLevels, useMovements } from "@/hooks/useData";
import type { StockLevel, StockEntry } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { WidgetShell, WidgetEmpty } from "./WidgetShell";

export default function ReorderWidget({ bare = false }: { bare?: boolean }) {
  const { data: stockRaw } = useStockLevels();
  const { data: movRaw } = useMovements();
  const stock = (stockRaw ?? []) as StockLevel[];
  const movements = (movRaw ?? []) as StockEntry[];

  // Last known supplier per product (most recent entry with a supplier name)
  const supplierByProduct = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const m of sorted) {
      if (m.supplierName && !map.has(m.productId)) map.set(m.productId, m.supplierName);
    }
    return map;
  }, [movements]);

  const items = stock
    .filter((s) => s.currentQuantity <= s.minThreshold)
    .sort((a, b) => a.currentQuantity - a.minThreshold - (b.currentQuantity - b.minThreshold));

  return (
    <WidgetShell
      icon={<ShoppingCart className="w-4 h-4" />}
      title="À réapprovisionner"
      count={items.length}
      countTone={items.length ? "amber" : "green"}
      bare={bare}
      action={
        <Link href="/suppliers" className="text-[10px] font-bold text-[var(--color-valley-green)] hover:opacity-80 inline-flex items-center gap-0.5">
          Fournisseurs <ArrowUpRight className="w-3 h-3" />
        </Link>
      }
    >
      {items.length === 0 ? (
        <WidgetEmpty icon={<PackageCheck className="w-7 h-7" />} label="Tous les stocks au-dessus du seuil" />
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 5).map((s) => {
            const critical = s.status === "critical" || s.currentQuantity <= 0;
            return (
              <li key={s.productId} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-[var(--color-stone-moss)] bg-white/50">
                <span className={cn("w-1.5 h-7 rounded-full shrink-0", critical ? "bg-red-500" : "bg-amber-400")} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--color-adaline-ink)] truncate">{s.productName}</p>
                  <p className="text-[10px] text-[var(--color-adaline-ink)]/50 truncate">
                    {supplierByProduct.get(s.productId) ?? "Fournisseur —"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn("text-xs font-bold font-mono", critical ? "text-red-600" : "text-amber-700")}>
                    {s.currentQuantity.toFixed(0)} {s.unit}
                  </span>
                  <p className="text-[9px] text-[var(--color-adaline-ink)]/45">seuil {s.minThreshold}</p>
                </div>
              </li>
            );
          })}
          {items.length > 5 && (
            <p className="text-[10px] text-[var(--color-adaline-ink)]/40 text-center pt-0.5">
              +{items.length - 5} autres produits
            </p>
          )}
        </ul>
      )}
    </WidgetShell>
  );
}
