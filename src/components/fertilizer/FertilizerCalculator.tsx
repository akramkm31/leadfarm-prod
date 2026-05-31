"use client";

import { useState, useMemo } from "react";
import {
  products,
  parcelles,
  fertilizerCalculations,
  calculateFertilizerUnits,
  getNPKUnits,
  getAllParcelles,
  type PhytoProduct,
} from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import { Calculator, Leaf, FlaskConical, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const engraisProducts = products.filter((p) => p.category === "engrais");

export default function FertilizerCalculator() {
  const [selectedProduct, setSelectedProduct] = useState<string>(engraisProducts[0]?.id || "");
  const [selectedParcelle, setSelectedParcelle] = useState<string>(parcelles[0]?.id || "");
  const [doseKg, setDoseKg] = useState<number>(5);
  const [expanded, setExpanded] = useState(false);

  const product = products.find((p) => p.id === selectedProduct);
  const parcelle = getAllParcelles().find((p) => p.id === selectedParcelle);

  const npkResult = useMemo(() => {
    if (!product || !parcelle) return null;
    return getNPKUnits(product, doseKg, parcelle.areaHectares);
  }, [product, parcelle, doseKg]);

  const totalUnits = npkResult
    ? npkResult.unitsN + npkResult.unitsP + npkResult.unitsK
    : 0;

  return (
    <div className="glass-card p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 flex items-center justify-center">
            <Calculator className="w-4.5 h-4.5 text-[var(--color-valley-green)]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Calcul des Unités d&apos;Engrais</h3>
            <p className="text-[10px] text-[var(--color-adaline-ink)]/40">NPK — Unités fertilisantes par parcelle</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--color-adaline-ink)]/30" /> : <ChevronDown className="w-4 h-4 text-[var(--color-adaline-ink)]/30" />}
      </button>

      {expanded && (
        <div className="mt-5 pt-4 border-t border-white/[0.08]">
          {/* Calculator inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="text-[10px] font-medium text-[var(--color-adaline-ink)]/50 uppercase tracking-wider block mb-1.5">
                <FlaskConical className="w-3 h-3 inline mr-1" />Engrais
              </label>
              <select
                value={selectedProduct}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm"
              >
                {engraisProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.tradeName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-adaline-ink)]/50 uppercase tracking-wider block mb-1.5">
                <MapPin className="w-3 h-3 inline mr-1" />Parcelle
              </label>
              <select
                value={selectedParcelle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedParcelle(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm"
              >
                {getAllParcelles().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatHectares(p.areaHectares)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-adaline-ink)]/50 uppercase tracking-wider block mb-1.5">
                <Leaf className="w-3 h-3 inline mr-1" />Dose (kg/ha)
              </label>
              <input
                type="number"
                value={doseKg}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoseKg(Number(e.target.value) || 0)}
                className="glass-input w-full px-3 py-2 text-sm font-mono"
                min={0}
                step={0.5}
              />
            </div>
          </div>

          {/* Product composition */}
          {product && (
            <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="text-[10px] text-[var(--color-adaline-ink)]/40 uppercase tracking-wider block mb-2">Composition</span>
              <div className="flex items-center gap-4 flex-wrap">
                {product.composition.map((c: any, i: number) => (
                  <span key={i} className="text-xs text-[var(--color-valley-green)] font-mono">
                    {c.name}: {c.concentration}{c.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {npkResult && parcelle && (
            <div className="grid grid-cols-4 gap-3">
              <NPKCard label="Azote (N)" value={npkResult.unitsN} color="#10b981" unit="kg N" />
              <NPKCard label="Phosphore (P₂O₅)" value={npkResult.unitsP} color="#06b6d4" unit="kg P₂O₅" />
              <NPKCard label="Potassium (K₂O)" value={npkResult.unitsK} color="#f59e0b" unit="kg K₂O" />
              <NPKCard label="Total unités" value={totalUnits} color="#8b5cf6" unit="kg" isTotal />
            </div>
          )}

          {/* Formula explanation */}
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <span className="text-[10px] text-[var(--color-adaline-ink)]/30">
              Formule: Unités = Dose (kg/ha) × Teneur (%) / 100 × Surface (ha)
              {parcelle && ` · Surface: ${formatHectares(parcelle.areaHectares)}`}
            </span>
          </div>

          {/* History */}
          {fertilizerCalculations.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/[0.08]">
              <h4 className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/40 uppercase tracking-wider mb-3">
                Historique des apports
              </h4>
              <div className="space-y-2">
                {fertilizerCalculations.map((fc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div>
                      <span className="text-xs text-[var(--color-adaline-ink)]/60">{fc.productName}</span>
                      <span className="text-[10px] text-[var(--color-adaline-ink)]/30 block">
                        {fc.parcelleName} · {new Date(fc.date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {fc.unitsN > 0 && <span className="text-[10px] font-mono text-green-400">{fc.unitsN.toFixed(1)} N</span>}
                      {fc.unitsP > 0 && <span className="text-[10px] font-mono text-[var(--color-valley-green)]">{fc.unitsP.toFixed(1)} P</span>}
                      {fc.unitsK > 0 && <span className="text-[10px] font-mono text-[var(--color-valley-green)]">{fc.unitsK.toFixed(1)} K</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NPKCard({ label, value, color, unit, isTotal }: {
  label: string; value: number; color: string; unit: string; isTotal?: boolean;
}) {
  return (
    <div className={cn(
      "p-3 rounded-xl border text-center",
      isTotal ? "bg-white/[0.06] border-white/[0.12]" : "bg-white/[0.03] border-white/[0.06]"
    )}>
      <span className="text-[9px] text-[var(--color-adaline-ink)]/35 uppercase tracking-wider block mb-1">{label}</span>
      <span className="text-lg font-bold font-mono block" style={{ color }}>
        {value.toFixed(1)}
      </span>
      <span className="text-[9px] text-[var(--color-adaline-ink)]/25">{unit}</span>
    </div>
  );
}
