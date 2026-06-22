"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, X, FlaskConical, Tractor } from "lucide-react";
import { completeTreatmentExecution } from "@/lib/data-provider";
import { cn } from "@/lib/utils";

type ProduitDetail = {
  productId: string;
  nom_commercial: string;
  matiere_active?: string;
  quantite_sortir?: string;
  dose_hl?: string;
  unit?: string;
};

type ProduitReel = {
  productId: string;
  nomCommercial: string;
  doseHl: number | null;
  quantitePrevue: number | null;
  volumePassage: string;
  quantiteReelle: string;
  unit: string;
};

type Props = {
  open: boolean;
  treatmentId: string;
  parcelleName?: string;
  defaultOperator?: string;
  produitsDetail?: ProduitDetail[];
  onClose: () => void;
  onSaved: () => void;
};

function calcQte(doseHl: number | null, volumePassage: string): string {
  if (doseHl === null || !volumePassage) return "";
  const v = parseFloat(volumePassage);
  if (isNaN(v) || v <= 0) return "";
  return ((doseHl / 100) * v).toFixed(2);
}

export default function ClotureTraitementModal({
  open,
  treatmentId,
  parcelleName,
  defaultOperator,
  produitsDetail,
  onClose,
  onSaved,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [operateur, setOperateur] = useState(defaultOperator ?? "");
  const [dateReelle, setDateReelle] = useState(today);
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [produitsReels, setProduitsReels] = useState<ProduitReel[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOperateur(defaultOperator ?? "");
    setDateReelle(today);
    setHeureDebut("");
    setHeureFin("");
    setError(null);
    setProduitsReels(
      (produitsDetail ?? []).map(p => {
        const doseHl = p.dose_hl ? parseFloat(p.dose_hl) : null;
        const quantitePrevue = p.quantite_sortir ? parseFloat(p.quantite_sortir) : null;
        return {
          productId: p.productId,
          nomCommercial: p.nom_commercial,
          doseHl,
          quantitePrevue,
          volumePassage: "",
          quantiteReelle: p.quantite_sortir ?? "",
          unit: p.unit ?? "L",
        };
      })
    );
  }, [open, treatmentId]);

  if (!open) return null;

  function updateVolume(i: number, vol: string) {
    setProduitsReels(prev => {
      const next = [...prev];
      const p = next[i];
      const auto = calcQte(p.doseHl, vol);
      next[i] = { ...p, volumePassage: vol, quantiteReelle: auto || p.quantiteReelle };
      return next;
    });
  }

  function updateQteManuelle(i: number, val: string) {
    setProduitsReels(prev => {
      const next = [...prev];
      next[i] = { ...next[i], quantiteReelle: val };
      return next;
    });
  }

  async function submit() {
    if (!dateReelle) {
      setError("Date réelle d'application obligatoire");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const produitsPayload = produitsReels
        .filter(p => p.productId && p.quantiteReelle !== "")
        .map(p => ({
          productId: p.productId,
          quantiteReelle: parseFloat(p.quantiteReelle) || 0,
          volumeBouilliePasse: p.volumePassage ? parseFloat(p.volumePassage) : undefined,
          unit: p.unit,
        }));

      await completeTreatmentExecution(treatmentId, {
        operatorName: operateur || undefined,
        dateReelle,
        heureDebut: heureDebut || undefined,
        heureFin: heureFin || undefined,
        produitsReels: produitsPayload.length ? produitsPayload : undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la clôture");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[var(--color-adaline-ink)]">Clôturer l&apos;exécution terrain</h2>
            <p className="text-[10px] text-[#31200b]/60 mt-1">
              {parcelleName ?? "Traitement"} — passages séparés par produit
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.08]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-center gap-2 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <Tractor className="w-3.5 h-3.5 shrink-0" />
          Chaque produit est appliqué séparément. Entrez le volume bouillie réel de chaque passage — la quantité produit est calculée automatiquement.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#31200b]">Opérateur</span>
            <input
              value={operateur}
              onChange={(e) => setOperateur(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
              placeholder="Nom opérateur"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#31200b]">Date réelle *</span>
            <input
              type="date"
              value={dateReelle}
              onChange={(e) => setDateReelle(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#31200b]">Heure début</span>
            <input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#31200b]">Heure fin</span>
            <input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
          </label>
        </div>

        {/* Per-product passages */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-[#203b14] uppercase tracking-[0.15em] border-b border-[#e0e5d5] pb-2 flex items-center gap-1.5">
            <FlaskConical className="w-3 h-3" />
            Passages par produit
          </p>
          {produitsReels.length === 0 ? (
            <p className="text-[11px] text-[#31200b]/50 italic py-2">Aucun produit planifié.</p>
          ) : (
            <div className="space-y-3">
              {produitsReels.map((p, i) => {
                const autoQte = calcQte(p.doseHl, p.volumePassage);
                const isAuto = autoQte !== "" && p.quantiteReelle === autoQte;
                const diff = p.quantitePrevue !== null && p.quantiteReelle !== ""
                  ? parseFloat(p.quantiteReelle) - p.quantitePrevue
                  : null;
                return (
                  <div key={i} className="rounded-xl border border-[#e0e5d5] bg-[#f9fbf5] p-3 space-y-2">
                    {/* Product header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-[var(--color-adaline-ink)]/90">{p.nomCommercial || "—"}</p>
                        {produitsDetail?.[i]?.matiere_active && (
                          <p className="text-[9px] text-[#31200b]/50 italic">{produitsDetail[i].matiere_active}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {p.doseHl !== null && (
                          <p className="text-[9px] text-[#31200b]/50 font-mono">Dose: {p.doseHl} {p.unit}/hl</p>
                        )}
                        {p.quantitePrevue !== null && (
                          <p className="text-[9px] text-[#31200b]/50 font-mono">Prévu: {p.quantitePrevue} {p.unit}</p>
                        )}
                      </div>
                    </div>

                    {/* Volume + calculated qty */}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[9px] font-semibold uppercase tracking-widest text-[#31200b]/60">
                          Volume passage (L) — IoT
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={p.volumePassage}
                          onChange={(e) => updateVolume(i, e.target.value)}
                          placeholder="ex: 320"
                          className="glass-input w-full px-2 py-1.5 text-sm font-mono"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className={cn(
                          "text-[9px] font-semibold uppercase tracking-widest",
                          isAuto ? "text-emerald-700" : "text-[#31200b]/60"
                        )}>
                          {isAuto ? "Qté calculée ✓" : "Qté réelle"} ({p.unit})
                        </span>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={p.quantiteReelle}
                            onChange={(e) => updateQteManuelle(i, e.target.value)}
                            placeholder="0"
                            className={cn(
                              "glass-input w-full px-2 py-1.5 text-sm font-mono",
                              isAuto && "border-emerald-300 bg-emerald-50/30"
                            )}
                          />
                        </div>
                      </label>
                    </div>

                    {diff !== null && (
                      <p className={cn(
                        "text-[9px] font-mono text-right",
                        diff > 0 ? "text-amber-600" : diff < 0 ? "text-emerald-700" : "text-[#31200b]/30"
                      )}>
                        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {p.unit} vs prévu
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e0e5d5] text-sm">
            Annuler
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="flex-1 py-2.5 rounded-xl bg-[#203b14] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmer la clôture
          </button>
        </div>
      </div>
    </div>
  );
}
