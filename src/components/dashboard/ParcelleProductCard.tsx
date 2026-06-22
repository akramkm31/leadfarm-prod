"use client";

import {
  Package, AlertTriangle, CheckCircle2, TrendingDown, ChevronDown,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RotateCcw, Trash2,
  Coins, Boxes, ShoppingCart, Tag, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockEntry, StockLevel } from "@/lib/mock-data";

interface ProductUsage {
  productId: string;
  name: string;
  unit: string;
  totalUsed?: number;
  uses?: number;
  stock?: StockLevel;
}

interface Props {
  product: ProductUsage;
  movements: StockEntry[];
  expanded: boolean;
  onToggle: () => void;
}

const STATUS_CFG: Record<NonNullable<StockLevel["status"]>, { label: string; cls: string }> = {
  ok:        { label: "OK",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  low:       { label: "Bas",      cls: "bg-amber-100 text-amber-700 border-amber-200" },
  critical:  { label: "Critique", cls: "bg-red-100 text-red-700 border-red-200" },
  overstock: { label: "Surstock", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

const CATEGORY_LABEL: Record<string, string> = {
  entree_fournisseur: "Entrée fournisseur",
  entree_distributeur: "Entrée distributeur",
  sortie_traitement: "Sortie traitement",
  sortie_interne: "Sortie interne",
  transfert_externe: "Transfert externe",
  retour_parcelle: "Retour parcelle",
  perte_peremption: "Perte (péremption)",
};

function daysUntilExpiry(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function movementVisual(m: StockEntry) {
  const incoming = m.quantity >= 0;
  if (m.type === "transfer") return { Icon: ArrowLeftRight, cls: "text-blue-600 bg-blue-50" };
  if (m.type === "return") return { Icon: RotateCcw, cls: "text-emerald-600 bg-emerald-50" };
  if (m.movementCategory === "perte_peremption") return { Icon: Trash2, cls: "text-red-600 bg-red-50" };
  return incoming
    ? { Icon: ArrowDownLeft, cls: "text-emerald-600 bg-emerald-50" }
    : { Icon: ArrowUpRight, cls: "text-amber-600 bg-amber-50" };
}

export default function ParcelleProductCard({ product, movements, expanded, onToggle }: Props) {
  const { name, totalUsed, unit, uses, stock } = product;
  const showUsage = uses != null && uses > 0 && totalUsed != null;
  const days = stock?.expiryDate ? daysUntilExpiry(stock.expiryDate) : null;
  const expiryWarn = days !== null && days < 30;
  const cfg = STATUS_CFG[stock?.status ?? "ok"];
  const pct = stock ? Math.min(100, Math.round((stock.currentQuantity / stock.maxCapacity) * 100)) : 0;
  const needsReorder = stock ? stock.currentQuantity <= stock.minThreshold : false;
  const productMovements = movements.slice(0, 6);

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/40 overflow-hidden transition-colors",
        expanded ? "border-[var(--color-valley-green)]/40 bg-white/70" : "border-[var(--color-stone-moss)]"
      )}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left p-3 space-y-2 hover:bg-white/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-3.5 h-3.5 text-[var(--color-valley-green)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--color-adaline-ink)] truncate">{name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {stock && (
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", cfg.cls)}>{cfg.label}</span>
            )}
            <ChevronDown
              className={cn("w-3.5 h-3.5 text-[var(--color-adaline-ink)]/40 transition-transform", expanded && "rotate-180")}
            />
          </div>
        </div>

        {stock && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--color-adaline-ink)]/50">Stock actuel</span>
              <span className="font-bold text-[var(--color-adaline-ink)]">
                {stock.currentQuantity.toFixed(1)} {stock.unit}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-stone-moss)] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  stock.status === "critical" ? "bg-red-500" : stock.status === "low" ? "bg-amber-400" : "bg-[var(--color-valley-green)]"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-[var(--color-adaline-ink)]/40">
              <span>Min: {stock.minThreshold} {stock.unit}</span>
              <span>Max: {stock.maxCapacity} {stock.unit}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-stone-moss)]/60">
          {showUsage ? (
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-adaline-ink)]/60">
              <TrendingDown className="w-3 h-3" />
              <span>{totalUsed!.toFixed(1)} {unit} utilisé · {uses} traitement{uses! > 1 ? "s" : ""}</span>
            </div>
          ) : (
            <span />
          )}
          {days !== null && (
            <div className={cn("flex items-center gap-1 text-[10px] font-medium shrink-0", expiryWarn ? "text-red-600" : "text-[var(--color-adaline-ink)]/50")}>
              {expiryWarn ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              <span>{expiryWarn ? `J-${days}` : new Date(stock!.expiryDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded storekeeper detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-[var(--color-stone-moss)]/70 animate-[fadeIn_0.2s_ease]">
          {stock && (
            <>
              {needsReorder && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[10px] font-semibold text-red-700">
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  Réapprovisionnement conseillé — sous le seuil minimum
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Fact icon={<Boxes className="w-3 h-3" />} label="Stock initial" value={`${stock.stockInitial} ${stock.unit}`} />
                <Fact icon={<Package className="w-3 h-3" />} label="Disponible" value={`${stock.currentQuantity.toFixed(1)} ${stock.unit}`} />
                <Fact icon={<Coins className="w-3 h-3" />} label="Prix moyen" value={`${stock.avgUnitPriceDZD.toLocaleString("fr-DZ")} DZD`} />
                <Fact icon={<Tag className="w-3 h-3" />} label="Catégorie" value={stock.category} />
                <Fact icon={<Tag className="w-3 h-3" />} label="Lot" value={stock.lotNumber ?? "—"} mono />
                {days !== null && (
                  <Fact
                    icon={<CalendarClock className="w-3 h-3" />}
                    label="Péremption"
                    value={`${new Date(stock.expiryDate).toLocaleDateString("fr-FR")} · ${days >= 0 ? `J-${days}` : "périmé"}`}
                    danger={expiryWarn}
                  />
                )}
              </div>
            </>
          )}

          {/* Movement log */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-adaline-ink)]/45">
              Historique mouvements
            </p>
            {productMovements.length === 0 ? (
              <p className="text-[10px] text-[var(--color-adaline-ink)]/40 italic">Aucun mouvement enregistré</p>
            ) : (
              productMovements.map((m) => {
                const { Icon, cls } = movementVisual(m);
                const label = CATEGORY_LABEL[m.movementCategory] ?? m.movementCategory ?? m.type;
                const ref = m.supplierName || m.reference || m.transferDestination || m.notes || "";
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", cls)}>
                      <Icon className="w-3 h-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-[var(--color-adaline-ink)]/80 truncate">{label}</span>
                        <span className={cn("text-[10px] font-bold font-mono shrink-0", m.quantity >= 0 ? "text-emerald-600" : "text-amber-600")}>
                          {m.quantity >= 0 ? "+" : ""}{m.quantity} {m.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[9px] text-[var(--color-adaline-ink)]/45">
                        <span className="truncate">{ref}</span>
                        <span className="shrink-0">{new Date(m.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ icon, label, value, mono, danger }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean; danger?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--color-stone-moss)]/30 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-[var(--color-adaline-ink)]/40">
        {icon}
        {label}
      </div>
      <p className={cn("text-[11px] font-bold mt-0.5 truncate", danger ? "text-red-600" : "text-[var(--color-adaline-ink)]", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}
