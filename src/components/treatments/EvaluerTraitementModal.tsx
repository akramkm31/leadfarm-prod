"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Star, X } from "lucide-react";
import { evaluateTreatment } from "@/lib/data-provider";

type Props = {
  open: boolean;
  treatmentId: string;
  parcelleName?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function EvaluerTraitementModal({ open, treatmentId, parcelleName, onClose, onSaved }: Props) {
  const [efficacite, setEfficacite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    if (!efficacite.trim()) {
      setError("Décrire l'efficacité observée (J+7)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await evaluateTreatment(treatmentId, efficacite.trim());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'évaluation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[var(--color-adaline-ink)]">Évaluation J+7</h2>
            <p className="text-[10px] text-[#31200b]/60 mt-1">{parcelleName ?? "Traitement"}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.08]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="space-y-1 block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#31200b]">Efficacité observée *</span>
          <input
            value={efficacite}
            onChange={(e) => setEfficacite(e.target.value)}
            placeholder="ex: Bonne — 90% réduction cochenille"
            className="glass-input w-full px-3 py-2 text-sm"
          />
        </label>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e0e5d5] text-sm">
            Annuler
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="flex-1 py-2.5 rounded-xl bg-[#203b14] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
