"use client";

import { useRef, useState } from "react";
import { Bot, Upload, X, Loader2, CheckCircle, AlertTriangle, Lightbulb, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetectResult = {
  classIdx:   number;
  name:       string;
  nameFr:     string;
  confidence: number;
  severite:   string;
  note_fr?:   string;
  action_fr?: string;
};

type Props = {
  onDetected: (result: DetectResult) => void;
  onClose:    () => void;
};

const SEV_LABEL: Record<string, string> = {
  critique: "Critique",
  elevee:   "Élevée",
  moderee:  "Modérée",
  faible:   "Faible",
};

const SEV_COLOR: Record<string, string> = {
  critique: "text-red-700 bg-red-50 border-red-200",
  elevee:   "text-orange-700 bg-orange-50 border-orange-200",
  moderee:  "text-amber-700 bg-amber-50 border-amber-200",
  faible:   "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export default function AiDetectPanel({ onDetected, onClose }: Props) {
  const [image,   setImage]   = useState<string | null>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [result,   setResult]   = useState<DetectResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [notApple, setNotApple] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(f));
    setFile(f);
    setResult(null);
    setError(null);
    setNotApple(false);
  };

  const analyse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setNotApple(false);
    try {
      const form = new FormData();
      form.append("image", file);

      const res  = await fetch("/api/v1/maladies/detect", { method: "POST", credentials: "include", body: form });
      const text = await res.text();
      const data = text.trim() ? JSON.parse(text) : {};

      if (data.notApple) { setNotApple(true); return; }
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setResult(data.data as DetectResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'analyse");
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = result?.classIdx === 4;

  return (
    <div className="glass-card border border-purple-200 bg-purple-50/20 p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-adaline-ink)]">Détection IA — Modèle ONNX</p>
            <p className="text-[10px] text-[var(--color-mist-gray)]">pommier uniquement · tavelure · rouille · pourriture noire · sain</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors">
          <X className="w-4 h-4 text-[var(--color-mist-gray)]" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-colors",
          image
            ? "border-purple-300 h-52 overflow-hidden"
            : "border-purple-200 h-32 flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50"
        )}
        onClick={() => !image && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {image ? (
          <>
            <img src={image} alt="preview" className="w-full h-full object-contain bg-white" />
            <button
              onClick={e => { e.stopPropagation(); setImage(null); setFile(null); setResult(null); setError(null); setNotApple(false); }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center px-4">
            <Upload className="w-6 h-6 mx-auto text-purple-300 mb-1.5" />
            <p className="text-xs text-[var(--color-mist-gray)]">Déposer ou cliquer pour importer</p>
            <p className="text-[10px] text-purple-400 mt-0.5">Photo de feuille · JPG, PNG, WebP</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {/* Not-apple gate */}
      {notApple && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <Apple className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-bold mb-0.5">Image non reconnue</p>
            <p>Nous détectons uniquement les maladies des <span className="font-semibold">pommiers</span>. Veuillez importer une photo de feuille de pommier (<em>Malus domestica</em>).</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl bg-white border border-purple-200 p-4 space-y-3">

          {/* Disease + confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className={cn("w-4 h-4", isHealthy ? "text-emerald-500" : "text-orange-500")} />
              <p className="text-sm font-bold text-[var(--color-adaline-ink)]">{result.nameFr}</p>
            </div>
            <span className="text-xs font-black text-purple-600">{(result.confidence * 100).toFixed(1)}%</span>
          </div>

          {/* Confidence bar */}
          <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${result.confidence * 100}%` }} />
          </div>

          {/* Severity badge */}
          {!isHealthy && (
            <span className={cn("inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full border", SEV_COLOR[result.severite] ?? SEV_COLOR.moderee)}>
              Sévérité : {SEV_LABEL[result.severite] ?? result.severite}
            </span>
          )}

          {/* Note agronomique */}
          {result.note_fr && (
            <p className="text-xs text-[var(--color-mist-gray)] italic border-t border-purple-100 pt-2.5">
              {result.note_fr}
            </p>
          )}

          {/* Recommandation */}
          {result.action_fr && !isHealthy && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
              {result.action_fr}
            </div>
          )}

          {/* CTA */}
          {!isHealthy ? (
            <button
              onClick={() => onDetected(result)}
              className="w-full py-2 text-xs font-bold rounded-xl bg-[var(--color-valley-green)] text-white hover:opacity-90 transition-opacity"
            >
              Créer une observation pour cette maladie
            </button>
          ) : (
            <p className="text-xs text-center text-emerald-600 font-semibold py-1">✓ Plante saine — aucune observation requise</p>
          )}
        </div>
      )}

      {/* Analyse button */}
      {image && !result && (
        <button
          disabled={loading}
          onClick={analyse}
          className="w-full py-2.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          {loading ? "Analyse en cours…" : "Analyser avec Claude Vision"}
        </button>
      )}
    </div>
  );
}
