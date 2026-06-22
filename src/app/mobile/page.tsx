"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { updateTreatmentStatus } from "@/lib/data-provider";
import {
  enqueueSyncJob,
  flushSyncQueue,
  getPendingJobs,
  type SyncJob,
} from "@/lib/offline/sync-queue";
import { cn } from "@/lib/utils";
import {
  ChevronRight, CheckCircle2, AlertTriangle, Droplets,
  MapPin, ClipboardList, Shield, Loader2, WifiOff, X,
  Eye, EyeOff, Play, Square,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "ordres" | "detail" | "epi" | "en_cours" | "cloture";

type Ordre = {
  id: string;
  parcelle_nom: string;
  culture: string;
  cible_maladie: string;
  date_prevue: string;
  produits: { nom: string; quantite: number; unite: string }[];
  volume_bouillie_l: number;
};

const EPI_ITEMS = [
  { id: "lunettes",    label: "Lunettes de protection",  ar: "نظارات واقية"     },
  { id: "masque",      label: "Masque respiratoire",      ar: "قناع التنفس"      },
  { id: "gants",       label: "Gants résistants",         ar: "قفازات مقاومة"    },
  { id: "combinaison", label: "Combinaison de protection",ar: "بدلة واقية"        },
  { id: "bottes",      label: "Bottes imperméables",      ar: "أحذية مطاطية"     },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobilePage() {
  const [screen, setScreen] = useState<Screen>("ordres");
  const [ordres, setOrdres] = useState<Ordre[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrdre, setSelectedOrdre] = useState<Ordre | null>(null);
  const [epiChecked, setEpiChecked] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<"fr" | "ar">("fr");
  const [online, setOnline] = useState(true);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  const isRTL = lang === "ar";

  const replayQueue = useCallback(async () => {
    const result = await flushSyncQueue(async (job: SyncJob) => {
      if (job.action !== "update_status") return false;
      try {
        await updateTreatmentStatus(job.treatmentId, job.payload.status as "completed", {
          executedDate: job.payload.executedDate as string | undefined,
          notes: job.payload.notes as string | undefined,
        });
        return true;
      } catch {
        return false;
      }
    });
    setPendingSync(getPendingJobs().length);
    return result;
  }, []);

  // Online detection + sync replay
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void replayQueue();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setOnline(navigator.onLine);
    setPendingSync(getPendingJobs().length);
    if (navigator.onLine) void replayQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [replayQueue]);

  // Timer
  useEffect(() => {
    if (!sessionStart) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [sessionStart]);

  // Load approved orders
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("treatments")
        .select("id, cible, volume_bouillie, planned_date, site_name, culture, treatment_products(quantity_used, unit, products(trade_name))")
        .in("status", ["planned", "in_progress"])
        .order("planned_date");
      setOrdres((data || []).map((r) => ({
        id: r.id as string,
        parcelle_nom: (r.site_name as string) || "—",
        culture: (r.culture as string) || "—",
        cible_maladie: (r.cible as string) || "—",
        date_prevue: (r.planned_date as string) ?? "",
        produits: ((r.treatment_products as { quantity_used?: number; unit?: string; products?: { trade_name?: string } | { trade_name?: string }[] }[]) || []).map((p) => {
          const prod = Array.isArray(p.products) ? p.products[0] : p.products;
          return {
            nom: prod?.trade_name || "Produit",
            quantite: p.quantity_used ?? 0,
            unite: p.unit ?? "L",
          };
        }),
        volume_bouillie_l: (r.volume_bouillie as number) || 0,
      })));
      setLoading(false);
    }
    load();
  }, []);

  function startTreatment() {
    if (!allEpiChecked) return; // Sécurité : ne pas démarrer si EPI incomplets
    setSessionStart(new Date());
    setScreen("en_cours");
    // Update status to in_progress + persistance EPI immédiate
    if (selectedOrdre) {
      const payload = {
        status: "in_progress" as const,
        executedDate: new Date().toISOString().slice(0, 10),
      };
      if (online) {
        void updateTreatmentStatus(selectedOrdre.id, "in_progress", {
          executedDate: payload.executedDate,
        });
      } else {
        enqueueSyncJob({
          table: "treatments",
          action: "update_status",
          treatmentId: selectedOrdre.id,
          payload,
        });
        setPendingSync(getPendingJobs().length);
      }
    }
  }

  async function completeTreatment() {
    if (!selectedOrdre) return;
    setCompleting(true);
    const payload = {
      status: "completed" as const,
      executedDate: new Date().toISOString().slice(0, 10),
      notes: `Mobile · ${elapsed}s · EPI confirmé`,
    };
    try {
      if (online) {
        await updateTreatmentStatus(selectedOrdre.id, "completed", {
          executedDate: payload.executedDate,
          notes: payload.notes,
        });
      } else {
        enqueueSyncJob({
          table: "treatments",
          action: "update_status",
          treatmentId: selectedOrdre.id,
          payload,
        });
        setPendingSync(getPendingJobs().length);
      }
      setScreen("cloture");
    } finally {
      setCompleting(false);
    }
  }

  const allEpiChecked = EPI_ITEMS.every(i => epiChecked[i.id]);
  const fmt = (s: number) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col max-w-md mx-auto relative"
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e5d5] bg-[#fbfdf6]">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", online ? "bg-[#203b14]" : "bg-[var(--color-valley-green)]")} />
          <span className="text-xs text-[#31200b]">{online ? "Connecté" : "Hors ligne"}</span>
          {!online && <WifiOff className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />}
          {pendingSync > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {pendingSync} en attente
            </span>
          )}
        </div>
        <button
          onClick={() => setLang(l => l === "fr" ? "ar" : "fr")}
          className="text-xs px-3 py-1 rounded-lg border border-[#e0e5d5] text-[#31200b] hover:text-[var(--color-adaline-ink)]/70 transition-colors"
        >
          {lang === "fr" ? "عربية" : "FR"}
        </button>
      </div>

      {/* ── SCREEN: ORDRES ── */}
      {screen === "ordres" && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div>
              <h1 className="text-2xl font-black text-[var(--color-adaline-ink)]/90">
                {lang === "ar" ? "أوامر العلاج" : "Mes Ordres"}
              </h1>
              <p className="text-sm text-[#31200b] mt-1">
                {lang === "ar" ? "الأوامر المعتمدة لليوم" : "Ordres approuvés à exécuter"}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 text-[#203b14] animate-spin" />
              </div>
            ) : ordres.length === 0 ? (
              <div className="text-center py-16 text-[#31200b]">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{lang === "ar" ? "لا توجد أوامر معتمدة" : "Aucun ordre approuvé"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ordres.map(ordre => (
                  <button
                    key={ordre.id}
                    onClick={() => { setSelectedOrdre(ordre); setScreen("detail"); }}
                    className="w-full p-5 rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] text-left flex items-center gap-4 hover:border-[#203b14]/30 transition-all active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#203b14]/10 border border-[#203b14]/20 flex items-center justify-center flex-shrink-0">
                      <Droplets className="w-6 h-6 text-[#203b14]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--color-adaline-ink)]/90 truncate">{ordre.parcelle_nom}</p>
                      <p className="text-sm text-[#31200b] truncate">{ordre.cible_maladie}</p>
                      <p className="text-xs text-[#31200b] mt-1 font-mono">
                        {new Date(ordre.date_prevue).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-adaline-ink)]/30 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SCREEN: DETAIL ── */}
      {screen === "detail" && selectedOrdre && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <button onClick={() => setScreen("ordres")} className="text-sm text-[#31200b] flex items-center gap-1">
              <ChevronRight className="w-4 h-4 rotate-180" />
              {lang === "ar" ? "رجوع" : "Retour"}
            </button>

            <div>
              <h2 className="text-xl font-black text-[var(--color-adaline-ink)]/90">{selectedOrdre.parcelle_nom}</h2>
              <p className="text-sm text-[#31200b]">{selectedOrdre.culture} · {selectedOrdre.cible_maladie}</p>
            </div>

            <InfoBlock label={lang === "ar" ? "الحجم المطلوب" : "Volume bouillie"} value={`${selectedOrdre.volume_bouillie_l} L`} />

            <div>
              <p className="text-xs text-[#31200b] uppercase tracking-widest mb-3">
                {lang === "ar" ? "المنتجات" : "Produits à utiliser"}
              </p>
              <div className="space-y-2">
                {selectedOrdre.produits.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#0D1117] border border-[#e0e5d5]">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#203b14]/15 text-[#203b14] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-sm text-[var(--color-adaline-ink)]/80">{p.nom}</span>
                    </div>
                    <span className="text-sm font-bold text-[#203b14] font-mono">{p.quantite} {p.unite}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setScreen("epi")}
              className="w-full py-4 rounded-2xl btn-lf-primary text-base font-black flex items-center justify-center gap-3"
            >
              <Shield className="w-5 h-5" />
              {lang === "ar" ? "التحقق من معدات الحماية" : "Vérifier les EPI"}
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN: EPI ── */}
      {screen === "epi" && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black text-[var(--color-adaline-ink)]/90">
                {lang === "ar" ? "معدات الحماية الشخصية" : "Équipements de Protection"}
              </h2>
              <p className="text-sm text-[#31200b] mt-1">
                {lang === "ar" ? "تحقق من ارتداء جميع معدات الحماية قبل البدء" : "Confirmez le port de tous les EPI avant de démarrer"}
              </p>
            </div>

            <div className="space-y-3">
              {EPI_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setEpiChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-2xl border transition-all active:scale-[0.99]",
                    epiChecked[item.id]
                      ? "bg-[#203b14]/[0.07] border-[#203b14]/30"
                      : "bg-[#fbfdf6] border-[#e0e5d5]"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all",
                    epiChecked[item.id] ? "bg-[#203b14] border-[#203b14]" : "border-[var(--color-mist-gray)]"
                  )}>
                    {epiChecked[item.id] && <CheckCircle2 className="w-5 h-5 text-black" />}
                  </div>
                  <div className="text-left">
                    <p className={cn("font-bold", epiChecked[item.id] ? "text-[#203b14]" : "text-[var(--color-adaline-ink)]/70")}>{item.label}</p>
                    {lang === "ar" && <p className="text-sm text-[#31200b]">{item.ar}</p>}
                  </div>
                </button>
              ))}
            </div>

            {!allEpiChecked && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-valley-green)]/[0.08] border border-[var(--color-valley-green)]/20">
                <AlertTriangle className="w-4 h-4 text-[var(--color-valley-green)] flex-shrink-0" />
                <p className="text-sm text-[var(--color-valley-green)]">
                  {lang === "ar" ? "يجب التحقق من جميع معدات الحماية" : "Confirmez tous les EPI pour continuer"}
                </p>
              </div>
            )}

            <button
              onClick={startTreatment}
              disabled={!allEpiChecked}
              className="w-full py-4 rounded-2xl btn-lf-primary text-base font-black flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              {lang === "ar" ? "بدء العلاج" : "Démarrer le traitement"}
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN: EN COURS ── */}
      {screen === "en_cours" && selectedOrdre && (
        <div className="flex-1 flex flex-col">
          {/* Live timer */}
          <div className="p-6 bg-[#203b14]/[0.05] border-b border-[#203b14]/15">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-[#203b14] animate-pulse" />
              <span className="text-sm font-bold text-[#203b14] uppercase tracking-widest">
                {lang === "ar" ? "جاري العلاج" : "Traitement en cours"}
              </span>
            </div>
            <p className="text-5xl font-black font-mono text-[var(--color-adaline-ink)]/90 tabular-nums">{fmt(elapsed)}</p>
            <p className="text-sm text-[#31200b] mt-2">{selectedOrdre.parcelle_nom} · {selectedOrdre.culture}</p>
          </div>

          <div className="flex-1 p-6 space-y-4">
            <p className="text-xs text-[#31200b] uppercase tracking-widest">
              {lang === "ar" ? "المنتجات المستخدمة" : "Produits en cours d'application"}
            </p>
            <div className="space-y-2">
              {selectedOrdre.produits.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#fbfdf6] border border-[#e0e5d5]">
                  <span className="text-sm text-[var(--color-adaline-ink)]/80">{p.nom}</span>
                  <span className="text-sm font-bold text-[#203b14] font-mono">{p.quantite} {p.unite}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <button
              onClick={completeTreatment}
              disabled={completing}
              className="w-full py-5 rounded-2xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-lg font-black flex items-center justify-center gap-3 hover:bg-[var(--color-valley-green)]/25 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {completing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Square className="w-6 h-6" />}
              {lang === "ar" ? "إنهاء العلاج" : "Terminer le traitement"}
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN: CLÔTURE ── */}
      {screen === "cloture" && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#203b14]/10 border-2 border-[#203b14]/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-[#203b14]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--color-adaline-ink)]/90">
              {lang === "ar" ? "تم العلاج بنجاح" : "Traitement clôturé"}
            </h2>
            <p className="text-[#31200b] mt-2">
              {lang === "ar" ? "تم تسجيل العلاج في قاعدة البيانات" : "Enregistré dans le registre phytosanitaire"}
            </p>
            <p className="text-[#203b14] font-mono text-xl mt-3 font-bold">{fmt(elapsed)}</p>
          </div>
          <button
            onClick={() => {
              setScreen("ordres");
              setSelectedOrdre(null);
              setEpiChecked({});
              setSessionStart(null);
              setElapsed(0);
            }}
            className="w-full py-4 rounded-2xl btn-lf-primary text-base font-bold"
          >
            {lang === "ar" ? "عودة للقائمة" : "Retour aux ordres"}
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <div className="border-t border-[#e0e5d5] bg-[#fbfdf6] px-6 py-4 flex justify-around">
        {[
          { s: "ordres" as const,  icon: ClipboardList, fr: "Ordres",    ar: "الأوامر"   },
          { s: "detail" as const,  icon: Droplets,      fr: "Détail",    ar: "التفاصيل"  },
        ].map(item => (
          <button
            key={item.s}
            onClick={() => item.s !== "detail" || selectedOrdre ? setScreen(item.s) : undefined}
            disabled={item.s === "detail" && !selectedOrdre}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors disabled:opacity-30",
              screen === item.s ? "text-[#203b14]" : "text-[#31200b]"
            )}
          >
            <item.icon className="w-5 h-5" />
            {lang === "ar" ? item.ar : item.fr}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#0D1117] border border-[#e0e5d5]">
      <p className="text-[10px] text-[#31200b] uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">{value}</p>
    </div>
  );
}
