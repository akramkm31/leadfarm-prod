"use client";

import { cn } from "@/lib/utils";
import {
  categoryLabels,
  categoryColors,
  movementCategoryLabels,
  movementCategoryColors,
  type ProductCategory,
  type StockEntry,
  type StockLevel,
  type PhytoProduct,
} from "@/lib/mock-data";
import {
  Package,
  AlertTriangle,
  Truck,
  ChevronRight,
  RefreshCw,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowRightLeft,
  RotateCcw,
  Warehouse,
} from "lucide-react";

const entryTypeLabels: Record<string, string> = {
  entry: "Entrée",
  exit: "Sortie",
  treatment_consumption: "Consommation",
  adjustment: "Ajustement",
  transfer: "Transfert",
  return: "Retour",
  stock_initial: "Stock Initial",
};

const entryTypeIcons: Record<string, typeof ArrowUpRight> = {
  entry: ArrowUpRight,
  exit: ArrowDownRight,
  treatment_consumption: Minus,
  adjustment: RefreshCw,
  transfer: ArrowRightLeft,
  return: RotateCcw,
  stock_initial: Warehouse,
};

const entryTypeColors: Record<string, string> = {
  entry: "text-green-400 bg-green-400/10 border-emerald-400/20",
  exit: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  treatment_consumption: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  adjustment: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  transfer: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  return: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
  stock_initial: "text-[var(--color-valley-green)] bg-emerald-400/10 border-emerald-400/20",
};

const statusLabels: Record<string, string> = {
  ok: "Normal",
  low: "Bas",
  critical: "Critique",
  overstock: "Surstock",
  negative: "Négatif",
};

