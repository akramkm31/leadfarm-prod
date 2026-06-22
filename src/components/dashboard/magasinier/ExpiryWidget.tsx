"use client";

import { Clock, CheckCircle2 } from "lucide-react";
import { useStockLevels } from "@/hooks/useData";
import type { StockLevel } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { WidgetShell, WidgetEmpty, daysUntil } from "./WidgetShell";

export default function ExpiryWidget({ bare = false }: { bare?: boolean }) {
  const { data } = useStockLevels();
  const stock = (data ?? []) as StockLevel[];

  const items = stock
    .filter((s) => s.expiryDate)
    .map((s) => ({ s, days: daysUntil(s.expiryDate) }))
    .filter((x) => x.days <= 30)
    .sort((a, b) => a.days - b.days);

  return (
    <WidgetShell
      icon={<Clock className="w-4 h-4" />}
      title="Péremptions à venir"
      count={items.length}
      countTone={items.length ? "red" : "green"}
      bare={bare}
    >
      {items.length === 0 ? (
        <WidgetEmpty icon={<CheckCircle2 className="w-7 h-7" />} label="Aucun lot ne périme sous 30 jours" />
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 5).map(({ s, days }) => {
            const expired = days < 0;
            const urgent = days <= 7;
            return (
              <li
                key={s.productId}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg border",
                  expired || urgent
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50/60 border-amber-200/70"
                )}
              >
                <span className={cn("w-1.5 h-7 rounded-full shrink-0", expired || urgent ? "bg-red-500" : "bg-amber-400")} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--color-adaline-ink)] truncate">{s.productName}</p>
                  <p className="text-[10px] text-[var(--color-adaline-ink)]/50 truncate font-mono">
                    {s.lotNumber ?? "—"} · {s.currentQuantity.toFixed(0)} {s.unit}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn("text-[10px] font-bold", expired || urgent ? "text-red-600" : "text-amber-700")}>
                    {expired ? "PÉRIMÉ" : `J-${days}`}
                  </span>
                  <p className="text-[9px] text-[var(--color-adaline-ink)]/45">
                    {new Date(s.expiryDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </li>
            );
          })}
          {items.length > 5 && (
            <p className="text-[10px] text-[var(--color-adaline-ink)]/40 text-center pt-0.5">
              +{items.length - 5} autres lots
            </p>
          )}
        </ul>
      )}
    </WidgetShell>
  );
}
