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
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TreatmentWorkflowService } from "@/lib/services/treatment-workflow.service";
import { supabase } from "@/lib/supabase/client";
import DetectionConfirmCard from "./DetectionConfirmCard";

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
  const [pendingDetections, setPendingDetections] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { data } = await supabase
        .from("detection")
        .select("*")
        .eq("confirmation_op", "en_attente")
        .order("horodatage", { ascending: false });
      setPendingDetections(data || []);
    } catch (err) {
      console.error(err);
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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || supabaseUrl === "https://placeholder.supabase.co") {
        throw new Error("Supabase non configuré. Configurez NEXT_PUBLIC_SUPABASE_URL dans .env.local.");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/detect-disease`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey ?? "",
            "Authorization": `Bearer ${supabaseKey ?? ""}`,
          },
          body: JSON.stringify({ image_base64: image }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "model_loading") {
          setError(data.message ?? "Le modèle IA démarre. Réessayez dans 30 secondes.");
          return;
        }
        throw new Error(data.message ?? `Erreur serveur (${response.status})`);
      }

      // Map Edge Function outputs to local Vision UI predictions model
      if (data.label && typeof data.confidence === "number") {
        setResults([{ label: data.label, score: data.confidence }]);
        setEventSaved(false);
        return;
      }

      if (!data.predictions || !Array.isArray(data.predictions)) {
        throw new Error("Réponse inattendue du modèle IA.");
      }

      setResults(data.predictions);
      setEventSaved(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'analyser l'image.";
      setError(message);
      console.error("[Vision] Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 text-gray-900 bg-[#f5f5f7] min-h-screen rounded-3xl p-6 border border-gray-200">
        
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#34c759]/10 border border-[#34c759]/25 flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#34c759]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-800">Diagnostic IA Vision</h1>
              <p className="text-xs text-gray-500">Identification instantanée des maladies foliaires.</p>
            </div>
          </div>
          
          {/* Custom tab control */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
            <button
              onClick={() => setActiveSubTab("diagnostic")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "diagnostic"
                  ? "bg-[#0071e3] text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Diagnostic Photo
            </button>
            <button
              onClick={() => setActiveSubTab("validations")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "validations"
                  ? "bg-[#0071e3] text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Validations Requises
              {pendingDetections.length > 0 && (
                <span className="bg-red-500 text-white font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingDetections.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeSubTab === "diagnostic" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-200">
            {/* Left Column: Upload */}
            <div className="space-y-6">
              <div 
                className={cn(
                  "relative aspect-square rounded-[32px] border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center overflow-hidden transition-all shadow-sm",
                  image && "border-solid border-[#34c759]/40 bg-[#34c759]/5"
                )}
              >
                {image ? (
                  <>
                    <img src={image} alt="Upload" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold shadow-lg"
                      >
                        Changer
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center p-8 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-[#f5f5f7] flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-[#34c759]" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Prendre ou charger une photo</h3>
                    <p className="text-xs text-gray-400 mb-6 max-w-[240px]">
                      Prenez une photo nette d&apos;une feuille affectée pour un diagnostic précis.
                    </p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-[#0071e3] text-white text-xs font-bold shadow-sm hover:bg-[#0071e3]/90 transition-all cursor-pointer"
                    >
                      Sélectionner l&apos;image
                    </button>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>

              {image && !results && (
                <button 
                  onClick={analyzeImage}
                  disabled={analyzing}
                  className="w-full py-3.5 rounded-2xl bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs"
                >
                  {analyzing ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-amber-300" />
                      Lancer le diagnostic
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right Column: Results */}
            <div className="space-y-6">
              {!results && !analyzing && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center border border-gray-200 bg-white rounded-[32px] border-dashed shadow-xs">
                  <Search className="w-10 h-10 text-gray-300 mb-4" />
                  <p className="text-xs text-gray-400 font-medium">
                    Les résultats d&apos;analyse apparaîtront ici après le chargement de l&apos;image.
                  </p>
                </div>
              )}

              {analyzing && (
                <div className="space-y-4">
                  <div className="h-12 w-full bg-white border border-gray-100 animate-pulse rounded-xl" />
                  <div className="h-32 w-full bg-white border border-gray-100 animate-pulse rounded-xl" />
                </div>
              )}

              {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-6 rounded-[32px] border border-gray-200 bg-white shadow-xs mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Diagnostic AI</h3>
                    
                    <div className="space-y-4">
                      {results.slice(0, 3).map((res, i) => (
                        <div key={res.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm font-bold capitalize",
                              i === 0 ? "text-gray-800" : "text-gray-500"
                            )}>
                              {res.label.split("__").pop()?.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-black font-mono">
                              {Math.round(res.score * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                i === 0 ? "bg-[#34c759]" : "bg-gray-400"
                              )}
                              style={{ width: `${res.score * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 rounded-[32px] border border-[#34c759]/20 bg-white shadow-xs">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#34c759]/10 flex items-center justify-center border border-[#34c759]/20">
                        <CheckCircle2 className="w-5 h-5 text-[#34c759]" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm">Recommandation</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Le diagnostic indique une forte probabilité de <strong>{results[0].label.split("__").pop()?.replace(/_/g, " ")}</strong>. 
                      Nous recommandons d&apos;isoler la zone et de prévoir un traitement ciblé.
                    </p>
                    <button 
                      onClick={async () => {
                        setSavingEvent(true);
                        try {
                          await TreatmentWorkflowService.createDiseaseEventFromVision(results[0]);
                          setEventSaved(true);
                        } catch (err) {
                          alert("Erreur lors de l'enregistrement de l'évènement.");
                        } finally {
                          setSavingEvent(false);
                        }
                      }}
                      disabled={savingEvent || eventSaved}
                      className="mt-4 flex items-center justify-between w-full p-2.5 rounded-xl bg-white border border-[#34c759]/30 text-[#34c759] font-bold text-xs hover:bg-[#34c759]/5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {eventSaved ? "Évènement enregistré avec succès" : savingEvent ? "Enregistrement..." : "Enregistrer comme évènement maladie"}
                      {!eventSaved && !savingEvent && <Plus className="w-4 h-4" />}
                      {eventSaved && <CheckCircle2 className="w-4 h-4 text-[#34c759]" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50 flex items-center gap-3 text-red-600 font-semibold text-xs">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-bold">{error}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            {loadingPending ? (
              <div className="flex flex-col items-center justify-center p-16 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
                <span className="text-xs text-gray-400">Chargement des validations en attente...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {pendingDetections.map(det => (
                  <DetectionConfirmCard
                    key={det.id}
                    detection={det}
                    onActionComplete={loadPending}
                  />
                ))}

                {pendingDetections.length === 0 && (
                  <div className="col-span-full bg-white rounded-2xl border border-gray-200/80 p-12 text-center flex flex-col items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-10 h-10 text-[#34c759] mb-3" />
                    <h3 className="text-base font-bold text-gray-800">Aucune validation requise</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Toutes les détections de caméras IoT ont été traitées par l'équipe.
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