export function KpiCard({ title, value, subtitle, icon, accent, alert }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode;
  accent: string; alert?: boolean;
}) {
  return (
    <div className={cn(
      "glass-card p-5",
      alert && "border-[var(--color-valley-green)]/25 bg-[var(--color-valley-green)]/10"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-adaline-ink)]/40 uppercase tracking-wider">{title}</span>
        {icon}
      </div>
      <span className={cn("text-2xl font-bold", alert ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/90")}>{value}</span>
      <span className="text-[10px] text-[var(--color-adaline-ink)]/30 block mt-0.5">{subtitle}</span>
    </div>
  );
}

export function StockCard({ stock, isSelected, onClick }: {
  stock: StockLevel; isSelected: boolean; onClick: () => void;
}) {
  const maxCap = stock.maxCapacity > 1 ? stock.maxCapacity : Math.max(stock.currentQuantity * 1.5, 100);
  const fillPercent = Math.min((stock.currentQuantity / maxCap) * 100, 100);

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card p-5 cursor-pointer",
        stock.status === "critical" && "border-[var(--color-valley-green)]/25 bg-[var(--color-valley-green)]/10",
        stock.status === "low" && "border-[var(--color-valley-green)]/25 bg-[var(--color-valley-green)]/10",
        isSelected && "ring-2 ring-emerald-400/50 border-[var(--color-valley-green)]/25"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[stock.category] }} />
          <div>
            <span className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">{stock.productName}</span>
            <span className="text-[10px] text-[var(--color-adaline-ink)]/30 ml-2">{categoryLabels[stock.category]}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stock.status !== "ok" && (
            <span className={cn(
              "badge text-[10px]",
              stock.status === "critical" ? "badge-danger" : "badge-warning"
            )}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {stock.status === "critical" ? "Critique" : "Stock bas"}
            </span>
          )}
          <span className="text-lg font-bold text-[var(--color-adaline-ink)]/85 font-mono">
            {stock.currentQuantity.toFixed(stock.currentQuantity % 1 ? 1 : 0)}
            <span className="text-xs text-[var(--color-adaline-ink)]/40 ml-1">{stock.unit}</span>
          </span>
        </div>
      </div>

      <div className="relative h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            stock.status === "critical" ? "bg-gradient-to-r from-red-500 to-red-400" :
            stock.status === "low" ? "bg-gradient-to-r from-amber-500 to-amber-400" :
            "bg-gradient-to-r from-green-500 to-green-400"
          )}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--color-adaline-ink)]/30">{stock.unit}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/[0.08]">
        <div>
          <span className="text-[10px] text-[var(--color-adaline-ink)]/30 block">Dern. entrée</span>
          <span className="text-xs text-[var(--color-adaline-ink)]/50">{new Date(stock.lastEntryDate).toLocaleDateString("fr-FR")}</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--color-adaline-ink)]/30 block">Dern. sortie</span>
          <span className="text-xs text-[var(--color-adaline-ink)]/50">
            {stock.lastExitDate ? new Date(stock.lastExitDate).toLocaleDateString("fr-FR") : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailPanel({ stock, entries, products, rotationData, onClose }: {
  stock: StockLevel;
  entries: StockEntry[];
  products: PhytoProduct[];
  rotationData?: { totalOut: number; rotationRate: number; daysOfStock: number };
  onClose: () => void;
}) {
  const product = products.find((p) => p.id === stock.productId);
  const productEntries = entries.filter((e) => e.productId === stock.productId);
  const maxCap = stock.maxCapacity > 1 ? stock.maxCapacity : Math.max(stock.currentQuantity * 1.5, 100);
  const fillPercent = Math.min((stock.currentQuantity / maxCap) * 100, 100);

  return (
    <div className="glass-card p-5 sticky top-[90px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: categoryColors[stock.category] + "20" }}>
            <Package className="w-5 h-5" style={{ color: categoryColors[stock.category] }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">{stock.productName}</h3>
            <span className="text-[10px] text-[var(--color-adaline-ink)]/40">{categoryLabels[stock.category]} · {product?.registrationNumber}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[var(--color-adaline-ink)]/40">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Gauge */}
      <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--color-adaline-ink)]/40">Niveau actuel</span>
          <span className={cn(
            "badge text-[10px]",
            stock.status === "critical" ? "badge-danger" :
            stock.status === "low" ? "badge-warning" : "badge-success"
          )}>
            {statusLabels[stock.status]}
          </span>
        </div>
        <div className="text-center mb-3">
          <span className="text-3xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">
            {stock.currentQuantity.toFixed(stock.currentQuantity % 1 ? 1 : 0)}
          </span>
          <span className="text-sm text-[var(--color-adaline-ink)]/40 ml-1">{stock.unit}</span>
          <span className="text-xs text-[var(--color-adaline-ink)]/30 block">{stock.unit}</span>
        </div>
        <div className="relative h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              stock.status === "critical" ? "bg-emerald-400" :
              stock.status === "low" ? "bg-emerald-400" : "bg-green-400"
            )}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <span className="text-[10px] text-[var(--color-adaline-ink)]/30 block">Jours de stock</span>
          <span className={cn(
            "text-sm font-bold font-mono",
            rotationData && rotationData.daysOfStock < 15 ? "text-[var(--color-valley-green)]" :
            rotationData && rotationData.daysOfStock < 30 ? "text-[var(--color-valley-green)]" : "text-green-400"
          )}>
            {rotationData ? (rotationData.daysOfStock > 365 ? "∞" : `${rotationData.daysOfStock} jours`) : "—"}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <span className="text-[10px] text-[var(--color-adaline-ink)]/30 block">Consommé ce mois</span>
          <span className="text-sm font-bold text-[var(--color-adaline-ink)]/85 font-mono">{rotationData?.totalOut.toFixed(1) || 0} {stock.unit}</span>
        </div>
      </div>

      {/* Product info */}
      {product && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[var(--color-adaline-ink)]/60 mb-2">Fiche Produit</h4>
          <div className="space-y-2">
            <DetailRow label="Substance active" value={product.activeSubstance ? `${product.activeSubstance}${product.teneurMA ? ` (${product.teneurMA} ${product.teneurMAUnit || ''})` : ''}`.trim() : '—'} />
            <DetailRow label="Formulation" value={[product.formulation, product.familleChimique].filter(Boolean).join(' — ') || '—'} />
            <DetailRow label="Dose / ha" value={`${product.dosePerHectareMin}–${product.dosePerHectareMax} ${product.doseUnit}`} />
            <DetailRow label="Fournisseur" value={product.supplierName} />
            <DetailRow label="Stock initial (campagne)" value={`${stock.stockInitial} ${stock.unit}`} />
            {stock.lotNumber && <DetailRow label="N° Lot" value={stock.lotNumber} />}
            <DetailRow label="Péremption" value={new Date(stock.expiryDate).toLocaleDateString("fr-FR")} />
          </div>
        </div>
      )}

      {/* Recent movements for this product */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--color-adaline-ink)]/60 mb-2">Mouvements récents</h4>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {productEntries.length === 0 ? (
            <p className="text-xs text-[var(--color-adaline-ink)]/30 py-4 text-center">Aucun mouvement</p>
          ) : (
            productEntries.slice(0, 8).map((entry) => (
              <div key={entry.id}>
                <MovementRow entry={entry} compact />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-black/[0.04] last:border-0">
      <span className="text-[10px] text-[var(--color-adaline-ink)]/40">{label}</span>
      <span className="text-xs text-[var(--color-adaline-ink)]/70 font-medium">{value}</span>
    </div>
  );
}

export function MovementRow({ entry, compact }: { entry: StockEntry; compact?: boolean }) {
  const Icon = entryTypeIcons[entry.type] || RefreshCw;
  const colors = entryTypeColors[entry.type] || entryTypeColors.adjustment;
  const isPositive = entry.quantity > 0;

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08]",
      compact ? "p-2" : "p-3"
    )}>
      <div className={cn("rounded-lg border flex items-center justify-center shrink-0", colors, compact ? "w-6 h-6" : "w-7 h-7")}>
        <Icon className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn("font-medium text-[var(--color-adaline-ink)]/70 truncate", compact ? "text-[11px]" : "text-xs")}>
            {compact ? entryTypeLabels[entry.type] : entry.productName}
          </span>
          <span className={cn(
            "font-bold font-mono",
            compact ? "text-[11px]" : "text-xs",
            isPositive ? "text-green-400" : "text-[var(--color-valley-green)]"
          )}>
            {isPositive ? "+" : ""}{entry.quantity} {entry.unit}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-[var(--color-adaline-ink)]/30">
            {new Date(entry.date).toLocaleDateString("fr-FR")}
          </span>
          {!compact && entry.movementCategory && (
            <span className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: movementCategoryColors[entry.movementCategory] || "#6b7280", borderColor: (movementCategoryColors[entry.movementCategory] || "#6b7280") + "30" }}>
              {movementCategoryLabels[entry.movementCategory]}
            </span>
          )}
          {entry.reference && <span className="text-[10px] text-[var(--color-adaline-ink)]/30 font-mono">{entry.reference}</span>}
          {entry.supplierName && !compact && (
            <span className="text-[10px] text-[var(--color-adaline-ink)]/30 flex items-center gap-1">
              <Truck className="w-2.5 h-2.5" />{entry.supplierName}
            </span>
          )}
          {entry.transferDestination && !compact && (
            <span className="text-[10px] text-[var(--color-valley-green)] flex items-center gap-1">
              → {entry.transferDestination}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function OperationCard({ icon, title, description, color, shortcut, onClick }: {
  icon: React.ReactNode; title: string; description: string; color: string; shortcut?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-4 p-4 rounded-xl bg-black/50  border border-white/[0.08] hover:border-white/15 hover:bg-black/60 transition-all duration-200 text-left w-full overflow-hidden"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--color-adaline-ink)]/85 group-hover:text-[var(--color-adaline-ink)] transition-colors truncate">{title}</h3>
          {shortcut && (
            <span className="hidden lg:inline-flex text-[9px] font-mono text-[var(--color-adaline-ink)]/20 border border-[var(--color-stone-moss)] rounded px-1 py-0.5 leading-none">{shortcut}</span>
          )}
        </div>
        <p className="text-[11px] text-[var(--color-adaline-ink)]/35 mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-adaline-ink)]/10 group-hover:text-[var(--color-adaline-ink)]/30 shrink-0 transition-all group-hover:translate-x-0.5" />
    </button>
  );
}
