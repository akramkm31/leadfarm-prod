"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X, MapPin, Layers, ArrowUpRight } from "lucide-react";
import { useStockLevels, useMovements } from "@/hooks/useData";
import type { Parcelle, StockLevel, StockEntry } from "@/lib/mock-data";
import { summarizeParcelleStock } from "@/lib/parcelle-stock";
import ParcelleProductCard from "@/components/dashboard/ParcelleProductCard";

interface Props {
  parcelle: Parcelle;
  treatments: Record<string, unknown>[];
  onClose: () => void;
}

export default function DashboardParcelleStockPanel({ parcelle, treatments, onClose }: Props) {
  const { data: stockRaw } = useStockLevels();
  const stockLevels = (stockRaw ?? []) as StockLevel[];
  const { data: movementsRaw } = useMovements();
  const movements = (movementsRaw ?? []) as StockEntry[];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeParcelleStock(parcelle, treatments as never[], stockLevels),
    [parcelle, treatments, stockLevels]
  );
  const parcelleProducts = summary.products;

  const movementsByProduct = useMemo(() => {
    const map = new Map<string, StockEntry[]>();
    for (const m of movements) {
      const arr = map.get(m.productId) ?? [];
      arr.push(m);
      map.set(m.productId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return map;
  }, [movements]);

  return (
    <div className="flex flex-col h-full bg-[var(--surface-pure)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-stone-moss)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-[var(--color-valley-green)] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-adaline-ink)] truncate">{parcelle.name}</p>
            <p className="text-[10px] text-[var(--color-adaline-ink)]/50 mt-0.5">
              {parcelle.areaHectares} ha · {parcelle.cropType}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--color-stone-moss)] transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-[var(--color-adaline-ink)]/60" />
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 divide-x divide-[var(--color-stone-moss)] border-b border-[var(--color-stone-moss)] shrink-0">
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[var(--color-adaline-ink)]">{summary.productCount}</p>
          <p className="text-[10px] text-[var(--color-adaline-ink)]/50">Produits</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[var(--color-valley-green)]">{summary.okCount}</p>
          <p className="text-[10px] text-[var(--color-adaline-ink)]/50">En stock</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-amber-600">{summary.alertCount}</p>
          <p className="text-[10px] text-[var(--color-adaline-ink)]/50">Alertes</p>
        </div>
      </div>

      {/* Hint */}
      <p className="px-4 pt-3 pb-1 text-[10px] text-[var(--color-adaline-ink)]/45 shrink-0">
        Cliquez un produit pour voir son détail stock et l&apos;historique des mouvements.
      </p>

      {/* Products list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {parcelleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Layers className="w-8 h-8 text-[var(--color-adaline-ink)]/20" />
            <p className="text-xs text-[var(--color-adaline-ink)]/50">
              Aucun produit utilisé sur cette parcelle
            </p>
          </div>
        ) : (
          parcelleProducts.map((product) => (
            <ParcelleProductCard
              key={product.productId}
              product={product}
              movements={movementsByProduct.get(product.productId) ?? []}
              expanded={expandedId === product.productId}
              onToggle={() =>
                setExpandedId((cur) => (cur === product.productId ? null : product.productId))
              }
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--color-stone-moss)] px-4 py-3 flex items-center justify-end gap-3">
        <Link
          href="/stock"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-valley-green)] text-white text-[10px] font-bold hover:opacity-90 transition-opacity"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Gérer le stock
        </Link>
      </div>
    </div>
  );
}
