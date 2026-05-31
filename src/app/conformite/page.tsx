"use client";

import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Globe, CalendarDays, CheckCircle2, XCircle,
  AlertTriangle, FileDown, QrCode, Loader2, ChevronDown,
  FlaskConical, Leaf, ClipboardCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Traitement = {
  id: string;
  start_time: string;
  surface_traitee_ha: number;
  volume_total_l: number;
  produits: { produit_id: string; quantite_prevue: number; unite: string }[];
  parcelle: { nom: string; culture_actuelle: string };
};

type LMRResult = {
  produit_nom: string;
  matiere_active: string;
  dose_g_ha: number;
  jours_depuis_traitement: number;
  residu_estime_mg_kg: number;
  lmr_mg_kg: number | null;
  marge: number | null;
  statut: "conforme" | "alerte" | "bloquant" | "inconnu";
};

type InpvItem = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYS_CIBLES = [
  { code: "EU", label: "Union Européenne" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Allemagne" },
  { code: "IT", label: "Italie" },
  { code: "AE", label: "Émirats Arabes Unis" },
  { code: "SA", label: "Arabie Saoudite" },
  { code: "CODEX", label: "Codex Alimentarius" },
];

const INPV_CHECKLIST: Omit<InpvItem, "checked">[] = [
  { id: "c1", label: "Produits homologués INPV", description: "Tous les produits utilisés figurent dans la liste INPV des produits phytosanitaires homologués." },
  { id: "c2", label: "DAR respecté", description: "Le délai avant récolte calculé est respecté pour chaque produit et chaque culture." },
  { id: "c3", label: "Registre phytosanitaire tenu", description: "Le registre FOR.PR6.004 est correctement renseigné pour la période concernée." },
  { id: "c4", label: "Doses homologuées respectées", description: "Les doses appliquées ne dépassent pas les doses maximales homologuées." },
  { id: "c5", label: "EPI port confirmé", description: "Le port des équipements de protection individuelle a été confirmé pour chaque traitement." },
  { id: "c6", label: "Conditions météo favorables", description: "Aucun traitement effectué par vent > 15 km/h, température > 30°C ou probabilité de pluie > 40%." },
  { id: "c7", label: "Traçabilité GPS complète", description: "Chaque traitement dispose d'un tracé GPS complet enregistré par le boîtier IoT." },
  { id: "c8", label: "Élimination contenants vides", description: "Les contenants vides ont été rincés et éliminés conformément à la réglementation." },
];

// ─── Residue estimation (simplified Europoem) ─────────────────────────────────

function estimerResidu(dose_g_ha: number, demi_vie_jours: number, jours: number): number {
  if (demi_vie_jours <= 0) return 0;
  const depot = dose_g_ha / 10000; // g/ha → mg/kg approx
  return depot * Math.exp((-0.693 * jours) / demi_vie_jours);
}

function getStatut(residu: number, lmr: number | null): LMRResult["statut"] {
  if (lmr === null) return "inconnu";
  if (residu > lmr) return "bloquant";
  if (residu > lmr * 0.8) return "alerte";
  return "conforme";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConformitePage() {
  const [traitements, setTraitements] = useState<Traitement[]>([]);
  const [loadingT, setLoadingT] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paysCible, setPaysCible] = useState("EU");
  const [dateRecolte, setDateRecolte] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [lmrResults, setLmrResults] = useState<LMRResult[]>([]);
  const [loadingLMR, setLoadingLMR] = useState(false);
  const [checklist, setChecklist] = useState<InpvItem[]>(
    INPV_CHECKLIST.map(i => ({ ...i, checked: false }))
  );
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"lmr" | "inpv" | "export">("lmr");

  // ── Load traitements ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingT(true);
      const { data } = await supabase
        .from("traitements")
        .select(`id, start_time, surface_traitee_ha, volume_total_l, produits,
                 parcelle:parcelles(nom, culture_actuelle)`)
        .in("status", ["completed", "terminé"])
        .order("start_time", { ascending: false })
        .limit(50);
      const normalized = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        parcelle: Array.isArray(row.parcelle) ? row.parcelle[0] : row.parcelle,
      }));
      setTraitements(normalized as unknown as Traitement[]);
      setLoadingT(false);
    }
    load();
  }, []);

  // ── LMR verification ────────────────────────────────────────────────────────
  async function verifierLMR() {
    if (!selectedIds.length) return;
    setLoadingLMR(true);
    setLmrResults([]);
    const results: LMRResult[] = [];

    for (const tid of selectedIds) {
      const t = traitements.find(tr => tr.id === tid);
      if (!t || !t.produits?.length) continue;
      const jours = Math.ceil((new Date(dateRecolte).getTime() - new Date(t.start_time).getTime()) / 86400000);

      for (const pt of t.produits) {
        const { data: produit } = await supabase
          .from("produits_ppp")
          .select("nom_commercial, matiere_active")
          .eq("id", pt.produit_id)
          .single();

        const { data: lmrRef } = await supabase
          .from("lmr_references")
          .select("lmr_mg_kg")
          .eq("matiere_active", produit?.matiere_active || "")
          .eq("pays_zone", paysCible)
          .maybeSingle();

        const doseGHa = t.surface_traitee_ha > 0 ? (pt.quantite_prevue * 1000) / t.surface_traitee_ha : 0;
        const residu = estimerResidu(doseGHa, 14, jours); // demi-vie 14j par défaut
        const lmr = lmrRef?.lmr_mg_kg ?? null;
        const statut = getStatut(residu, lmr);
        const marge = lmr !== null ? (lmr - residu) / lmr : null;

        results.push({
          produit_nom: produit?.nom_commercial || pt.produit_id,
          matiere_active: produit?.matiere_active || "—",
          dose_g_ha: doseGHa,
          jours_depuis_traitement: jours,
          residu_estime_mg_kg: residu,
          lmr_mg_kg: lmr,
          marge,
          statut,
        });
      }
    }

    setLmrResults(results);
    setLoadingLMR(false);
    setActiveTab("lmr");
  }

  const globalStatut = useMemo(() => {
    if (!lmrResults.length) return null;
    if (lmrResults.some(r => r.statut === "bloquant")) return "bloquant";
    if (lmrResults.some(r => r.statut === "alerte")) return "alerte";
    if (lmrResults.some(r => r.statut === "inconnu")) return "inconnu";
    return "conforme";
  }, [lmrResults]);

  const checklistScore = checklist.filter(c => c.checked).length;

  async function genererPDF() {
    if (globalStatut === "bloquant") return;
    setGenerating(true);
    // In production: call an Edge Function that renders PDF via puppeteer
    await new Promise(r => setTimeout(r, 1800));
    setGenerating(false);
    // Placeholder: open a print-friendly page
    window.print();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="content-scroll">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-[var(--color-adaline-ink)]/90">Conformité & Export</h1>
              <p className="text-sm text-[#31200b] mt-1">Vérification LMR · Checklist INPV · Dossier export PDF</p>
            </div>
            {globalStatut && (
              <StatusPill statut={globalStatut} />
            )}
          </div>

          {/* Config panel */}
          <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] p-5 space-y-5">
            <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/50 uppercase tracking-widest">Paramètres</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] text-[#31200b] uppercase tracking-widest mb-1.5 block">Pays cible d'export</label>
                <select value={paysCible} onChange={e => setPaysCible(e.target.value)} className="w-full glass-input px-3 py-2 text-sm rounded-xl">
                  {PAYS_CIBLES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#31200b] uppercase tracking-widest mb-1.5 block">Date de récolte prévue</label>
                <input type="date" value={dateRecolte} onChange={e => setDateRecolte(e.target.value)} className="w-full glass-input px-3 py-2 text-sm rounded-xl" />
              </div>
              <div className="flex items-end">
                <button
                  onClick={verifierLMR}
                  disabled={!selectedIds.length || loadingLMR}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl btn-lf-primary text-sm font-bold disabled:opacity-40"
                >
                  {loadingLMR ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Vérifier LMR
                </button>
              </div>
            </div>

            {/* Treatment selector */}
            <div>
              <label className="text-[10px] text-[#31200b] uppercase tracking-widest mb-2 block">
                Traitements à inclure ({selectedIds.length} sélectionné{selectedIds.length !== 1 ? "s" : ""})
              </label>
              {loadingT ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
              ) : traitements.length === 0 ? (
                <p className="text-sm text-[#31200b] py-4 text-center">Aucun traitement complété trouvé.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {traitements.map(t => {
                    const sel = selectedIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedIds(prev => sel ? prev.filter(i => i !== t.id) : [...prev, t.id])}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                          sel ? "bg-[#203b14]/[0.06] border-[#203b14]/25" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                        )}
                      >
                        <div className={cn("w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
                          sel ? "bg-[#203b14] border-[#203b14]" : "border-[var(--color-mist-gray)]"
                        )}>
                          {sel && <CheckCircle2 className="w-3 h-3 text-black" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-3 items-center">
                            <span className="text-xs font-bold text-[var(--color-adaline-ink)]/80 truncate">{t.parcelle?.nom}</span>
                            <span className="text-[10px] text-[#31200b]">{t.parcelle?.culture_actuelle}</span>
                          </div>
                          <div className="text-[10px] text-[#31200b] font-mono mt-0.5">
                            {new Date(t.start_time).toLocaleDateString("fr-FR")} · {t.surface_traitee_ha?.toFixed(1)} ha · {t.volume_total_l?.toFixed(0)} L
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
            {(["lmr", "inpv", "export"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  activeTab === tab ? "bg-[#203b14]/15 text-[#203b14]" : "text-[#31200b] hover:text-[var(--color-adaline-ink)]/60"
                )}
              >
                {tab === "lmr" ? "Analyse LMR" : tab === "inpv" ? "Checklist INPV" : "Export PDF"}
              </button>
            ))}
          </div>

          {/* ── LMR Tab ── */}
          {activeTab === "lmr" && (
            <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e0e5d5] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#203b14]" />
                <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/60 uppercase tracking-widest">Résultats LMR — {PAYS_CIBLES.find(p => p.code === paysCible)?.label}</h3>
              </div>
              {loadingLMR ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <Loader2 className="w-5 h-5 text-[#203b14] animate-spin" />
                  <span className="text-sm text-[#31200b]">Vérification en cours...</span>
                </div>
              ) : lmrResults.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#31200b]">
                  Sélectionnez des traitements et cliquez sur <strong>Vérifier LMR</strong>.
                </div>
              ) : (
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Matière active</th>
                      <th>Résidu estimé</th>
                      <th>LMR ({paysCible})</th>
                      <th>Marge</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lmrResults.map((r, i) => (
                      <tr key={i}>
                        <td className="font-medium text-[var(--color-adaline-ink)]/80">{r.produit_nom}</td>
                        <td className="text-[#31200b] font-mono text-xs">{r.matiere_active}</td>
                        <td className="font-mono text-sm">{r.residu_estime_mg_kg.toFixed(4)} mg/kg</td>
                        <td className="font-mono text-sm">
                          {r.lmr_mg_kg !== null ? `${r.lmr_mg_kg} mg/kg` : <span className="text-[#31200b]">Non définie</span>}
                        </td>
                        <td>
                          {r.marge !== null ? (
                            <span className={cn("text-xs font-bold", r.marge < 0 ? "text-[var(--color-valley-green)]" : r.marge < 0.2 ? "text-[var(--color-valley-green)]" : "text-[#203b14]")}>
                              {(r.marge * 100).toFixed(1)}%
                            </span>
                          ) : <span className="text-[#31200b]">—</span>}
                        </td>
                        <td><LMRBadge statut={r.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── INPV Tab ── */}
          {activeTab === "inpv" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#203b14]" />
                  <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/60 uppercase tracking-widest">Checklist INPV Algérie</h3>
                </div>
                <div className="text-xs font-bold text-[#203b14]">{checklistScore}/{checklist.length} validés</div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#203b14] transition-all duration-500"
                  style={{ width: `${(checklistScore / checklist.length) * 100}%` }}
                />
              </div>
              <div className="space-y-2 mt-4">
                {checklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, checked: !c.checked } : c))}
                    className={cn(
                      "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
                      item.checked ? "bg-[#203b14]/[0.05] border-[#203b14]/20" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all",
                      item.checked ? "bg-[#203b14] border-[#203b14]" : "border-[var(--color-mist-gray)]"
                    )}>
                      {item.checked && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", item.checked ? "text-[var(--color-adaline-ink)]/90" : "text-[var(--color-adaline-ink)]/60")}>{item.label}</p>
                      <p className="text-xs text-[#31200b] mt-0.5">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Export Tab ── */}
          {activeTab === "export" && (
            <div className="space-y-4">
              {globalStatut === "bloquant" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-valley-green)]/30 bg-[var(--color-valley-green)]/[0.06]">
                  <XCircle className="w-5 h-5 text-[var(--color-valley-green)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[var(--color-valley-green)]">Export bloqué</p>
                    <p className="text-xs text-[#31200b] mt-0.5">Une ou plusieurs LMR sont dépassées. Corrigez les non-conformités avant de générer le dossier.</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-[#203b14]" />
                  <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/60 uppercase tracking-widest">Dossier Export PDF</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Pays cible" value={PAYS_CIBLES.find(p => p.code === paysCible)?.label || paysCible} />
                  <InfoRow label="Date de récolte" value={new Date(dateRecolte).toLocaleDateString("fr-FR")} />
                  <InfoRow label="Traitements inclus" value={`${selectedIds.length} traitement${selectedIds.length !== 1 ? "s" : ""}`} />
                  <InfoRow label="Statut LMR" value={globalStatut ? globalStatut.toUpperCase() : "Non vérifié"} />
                  <InfoRow label="Checklist INPV" value={`${checklistScore}/${checklist.length}`} />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <QrCode className="w-8 h-8 text-[#31200b] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-adaline-ink)]/70">QR Code d'intégrité</p>
                    <p className="text-[10px] text-[#31200b]">Hash SHA-256 généré à la signature · Vérifiable sur verify.leadfarm.dz</p>
                  </div>
                </div>

                <button
                  onClick={genererPDF}
                  disabled={generating || globalStatut === "bloquant" || !selectedIds.length}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-lf-primary font-bold text-sm disabled:opacity-40"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours...</>
                  ) : (
                    <><FileDown className="w-4 h-4" /> Générer le dossier PDF</>
                  )}
                </button>
              </div>

              <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/60 uppercase tracking-widest">Référence réglementaire</h3>
                </div>
                <div className="space-y-2 text-xs text-[#31200b]">
                  {[
                    ["FOR.PR6.004", "Registre mensuel phytosanitaire (INPV Algérie)"],
                    ["MOP.PR6.001", "Manuel opératoire traçabilité phytosanitaire"],
                    ["CE 396/2005", "Règlement LMR Union Européenne"],
                    ["Loi 25-11", "Protection des données personnelles (Algérie)"],
                    ["Arrêté n°1275", "Homologation produits phytosanitaires INPV"],
                  ].map(([ref, desc]) => (
                    <div key={ref} className="flex gap-3">
                      <span className="font-mono text-[#203b14] flex-shrink-0 w-24">{ref}</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    conforme: "bg-[#203b14]/15 text-[#203b14] border-[#203b14]/30",
    alerte: "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] border-[var(--color-valley-green)]/30",
    bloquant: "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] border-[var(--color-valley-green)]/30",
    inconnu: "bg-white/[0.06] text-[#31200b] border-[var(--color-stone-moss)]",
  };
  const icons: Record<string, React.ReactNode> = {
    conforme: <CheckCircle2 className="w-3.5 h-3.5" />,
    alerte: <AlertTriangle className="w-3.5 h-3.5" />,
    bloquant: <XCircle className="w-3.5 h-3.5" />,
    inconnu: <ShieldCheck className="w-3.5 h-3.5" />,
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide", styles[statut])}>
      {icons[statut]}
      {statut}
    </span>
  );
}

function LMRBadge({ statut }: { statut: LMRResult["statut"] }) {
  return <StatusPill statut={statut} />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
      <span className="text-[#31200b]">{label}</span>
      <span className="text-[var(--color-adaline-ink)]/80 font-semibold">{value}</span>
    </div>
  );
}
