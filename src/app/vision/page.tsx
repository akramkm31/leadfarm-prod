"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Camera,
  Upload,
  Search,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  RefreshCcw,
  Plus,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for AI results
interface Prediction {
  label: string;
  score: number;
}

export default function VisionPage() {
  const [activeSubTab, setActiveSubTab] = useState<"diagnostic" | "validations">("diagnostic");
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventSaved, setEventSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending detections list for operator validation
  const [pendingEvents, setPendingEvents] = useState<Array<{
    id: string;
    maladie_nom?: string;
    parcelle_name?: string;
    severite: string;
    date_observation: string;
    notes?: string | null;
  }>>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/v1/maladies?events=1", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const events = json.data?.evenements || [];
      setPendingEvents(
        events.filter((e: { source?: string }) => e.source === "IA").slice(0, 12)
      );
    } catch (err) {
      console.error(err);
      setPendingEvents([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === "validations") {
      loadPending();
    }
  }, [activeSubTab, loadPending]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        setImage(prev.target?.result as string);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/vision/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }

      if (data.predictions?.length) {
        setResults(data.predictions);
      } else if (data.label && typeof data.confidence === "number") {
        setResults([{ label: data.label, score: data.confidence }]);
      } else {
        throw new Error("Réponse inattendue du modèle IA.");
      }
      setEventSaved(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'analyser l'image.";
      setError(message);
      console.error("[Vision] Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAsDiseaseEvent = async (prediction: Prediction) => {
    setSavingEvent(true);
    try {
      const malRes = await fetch("/api/v1/maladies", { credentials: "include" });
      const malJson = await malRes.json();
      const maladies: Array<{ id: string; nom: string }> = malJson.data || [];
      const diseaseName = prediction.label.split("__").pop()?.replace(/_/g, " ") || prediction.label;
      const match =
        maladies.find((m) => m.nom.toLowerCase().includes(diseaseName.toLowerCase())) ||
        maladies[0];
      if (!match) throw new Error("Aucune maladie configurée en base");

      const res = await fetch("/api/v1/maladies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maladie_id: match.id,
          severite: prediction.score >= 0.8 ? "elevee" : "moderee",
          date_observation: new Date().toISOString().slice(0, 10),
          notes: `Diagnostic IA: ${diseaseName} (${Math.round(prediction.score * 100)}%)`,
          source: "IA",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Enregistrement échoué");
      setEventSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSavingEvent(false);
    }
  };

  const GREEN = "var(--interactive-green, #34c759)";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--surface-recessed,#e5e5ea)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: `color-mix(in srgb, ${GREEN} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${GREEN} 25%, transparent)` }}>
              <Zap className="w-4.5 h-4.5" style={{ color: GREEN }} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight text-[var(--text-primary,#1c1c1e)]">Diagnostic IA Vision</h1>
              <p className="text-[11px] text-[var(--text-secondary,#6e6e73)]">Identification des maladies foliaires · pommier uniquement</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              title={results ? "Expliquer les résultats" : "Expliquer cette page"}
              onClick={() => {
                if (results && results.length > 0) {
                  const top = results[0];
                  const pct = Math.round(top.score * 100);
                  const others = results.slice(1, 3).map(r => `${r.label} ${Math.round(r.score * 100)}%`).join(", ");
                  window.dispatchEvent(new CustomEvent("assistant:inject", { detail: { message: `[Diagnostic feuille de pommier] Résultat IA : ${top.label} à ${pct}% (autres : ${others}). Explique-moi ce résultat en 2-3 points courts avec emoji. Pour chaque point : ce que ça veut dire concrètement pour mon verger, et ce qu'il faut faire ou surveiller. Langage simple, zéro jargon, français direct.` } }));
                } else {
                  window.dispatchEvent(new CustomEvent("assistant:inject", { detail: { message: "Explique-moi la page Diagnostic IA Vision en 2-3 points courts avec emoji. Dis-moi concrètement : à quoi ça sert, comment prendre une bonne photo de feuille pour que ça marche, et ce que signifient les résultats (pourcentages de maladies). Langage simple, zéro jargon technique. Français direct." } }));
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{ color: GREEN }}
              onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${GREEN} 10%, transparent)`)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-0.5 bg-[var(--surface-recessed,#f2f2f7)] p-1 rounded-xl">
              <button
                onClick={() => setActiveSubTab("diagnostic")}
                className={`px-3 py-1.5 rounded-[9px] text-[11px] font-semibold transition-all cursor-pointer ${
                  activeSubTab === "diagnostic"
                    ? "bg-[var(--surface-pure,#fff)] text-[var(--text-primary,#1c1c1e)] shadow-sm"
                    : "text-[var(--text-secondary,#6e6e73)] hover:text-[var(--text-primary,#1c1c1e)]"
                }`}
              >
                Diagnostic Photo
              </button>
              <button
                onClick={() => setActiveSubTab("validations")}
                className={`px-3 py-1.5 rounded-[9px] text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === "validations"
                    ? "bg-[var(--surface-pure,#fff)] text-[var(--text-primary,#1c1c1e)] shadow-sm"
                    : "text-[var(--text-secondary,#6e6e73)] hover:text-[var(--text-primary,#1c1c1e)]"
                }`}
              >
                Validations Requises
                {pendingEvents.length > 0 && (
                  <span className="bg-red-500 text-white font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingEvents.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {activeSubTab === "diagnostic" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
            {/* Left: Upload */}
            <div className="space-y-4">
              <div className={cn(
                "relative aspect-square rounded-2xl border-2 border-dashed overflow-hidden transition-all",
                "bg-[var(--surface-pure,#fff)] border-[var(--surface-recessed,#e5e5ea)]",
                image && "border-solid",
              )}
              style={image ? { borderColor: `color-mix(in srgb, ${GREEN} 40%, transparent)` } : {}}>
                {image ? (
                  <>
                    <img src={image} alt="Upload" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-[var(--surface-pure,#fff)] text-[var(--text-primary,#1c1c1e)] text-xs font-bold shadow-lg">
                        Changer
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-recessed,#f2f2f7)] flex items-center justify-center mb-4">
                      <Upload className="w-7 h-7" style={{ color: GREEN }} />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary,#1c1c1e)] mb-1">Charger une photo</h3>
                    <p className="text-[11px] text-[var(--text-secondary,#6e6e73)] mb-5 max-w-[220px] leading-relaxed">
                      Photo nette d&apos;une feuille affectée pour un diagnostic précis.
                    </p>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all cursor-pointer"
                      style={{ background: GREEN }}>
                      Sélectionner l&apos;image
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>

              {image && !results && (
                <button onClick={analyzeImage} disabled={analyzing}
                  className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:opacity-60"
                  style={{ background: GREEN }}>
                  {analyzing ? <><RefreshCcw className="w-4 h-4 animate-spin" />Analyse en cours…</> : <><Zap className="w-4 h-4" />Lancer le diagnostic</>}
                </button>
              )}
            </div>

            {/* Right: Results */}
            <div className="space-y-4">
              {!results && !analyzing && (
                <div className="h-full min-h-[280px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[var(--surface-recessed,#e5e5ea)] bg-[var(--surface-pure,#fff)]">
                  <Search className="w-8 h-8 text-[var(--text-secondary,#6e6e73)]/40 mb-3" />
                  <p className="text-[11px] text-[var(--text-secondary,#6e6e73)]">
                    Les résultats apparaîtront ici après l&apos;analyse.
                  </p>
                </div>
              )}

              {analyzing && (
                <div className="space-y-3">
                  <div className="h-10 w-full bg-[var(--surface-recessed,#f2f2f7)] animate-pulse rounded-xl" />
                  <div className="h-28 w-full bg-[var(--surface-recessed,#f2f2f7)] animate-pulse rounded-xl" />
                  <div className="h-28 w-full bg-[var(--surface-recessed,#f2f2f7)] animate-pulse rounded-xl" />
                </div>
              )}

              {results && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                  {/* Scores card */}
                  <div className="rounded-2xl border border-[var(--surface-recessed,#e5e5ea)] bg-[var(--surface-pure,#fff)] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-[var(--text-secondary,#6e6e73)] uppercase tracking-widest">Diagnostic AI</span>
                      <button
                        type="button"
                        title="Expliquer les résultats"
                        onClick={() => {
                          const top = results[0];
                          const pct = Math.round(top.score * 100);
                          const others = results.slice(1, 3).map(r => `${r.label} ${Math.round(r.score * 100)}%`).join(", ");
                          window.dispatchEvent(new CustomEvent("assistant:inject", { detail: { message: `[Diagnostic feuille de pommier] Résultat IA : ${top.label} à ${pct}% (autres : ${others}). Explique-moi ce résultat en 2-3 points courts avec emoji. Pour chaque point : ce que ça veut dire concrètement pour mon verger, et ce qu'il faut faire ou surveiller. Langage simple, zéro jargon, français direct.` } }));
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: GREEN }}
                        onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${GREEN} 10%, transparent)`)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-3.5">
                      {results.slice(0, 3).map((res, i) => (
                        <div key={res.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={cn("text-[13px] font-semibold",
                              i === 0 ? "text-[var(--text-primary,#1c1c1e)]" : "text-[var(--text-secondary,#6e6e73)]")}>
                              {res.label.split("__").pop()?.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] font-bold font-mono text-[var(--text-primary,#1c1c1e)]">
                              {Math.round(res.score * 100)}%
                            </span>
                          </div>
                          <div className="h-1 w-full bg-[var(--surface-recessed,#f2f2f7)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                                 style={{ width: `${res.score * 100}%`, background: i === 0 ? GREEN : "var(--text-secondary,#6e6e73)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation card */}
                  <div className="rounded-2xl border bg-[var(--surface-pure,#fff)] p-5"
                       style={{ borderColor: `color-mix(in srgb, ${GREEN} 25%, transparent)` }}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: GREEN }} />
                      <h4 className="text-[13px] font-bold text-[var(--text-primary,#1c1c1e)]">Recommandation</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary,#6e6e73)] leading-relaxed mb-3">
                      Diagnostic : <strong className="text-[var(--text-primary,#1c1c1e)]">{results[0].label.split("__").pop()?.replace(/_/g, " ")}</strong> ({Math.round(results[0].score * 100)}%).
                      Isoler la zone et prévoir un traitement ciblé.
                    </p>
                    <button onClick={() => void saveAsDiseaseEvent(results[0])} disabled={savingEvent || eventSaved}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                      style={{ color: GREEN, borderColor: `color-mix(in srgb, ${GREEN} 30%, transparent)` }}
                      onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${GREEN} 6%, transparent)`)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {eventSaved ? "Évènement enregistré" : savingEvent ? "Enregistrement…" : "Enregistrer comme évènement maladie"}
                      {!eventSaved && !savingEvent && <Plus className="w-3.5 h-3.5" />}
                      {eventSaved && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: GREEN }} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 flex items-center gap-2.5 text-red-600 text-[11px] font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            {loadingPending ? (
              <div className="flex flex-col items-center justify-center p-16 gap-2">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: GREEN }} />
                <span className="text-[11px] text-[var(--text-secondary,#6e6e73)]">Chargement…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pendingEvents.map((ev) => (
                  <div key={ev.id} className="bg-[var(--surface-pure,#fff)] rounded-xl border border-[var(--surface-recessed,#e5e5ea)] p-4">
                    <p className="text-[12px] font-bold text-[var(--text-primary,#1c1c1e)]">{ev.maladie_nom || "Maladie IA"}</p>
                    <p className="text-[10px] text-[var(--text-secondary,#6e6e73)] mt-0.5">{ev.parcelle_name || "Parcelle non assignée"}</p>
                    <p className="text-[10px] text-[var(--text-secondary,#6e6e73)] mt-2 line-clamp-3">{ev.notes || "—"}</p>
                    <span className="inline-block mt-3 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {ev.severite}
                    </span>
                  </div>
                ))}
                {pendingEvents.length === 0 && (
                  <div className="col-span-full bg-[var(--surface-pure,#fff)] rounded-xl border border-[var(--surface-recessed,#e5e5ea)] p-12 text-center flex flex-col items-center">
                    <CheckCircle2 className="w-9 h-9 mb-3" style={{ color: GREEN }} />
                    <h3 className="text-sm font-bold text-[var(--text-primary,#1c1c1e)]">Aucune validation requise</h3>
                    <p className="text-[11px] text-[var(--text-secondary,#6e6e73)] mt-1 max-w-xs">
                      Toutes les détections de caméras IoT ont été traitées.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
