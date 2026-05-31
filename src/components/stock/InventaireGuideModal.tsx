/**
 * INVENTAIRE TRIMESTRIEL GUIDÉ
 *
 * Étape 1 — Snapshot du stock théorique verrouillé
 * Étape 2 — Saisie comptage physique (lot par lot)
 * Étape 3 — Calcul des écarts, motif obligatoire si > 2%, badge RT si > 5%
 * Étape 4 — Validation et génération PV PDF
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { categoryColors, type StockLevel } from "@/lib/mock-data";
import {
  X, ClipboardCheck, Download, Loader2, AlertTriangle,
  FileText, ArrowRight, CheckCircle2, Save,
} from "lucide-react";

type Etape = "theorique" | "saisie" | "ecarts" | "validation";

interface LigneInventaire {
  productId: string;
  productName: string;
  category: string;
  stockTheorique: number;
  unite: string;
  stockPhysique: number | null;
  ecart: number | null;
  ecartPct: number | null;
  motif: string;
}

interface Props {
  stockLevels: StockLevel[];
  onClose: () => void;
  onSaved?: () => Promise<void>;
}

export default function InventaireGuideModal({ stockLevels, onClose, onSaved }: Props) {
  const [etape, setEtape] = useState<Etape>("theorique");
  const [lignes, setLignes] = useState<LigneInventaire[]>([]);
  const [saving, setSaving] = useState(false);
  const [inventaireId, setInventaireId] = useState<string | null>(null);
  const [motifErrors, setMotifErrors] = useState<Record<string, boolean>>({});

  // Étape 1 : Initialiser les lignes avec le snapshot théorique
  useEffect(() => {
    setLignes(
      stockLevels.map((s) => ({
        productId: s.productId,
        productName: s.productName,
        category: s.category,
        stockTheorique: s.currentQuantity,
        unite: s.unit,
        stockPhysique: null,
        ecart: null,
        ecartPct: null,
        motif: "",
      }))
    );
  }, [stockLevels]);

  // Démarrer l'inventaire (snapshot verrouillé en base)
  async function demarrerInventaire() {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("inventaires")
        .insert({
          status: "en_cours",
          stock_theorique: stockLevels.map((s) => ({
            lot_id: s.productId,
            produit_id: s.productId,
            stock_disponible: s.currentQuantity,
            unite: s.unit,
          })),
        })
        .select("id")
        .single();

      if (error) throw error;
      setInventaireId(data.id);
      setEtape("saisie");
    } catch (err) {
      console.error("Erreur démarrage inventaire:", err);
    } finally {
      setSaving(false);
    }
  }

  // Mettre à jour le comptage physique
  function updatePhysique(productId: string, value: string) {
    const qty = value === "" ? null : parseFloat(value);
    setLignes((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const ecart = qty !== null ? qty - l.stockTheorique : null;
        const ecartPct = l.stockTheorique !== 0 && qty !== null
          ? Math.abs((ecart! / l.stockTheorique) * 100)
          : null;
        return { ...l, stockPhysique: qty, ecart, ecartPct, motif: "" };
      })
    );
    setMotifErrors((prev) => ({ ...prev, [productId]: false }));
  }

  // Mettre à jour le motif
  function updateMotif(productId: string, motif: string) {
    setLignes((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, motif } : l))
    );
    setMotifErrors((prev) => ({ ...prev, [productId]: false }));
  }

  // Passer à l'étape des écarts
  function allerEcarts() {
    const withEcart = lignes.filter((l) => l.stockPhysique !== null);
    if (withEcart.length === 0) return;

    // Vérifier les motifs pour écarts > 2%
    let hasError = false;
    const newErrors: Record<string, boolean> = {};
    withEcart.forEach((l) => {
      if (l.ecartPct !== null && l.ecartPct > 2 && !l.motif.trim()) {
        newErrors[l.productId] = true;
        hasError = true;
      }
    });
    setMotifErrors(newErrors);
    if (hasError) return;

    setEtape("ecarts");
  }

  // Valider et finaliser
  async function validerInventaire() {
    if (!inventaireId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("inventaires")
        .update({
          status: "valide",
          date_fin: new Date().toISOString(),
          lignes: lignes.map((l) => ({
            produit_id: l.productId,
            stock_theorique: l.stockTheorique,
            stock_physique: l.stockPhysique,
            ecart: l.ecart,
            ecart_pct: l.ecartPct,
            motif: l.motif,
            validation_rt_requise: l.ecartPct !== null && l.ecartPct > 5,
          })),
        })
        .eq("id", inventaireId);

      if (error) throw error;

      // Mettre à jour les stocks en base
      for (const l of lignes) {
        if (l.stockPhysique !== null) {
          await supabase
            .from("stock_levels")
            .update({ current_quantity: l.stockPhysique })
            .eq("product_id", l.productId);
        }
      }

      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      console.error("Erreur validation inventaire:", err);
    } finally {
      setSaving(false);
    }
  }

  const nbSaisis = lignes.filter((l) => l.stockPhysique !== null).length;
  const nbEcartFort = lignes.filter((l) => l.ecartPct !== null && l.ecartPct > 5).length;
  const totalEcart = lignes.reduce((acc, l) => acc + (l.ecart ?? 0), 0);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 " onClick={onClose} />
      <div className="relative bg-[#1a2e1a]/95  rounded-2xl shadow-xl border border-white/[0.15] w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Inventaire Trimestriel Guidé</h2>
              <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">
                {etape === "theorique" && "Étape 1/4 — Vérifier le snapshot théorique"}
                {etape === "saisie" && "Étape 2/4 — Saisir le comptage physique"}
                {etape === "ecarts" && "Étape 3/4 — Analyser les écarts"}
                {etape === "validation" && "Étape 4/4 — Valider l'inventaire"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-[var(--color-adaline-ink)]/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-6">
          {(["theorique", "saisie", "ecarts", "validation"] as const).map((e, i) => {
            const isActive = etape === e;
            const isPast = ["theorique", "saisie", "ecarts"].indexOf(etape) >= i;
            return (
              <div key={e} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  isActive ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/30" :
                  isPast ? "bg-[var(--color-valley-green)]/10 text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30"
                )}>
                  {isPast && etape !== e ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">
                    {e === "theorique" && "Snapshot"}
                    {e === "saisie" && "Saisie"}
                    {e === "ecarts" && "Écarts"}
                    {e === "validation" && "Validation"}
                  </span>
                </div>
                {i < 3 && <div className="h-px flex-1 bg-[var(--color-stone-moss)]" />}
              </div>
            );
          })}
        </div>

        {/* ÉTAPE 1 : Snapshot théorique */}
        {etape === "theorique" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-valley-green)]/[0.06] border border-emerald-500/15">
              <AlertTriangle className="w-5 h-5 text-[var(--color-valley-green)] shrink-0" />
              <p className="text-sm text-emerald-200">
                Le snapshot théorique sera verrouillé et servira de référence pour le comptage physique.
                Cette action est irréversible une fois lancée.
              </p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs text-[var(--color-adaline-ink)]/50 uppercase tracking-wider mb-3">Résumé du stock théorique</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-2xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">{stockLevels.length}</span>
                  <p className="text-[10px] text-[var(--color-adaline-ink)]/40">Produits</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">
                    {stockLevels.reduce((a, s) => a + Math.abs(s.currentQuantity), 0).toFixed(1)}
                  </span>
                  <p className="text-[10px] text-[var(--color-adaline-ink)]/40">Unités totales</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-[var(--color-valley-green)] font-mono">
                    {stockLevels.filter((s) => s.currentQuantity < 0).length}
                  </span>
                  <p className="text-[10px] text-[var(--color-adaline-ink)]/40">Valeurs négatives</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.04]">
                Annuler
              </button>
              <button
                onClick={demarrerInventaire}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Démarrer l'inventaire
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Saisie physique */}
        {etape === "saisie" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-adaline-ink)]/50">
                <span className="text-[var(--color-valley-green)] font-bold">{nbSaisis}</span>/{lignes.length} produits comptés
              </p>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {lignes.map((l) => (
                <div key={l.productId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColors[l.category] || "#888" }} />
                  <span className="text-xs text-[var(--color-adaline-ink)]/70 flex-1 min-w-0 truncate">{l.productName}</span>
                  <span className="text-xs text-[var(--color-adaline-ink)]/40 font-mono shrink-0">{l.stockTheorique.toFixed(1)}</span>
                  <input
                    type="number"
                    step="0.1"
                    className="glass-input px-3 py-1.5 text-sm w-20 font-mono shrink-0"
                    placeholder="Physique"
                    value={l.stockPhysique ?? ""}
                    onChange={(e) => updatePhysique(l.productId, e.target.value)}
                  />
                  {l.stockPhysique !== null && l.ecart !== null && (
                    <span className={cn(
                      "text-xs font-mono font-bold w-16 text-right shrink-0",
                      Math.abs(l.ecart) < 0.01 ? "text-[var(--color-adaline-ink)]/30" : l.ecart > 0 ? "text-green-400" : "text-[var(--color-valley-green)]"
                    )}>
                      {l.ecart > 0 ? "+" : ""}{l.ecart.toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setEtape("theorique")} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.04]">
                Retour
              </button>
              <button
                onClick={allerEcarts}
                disabled={nbSaisis === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                Analyser les écarts ({nbSaisis})
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Écarts */}
        {etape === "ecarts" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="glass-card p-3 text-center">
                <span className={cn("text-2xl font-bold font-mono", totalEcart >= 0 ? "text-green-400" : "text-[var(--color-valley-green)]")}>
                  {totalEcart > 0 ? "+" : ""}{totalEcart.toFixed(1)}
                </span>
                <p className="text-[10px] text-[var(--color-adaline-ink)]/40">Écart total</p>
              </div>
              <div className="glass-card p-3 text-center">
                <span className="text-2xl font-bold font-mono text-[var(--color-valley-green)]">{nbEcartFort}</span>
                <p className="text-[10px] text-[var(--color-adaline-ink)]/40">Validation RT requise</p>
              </div>
              <div className="glass-card p-3 text-center">
                <span className="text-2xl font-bold font-mono text-[var(--color-adaline-ink)]/80">{lignes.filter((l) => l.ecartPct !== null && l.ecartPct <= 2).length}</span>
                <p className="text-[10px] text-[var(--color-adaline-ink)]/40">Écarts OK</p>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2">
              {lignes
                .filter((l) => l.stockPhysique !== null && l.ecartPct !== null)
                .sort((a, b) => Math.abs(b.ecartPct ?? 0) - Math.abs(a.ecartPct ?? 0))
                .map((l) => (
                  <div key={l.productId} className={cn(
                    "p-3 rounded-xl border",
                    l.ecartPct !== null && l.ecartPct > 5
                      ? "bg-[var(--color-valley-green)]/[0.07] border-[var(--color-valley-green)]/20"
                      : l.ecartPct !== null && l.ecartPct > 2
                      ? "bg-[var(--color-valley-green)]/[0.07] border-[var(--color-valley-green)]/20"
                      : "bg-white/[0.03] border-white/[0.06]"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoryColors[l.category] || "#888" }} />
                      <span className="text-xs text-[var(--color-adaline-ink)]/70 flex-1 min-w-0 truncate">{l.productName}</span>
                      <span className="text-xs text-[var(--color-adaline-ink)]/40 font-mono">{l.stockTheorique.toFixed(1)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--color-adaline-ink)]/20" />
                      <span className="text-xs font-mono font-bold">{l.stockPhysique?.toFixed(1)}</span>
                      <span className={cn(
                        "text-xs font-mono font-bold w-16 text-right",
                        Math.abs(l.ecart ?? 0) < 0.01 ? "text-[var(--color-adaline-ink)]/30" :
                        (l.ecart ?? 0) > 0 ? "text-green-400" : "text-[var(--color-valley-green)]"
                      )}>
                        {(l.ecart ?? 0) > 0 ? "+" : ""}{l.ecart?.toFixed(1)}
                      </span>
                      {l.ecartPct !== null && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          l.ecartPct > 5 ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]" :
                          l.ecartPct > 2 ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]" :
                          "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]"
                        )}>
                          {l.ecartPct.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Motif obligatoire si écart > 2% */}
                    {(l.ecartPct ?? 0) > 2 && (
                      <div className="mt-2 pl-5">
                        <input
                          type="text"
                          className={cn(
                            "glass-input px-3 py-1.5 text-xs w-full",
                            motifErrors[l.productId] && "border-emerald-500/50"
                          )}
                          placeholder="Motif de l'écart (obligatoire)"
                          value={l.motif}
                          onChange={(e) => updateMotif(l.productId, e.target.value)}
                        />
                        {(l.ecartPct ?? 0) > 5 && (
                          <span className="text-[10px] text-[var(--color-valley-green)] mt-1 block">
                            ⚠ Écart &gt; 5% — Validation Responsable Technique requise
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setEtape("saisie")} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.04]">
                Retour
              </button>
              <button
                onClick={() => setEtape("validation")}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                Valider l'inventaire
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Validation */}
        {etape === "validation" && (
          <div className="space-y-4">
            <div className="glass-card p-5 text-center">
              <CheckCircle2 className="w-12 h-12 text-[var(--color-valley-green)] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Prêt à valider</h3>
              <p className="text-sm text-[var(--color-adaline-ink)]/50 mt-1">
                {nbSaisis} produits comptés · {nbEcartFort} nécessitent validation RT
              </p>
              <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-2">
                Le stock théorique sera mis à jour avec les valeurs physiques saisies.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setEtape("ecarts")} className="px-4 py-2.5 text-sm text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/70 rounded-xl hover:bg-white/[0.04]">
                Retour
              </button>
              <button
                onClick={validerInventaire}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Validation..." : "Valider et mettre à jour"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
