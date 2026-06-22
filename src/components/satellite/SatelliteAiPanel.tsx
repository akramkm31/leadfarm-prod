"use client";

import { useRef, useState } from "react";
import {
  Satellite, Upload, X, Loader2, AlertTriangle,
  Droplets, Leaf, Zap, Lightbulb, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Zone = {
  label:    string;
  ndvi:     number;
  etat:     string;
  anomalie: string | null;
};

export type SatelliteAnalysis = {
  ndvi:                   number;
  ndwi:                   number;
  evi:                    number;
  savi:                   number;
  ndre:                   number;
  etat_global:            string;
  couverture_vegetale_pct: number;
  zones:                  Zone[];
  stress_hydrique:        string;
  stress_nutritionnel:    string;
  note_fr:                string;
  action_fr:              string;
  alerte:                 string | null;
};

type Props = { onClose: () => void };

const ETAT_COLOR: Record<string, string> = {
  Excellent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Bon:       "text-teal-700 bg-teal-50 border-teal-200",
  Moyen:     "text-amber-700 bg-amber-50 border-amber-200",
  Stressé:   "text-orange-700 bg-orange-50 border-orange-200",
  Critique:  "text-red-700 bg-red-50 border-red-200",
};

const STRESS_COLOR: Record<string, string> = {
  Aucun:  "text-emerald-700 bg-emerald-50",
  Léger:  "text-amber-700 bg-amber-50",
  Modéré: "text-orange-700 bg-orange-50",
  Sévère: "text-red-700 bg-red-50",
};

const NDVI_BAR = (v: number) =>
  v >= 0.6 ? "#10b981" : v >= 0.4 ? "#84cc16" : v >= 0.2 ? "#f59e0b" : "#ef4444";

function IndexBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, ((value + 1) / 2) * 100));
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: NDVI_BAR(value) }} />
    </div>
  );
}

export default function SatelliteAiPanel({ onClose }: Props) {
  const [image,   setImage]   = useState<string | null>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [result,  setResult]  = useState<SatelliteAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(f));
    setFile(f);
    setResult(null);
    setError(null);
  };

  const analyse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res  = await fetch("/api/v1/satellite-data/analyze", { method: "POST", credentials: "include", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setResult(json.data as SatelliteAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'analyse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-[var(--green-020)] bg-[var(--green-010)]/30 p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--green-010)] border border-[var(--green-020)] flex items-center justify-center">
            <Satellite className="w-4 h-4 text-[var(--interactive-green)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Analyse IA — Claude Vision</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">NDVI · NDWI · EVI · SAVI · NDRE · zones · stress</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--black-006)] transition-colors">
          <X className="w-4 h-4 text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-colors",
          image
            ? "border-[var(--green-020)] h-52 overflow-hidden"
            : "border-[var(--green-020)] h-32 flex items-center justify-center cursor-pointer hover:border-[var(--interactive-green)] hover:bg-[var(--green-010)]/40"
        )}
        onClick={() => !image && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {image ? (
          <>
            <img src={image} alt="satellite preview" className="w-full h-full object-cover" />
            <button
              onClick={e => { e.stopPropagation(); setImage(null); setFile(null); setResult(null); setError(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center px-4">
            <Upload className="w-6 h-6 mx-auto text-[var(--interactive-green)] opacity-50 mb-1.5" />
            <p className="text-xs text-[var(--text-secondary)]">Déposer une image satellite</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Sentinel-2 · RGB · Fausses couleurs · JPG, PNG</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Alert banner */}
          {result.alerte && (
            <div className="flex items-start gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{result.alerte}
            </div>
          )}

          {/* Global state + cover */}
          <div className="flex items-center gap-3">
            <span className={cn("text-xs font-black px-3 py-1 rounded-full border", ETAT_COLOR[result.etat_global] ?? ETAT_COLOR.Moyen)}>
              {result.etat_global}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Couverture végétale : <strong>{result.couverture_vegetale_pct}%</strong>
            </span>
          </div>

          {/* Indices grid */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "NDVI", value: result.ndvi, icon: <Leaf className="w-3 h-3" /> },
              { label: "NDWI", value: result.ndwi, icon: <Droplets className="w-3 h-3" /> },
              { label: "EVI",  value: result.evi,  icon: <Leaf className="w-3 h-3" /> },
              { label: "SAVI", value: result.savi, icon: <Leaf className="w-3 h-3" /> },
              { label: "NDRE", value: result.ndre, icon: <Zap className="w-3 h-3" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl border border-[var(--black-008)] bg-[var(--surface-pure)] p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: NDVI_BAR(value) }}>{icon}</div>
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">{label}</p>
                <p className="text-sm font-black font-mono" style={{ color: NDVI_BAR(value) }}>{value.toFixed(2)}</p>
                <div className="mt-1.5"><IndexBar value={value} /></div>
              </div>
            ))}
          </div>

          {/* Stress badges */}
          <div className="flex flex-wrap gap-2">
            <div className={cn("flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full", STRESS_COLOR[result.stress_hydrique] ?? "bg-slate-100 text-slate-600")}>
              <Droplets className="w-3 h-3" />Hydrique : {result.stress_hydrique}
            </div>
            <div className={cn("flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full", STRESS_COLOR[result.stress_nutritionnel] ?? "bg-slate-100 text-slate-600")}>
              <Zap className="w-3 h-3" />Nutritionnel : {result.stress_nutritionnel}
            </div>
          </div>

          {/* Zones */}
          {result.zones?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Zones détectées</p>
              {result.zones.map((z, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--black-004)] border border-[var(--black-008)]">
                  <MapPin className="w-3 h-3 shrink-0 text-[var(--text-tertiary)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] w-20 shrink-0">{z.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: NDVI_BAR(z.ndvi) }}>{z.ndvi.toFixed(2)}</span>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", ETAT_COLOR[z.etat] ?? ETAT_COLOR.Moyen)}>{z.etat}</span>
                  {z.anomalie && <span className="text-[10px] text-[var(--text-secondary)] truncate italic">{z.anomalie}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Note + Action */}
          {result.note_fr && (
            <p className="text-xs text-[var(--text-secondary)] italic border-t border-[var(--black-008)] pt-3">
              {result.note_fr}
            </p>
          )}
          {result.action_fr && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />{result.action_fr}
            </div>
          )}
        </div>
      )}

      {/* Analyse button */}
      {image && !result && (
        <button
          disabled={loading}
          onClick={analyse}
          className="w-full py-2.5 text-xs font-bold rounded-xl bg-[var(--text-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Satellite className="w-3.5 h-3.5" />}
          {loading ? "Analyse en cours…" : "Analyser avec Claude Vision"}
        </button>
      )}
    </div>
  );
}
