"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Droplets, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { insertTreatment } from "@/lib/data-provider";
import { useParcelles, useOperators } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ScheduleTreatmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialParcelleName?: string;
  /** Présélection parcelle / sous-parcelle (UUID Supabase) */
  initialParcelleId?: string;
}

const TREATMENT_TYPES: { value: string; label: string; icon: string }[] = [
  { value: "Fongicide", label: "Fongicide", icon: "🍄" },
  { value: "Insecticide", label: "Insecticide", icon: "🐛" },
  { value: "Herbicide", label: "Herbicide", icon: "🌿" },
  { value: "Fertilisation", label: "Fertilisation", icon: "🧪" },
  { value: "Traitement foliaire", label: "Traitement foliaire", icon: "🍃" },
  { value: "Acaricide", label: "Acaricide", icon: "🕷" },
  { value: "Nématicide", label: "Nématicide", icon: "🪱" },
  { value: "Régulateur", label: "Régulateur de croissance", icon: "📏" },
  { value: "Autre", label: "Autre", icon: "📦" },
];

function resolveAreaHectares(parcelles: Parcelle[], parcelleId: string): number | undefined {
  for (const p of parcelles) {
    if (p.id === parcelleId) return p.areaHectares;
    const ch = p.children?.find((c) => c.id === parcelleId);
    if (ch) return ch.areaHectares;
  }
  return undefined;
}

export default function ScheduleTreatmentModal({
  open,
  onClose,
  onSuccess,
  initialParcelleName,
  initialParcelleId,
}: ScheduleTreatmentModalProps) {
  const { data: parcellesRaw } = useParcelles();
  const { data: operatorsRaw } = useOperators();
  const parcelles = (parcellesRaw || []) as Parcelle[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operators = (operatorsRaw || []) as any[];

  const today = new Date().toISOString().split("T")[0];

  const parcelleOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [];
    parcelles.forEach((p) => {
      opts.push({ id: p.id, label: p.name });
      p.children?.forEach((c) => opts.push({ id: c.id, label: `${p.name} / ${c.name}` }));
    });
    return opts;
  }, [parcelles]);

  const [parcelleId, setParcelleId] = useState("");
  const [type, setType] = useState(TREATMENT_TYPES[0].value);
  const [plannedDate, setPlannedDate] = useState(today);
  const [operatorName, setOperatorName] = useState("");
  const [volumeBouillie, setVolumeBouillie] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      const preset =
        initialParcelleId && parcelleOptions.some((o) => o.id === initialParcelleId)
          ? initialParcelleId
          : initialParcelleName
            ? parcelleOptions.find((o) => o.label === initialParcelleName || o.label.endsWith(` / ${initialParcelleName}`))?.id ||
              parcelleOptions.find((o) => o.label.includes(initialParcelleName))?.id ||
              ""
            : "";
      setParcelleId(preset || "");
      setType(TREATMENT_TYPES[0].value);
      setPlannedDate(today);
      setOperatorName("");
      setVolumeBouillie("");
      setNotes("");
      setStatus("idle");
      setErrorMsg("");
    }
  }, [open, initialParcelleName, initialParcelleId, today, parcelleOptions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelleId.trim()) {
      setStatus("error");
      setErrorMsg("Sélectionnez une parcelle");
      return;
    }
    if (!plannedDate) {
      setStatus("error");
      setErrorMsg("Date requise");
      return;
    }

    const opt = parcelleOptions.find((o) => o.id === parcelleId);
    if (!opt) {
      setStatus("error");
      setErrorMsg("Parcelle invalide");
      return;
    }

    setSaving(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const area = resolveAreaHectares(parcelles, parcelleId);
      await insertTreatment({
        parcelleName: opt.label,
        parcelleId,
        type,
        plannedDate,
        operatorName: operatorName || undefined,
        areaTreatedHectares: area,
        volumeBouillie: volumeBouillie ? parseFloat(volumeBouillie) : undefined,
        volumeBouillieUnit: volumeBouillie ? "L/ha" : undefined,
        notes: notes || undefined,
      });
      setStatus("success");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 " onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-stone-moss)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-adaline-ink)]/90">Planifier un traitement</h2>
              <p className="text-[11px] text-[var(--color-adaline-ink)]/40">Nouveau traitement phytosanitaire</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] text-[var(--color-adaline-ink)]/50 mb-1.5 font-medium">Parcelle *</label>
            <select
              value={parcelleId}
              onChange={(e) => setParcelleId(e.target.value)}
              className="glass-input w-full px-3 py-2.5 text-sm"
              required
            >
              <option value="">— Sélectionner —</option>
              {parcelleOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--color-adaline-ink)]/50 mb-1.5 font-medium">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm"
              >
                {TREATMENT_TYPES.map((tt) => (
                  <option key={tt.value} value={tt.value}>
                    {tt.icon} {tt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-adaline-ink)]/50 mb-1.5 font-medium">Date prévue *</label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="glass-input w-full px-3 py-2.5 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--color-adaline-ink)]/50 mb-1.5 font-medium">Opérateur</label>
            <select
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="glass-input w-full px-3 py-2.5 text-sm"
            >
              <option value="">— Non assigné —</option>
              {operators.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--color-adaline-ink)]/50 mb-1.5 font-medium">Volume de bouillie (L/ha)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={volumeBouillie}
              onChange={(e) => setVolumeBouillie(e.target.value)}
              placeholder="ex: 500"
              className="glass-input w-full px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--color-adaline-ink)]/50 mb-1.5 font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations, conditions..."
              className="glass-input w-full px-3 py-2.5 text-sm resize-none"
            />
          </div>

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/25 text-xs text-[var(--color-valley-green)]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/25 text-xs text-[var(--color-valley-green)]">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Traitement planifié avec succès
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-sm text-[var(--color-adaline-ink)]/70 hover:bg-white/[0.05] transition-colors"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || status === "success"}
              className={cn(
                "flex-1 glass-button py-2.5 text-sm font-semibold flex items-center justify-center gap-2",
                saving && "opacity-60 cursor-not-allowed"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Planification…
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Planifié
                </>
              ) : (
                <>
                  <Droplets className="w-4 h-4" /> Planifier
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
