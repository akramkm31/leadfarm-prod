"use client";

import { useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useParcelles, useTreatments } from "@/hooks/useData";
import { genererRegistreMensuelPDF, type RegistreEntry } from "@/lib/pdf/registreMensuel";
import { cn } from "@/lib/utils";
import {
  FileDown, Calendar, MapPin, FlaskConical, Clock, CheckCircle,
  Loader2, ChevronDown, BookOpen, TrendingUp, Layers, Users, Info
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}

function addDays(d: string, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toLocaleDateString("fr-FR");
}

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function buildEntries(treatments: any[]): RegistreEntry[] {
  return treatments
    .filter(t => ["completed","evaluated","in_progress","approved","planned","draft"].includes(t.status))
    .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())
    .map((t, i) => {
      const raw = t as any;
      const dateExec = t.executedDate || t.plannedDate || "";
      const darJ: number = raw.dar_jours || 21;
      const prodList: any[] = raw.produitsDetail?.length
        ? raw.produitsDetail
        : (t.products || []);
      const produitsStr = prodList
        .map((p: any) => p.nom_commercial || p.productName || "")
        .filter(Boolean).join(" + ") || "—";
      const dose = prodList[0]?.dose_hl
        ? `${prodList[0].dose_hl} L/hl`
        : prodList[0]?.dosePerHectare
        ? `${prodList[0].dosePerHectare} L/ha`
        : "—";
      const qteProduit = prodList
        .map((p: any) => p.quantite_sortir || (p.quantityUsed ? `${p.quantityUsed} L` : ""))
        .filter(Boolean).join(" + ") || "—";

      return {
        n: i + 1,
        date_application: fmtDate(dateExec),
        parcelle: t.parcelleName || "—",
        cible: raw.cible || "—",
        produits: produitsStr,
        dar: `${darJ} j`,
        date_recolte_permise: dateExec ? addDays(dateExec, darJ) : "—",
        quantite_melange: t.volumeBouillie ? `${t.volumeBouillie} L` : "—",
        dose,
        quantite_produit: qteProduit,
        materiel: raw.materiel || "—",
        operateurs: t.operatorName || "—",
      } satisfies RegistreEntry;
    });
}

// ── Status badge style helper ──────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  completed:  { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Terminé" },
  evaluated:  { dot: "bg-teal-500",    text: "text-teal-700",    bg: "bg-teal-500/10",    border: "border-teal-500/20",    label: "Évalué"  },
  in_progress:{ dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   label: "En cours"},
  approved:   { dot: "bg-indigo-500",  text: "text-indigo-700",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  label: "Approuvé"},
  planned:    { dot: "bg-sky-500",     text: "text-sky-700",     bg: "bg-sky-500/10",     border: "border-sky-500/20",     label: "Planifié"},
  draft:      { dot: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-500/10",   border: "border-slate-500/20",   label: "Brouillon"},
  default:    { dot: "bg-slate-500",   text: "text-slate-600",   bg: "bg-slate-500/10",   border: "border-slate-500/20",   label: "—"       },
};

// ── Main page component ────────────────────────────────────────────────────────

export default function RegistrePage() {
  const { data: treatmentsRaw, loading } = useTreatments();
  const { data: parcellesRaw } = useParcelles();
  const treatments = (treatmentsRaw || []) as any[];
  const parcelles = (parcellesRaw || []) as any[];

  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based
  const [exporting, setExporting]         = useState(false);
  const [expandedRow, setExpandedRow]     = useState<number | null>(null);

  // ── Filter treatments by selected month/year ─────────────────────────────────
  const filteredTreatments = useMemo(() => {
    return treatments.filter(t => {
      const d = new Date(t.plannedDate || t.executedDate || "");
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [treatments, selectedYear, selectedMonth]);

  const allEntries = useMemo(() => buildEntries(filteredTreatments), [filteredTreatments]);

  // ── Compute KPIs for the filtered month ──────────────────────────────────────
  const totalHa = filteredTreatments.reduce((s, t) => s + (t.areaTreatedHectares || 0), 0);
  const uniqueParcelles = new Set(filteredTreatments.map(t => t.parcelleName)).size;
  const uniqueOperateurs = new Set(filteredTreatments.map(t => t.operatorName).filter(Boolean)).size;

  // ── PDF Export action ────────────────────────────────────────────────────────
  async function exportPDF() {
    setExporting(true);
    try {
      const moisStr = `${MONTHS_FR[selectedMonth]} ${selectedYear}`;
      const blob = await genererRegistreMensuelPDF({
        site: "Domaine Khelifa",
        mois: moisStr,
        campagne: `${selectedYear - 1}-${selectedYear}`,
        entries: allEntries,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FOR.PR6.004_${moisStr.replace(" ", "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <AppLayout>
      <div className="content-scroll bg-[#fcfdfa]">
        <div className="px-6 py-8 max-w-[1400px] mx-auto space-y-6">

          {/* ── HERO HEADER CARD (Premium Glassmorphism & Flat Adaline Styling) ── */}
          <div className="relative rounded-2xl overflow-hidden border border-[var(--color-stone-moss)] bg-white/70 backdrop-blur-md shadow-sm">
            {/* Soft decorative background glow */}
            <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[var(--color-valley-green)]/[0.04] to-transparent pointer-events-none" />
            <div className="absolute -top-12 right-12 w-64 h-32 rounded-full blur-3xl bg-[var(--color-valley-green)]/10 pointer-events-none" />

            <div className="relative px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
              <div className="flex items-start sm:items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--color-stone-moss)] bg-[var(--color-forest-dew)]/20 shadow-sm shrink-0">
                  <BookOpen className="w-7 h-7 text-[var(--color-valley-green)]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <h1 className="text-xl font-extrabold text-[var(--color-adaline-ink)]/90 tracking-tight">
                      REGISTRE MENSUEL DES TRAITEMENTS
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border bg-[var(--color-stone-moss)]/30 border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/70">
                      FOR.PR6.004 · Version A
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-adaline-ink)]/50 font-medium">
                    Domaine Khelifa — Phytosanitaires — Remplissage automatique basé sur les opérations validées
                  </p>
                </div>
              </div>

              <button
                onClick={exportPDF}
                disabled={exporting || allEntries.length === 0}
                className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs shadow-[0_4px_12px_rgba(45,90,39,0.12)] hover:shadow-[0_6px_16px_rgba(45,90,39,0.2)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 transition-all duration-200 shrink-0 text-white bg-gradient-to-r from-[var(--color-valley-green)] to-emerald-600 disabled:pointer-events-none"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Télécharger PDF Officiel
              </button>
            </div>
          </div>

          {/* ── FILTER SWITCHER & SELECTORS ── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/40 p-3 rounded-2xl border border-[var(--color-stone-moss)]/60">
            {/* Month Switcher Tab Controls */}
            <div className="flex flex-wrap gap-1.5 flex-1">
              {MONTHS_FR.map((m, i) => {
                const isSelected = i === selectedMonth;
                const count = treatments.filter(t => {
                  const d = new Date(t.plannedDate || t.executedDate || "");
                  return d.getFullYear() === selectedYear && d.getMonth() === i;
                }).length;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedMonth(i); setExpandedRow(null); }}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border relative flex items-center gap-1.5",
                      isSelected
                        ? "bg-[var(--color-valley-green)] border-[var(--color-valley-green)] text-white shadow-sm shadow-[var(--color-valley-green)]/15"
                        : "bg-white border-[var(--color-mist-gray)]/60 text-[var(--color-adaline-ink)]/60 hover:text-[var(--color-adaline-ink)] hover:bg-[var(--color-stone-moss)]/10"
                    )}
                  >
                    {m.slice(0, 3)}
                    {count > 0 && (
                      <span className={cn(
                        "w-4.5 h-4.5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 aspect-square font-mono",
                        isSelected 
                          ? "bg-white text-[var(--color-valley-green)]" 
                          : "bg-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/70 border border-[var(--color-mist-gray)]/45"
                      )}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Year Selector Dropdown */}
            <div className="relative shrink-0 min-w-[120px]">
              <select
                value={selectedYear}
                onChange={e => { setSelectedYear(+e.target.value); setExpandedRow(null); }}
                className="w-full appearance-none bg-white border border-[var(--color-mist-gray)]/70 hover:border-[var(--color-valley-green)]/50 pl-4 pr-10 py-2.5 text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-valley-green)]/20"
                style={{ color: "var(--color-adaline-ink)" }}
              >
                {years.map(y => <option key={y} value={y}>{y} Météo</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-adaline-ink)]/40 pointer-events-none" />
            </div>
          </div>

          {/* ── KPI INDICATOR CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Layers,     label: "Interventions", value: allEntries.length,   unit: " opération(s)", color: "#10b981" },
              { icon: MapPin,     label: "Zones Actives", value: uniqueParcelles,    unit: " parcelle(s)",  color: "#06b6d4" },
              { icon: TrendingUp, label: "Surface Totale",value: totalHa.toFixed(1),   unit: " ha traités",   color: "#f59e0b" },
              { icon: Users,      label: "Main d'œuvre",  value: uniqueOperateurs,   unit: " opérateur(s)", color: "#8b5cf6" },
            ].map(({ icon: Icon, label, value, unit, color }) => (
              <div key={label} className="glass-card p-5 flex items-center gap-4 hover:border-[var(--color-valley-green)]/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-[9px] text-[var(--color-adaline-ink)]/40 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-extrabold text-[var(--color-adaline-ink)]/85 mt-0.5">
                    {value}<span className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/50 tracking-normal font-sans ml-0.5">{unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── CENTRAL DATA REGISTRY TABLE ── */}
          <div className="glass-card overflow-hidden shadow-sm border border-[var(--color-mist-gray)]/60 bg-white/70 backdrop-blur-md">
            {/* Table Header Bar info */}
            <div className="px-6 py-4 border-b border-[var(--color-mist-gray)]/50 bg-[var(--color-stone-moss)]/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[var(--color-valley-green)]" />
                <span className="text-xs font-bold text-[var(--color-adaline-ink)]/85">
                  Interventions Phytosanitaires de {MONTHS_FR[selectedMonth]} {selectedYear}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--color-stone-moss)]/40 text-[var(--color-adaline-ink)]/65 font-mono">
                  Campagne {selectedYear - 1}-{selectedYear}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-adaline-ink)]/40 font-bold uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                <span>{allEntries.length} Enregistrement{allEntries.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-7 h-7 text-[var(--color-valley-green)] animate-spin" />
                <span className="text-xs text-[var(--color-adaline-ink)]/50 font-medium">Chargement des données...</span>
              </div>
            ) : allEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-zinc-300" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-adaline-ink)]/70 font-bold">Aucune opération validée ce mois</p>
                  <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-1 max-w-xs">
                    Veuillez sélectionner un autre mois ou valider des traitements depuis le registre principal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1280px]">
                  {/* Table Column Header Rows */}
                  <div className="grid text-[9px] font-bold text-[var(--color-adaline-ink)]/50 uppercase tracking-wider border-b border-[var(--color-mist-gray)]/40 bg-[var(--color-stone-moss)]/[0.02] px-6 py-3.5"
                    style={{ gridTemplateColumns: "45px 95px 1.25fr 1.25fr 1.25fr 65px 105px 85px 85px 85px 1.25fr 1.25fr 36px" }}>
                    <span>Index</span>
                    <span>Date Applic.</span>
                    <span>Parcelle</span>
                    <span>Cible Biologique</span>
                    <span>Produit Phyto.</span>
                    <span className="text-center">DAR</span>
                    <span>Harvest Permis</span>
                    <span>Vol. Bouillie</span>
                    <span>Dose Appliq.</span>
                    <span>Qté Produit</span>
                    <span>Matériel</span>
                    <span>Opérateur</span>
                    <span className="text-right" />
                  </div>

                  {/* Table Body Rows */}
                  {allEntries.map((e, idx) => {
                    const t = filteredTreatments[idx];
                    const st = t ? (STATUS_STYLE[t.status] || STATUS_STYLE.default) : STATUS_STYLE.default;
                    const isExpanded = expandedRow === idx;

                    // Dynamically resolve parcel background indicator color from data hook
                    const matchedParcelle = parcelles.find((p: any) => p.name === e.parcelle || p.children?.some((c: any) => c.name === e.parcelle));
                    const pColor = matchedParcelle?.color || "#10b981";

                    return (
                      <div key={idx} className={cn("border-b border-[var(--color-mist-gray)]/40 last:border-0", isExpanded && "bg-[var(--color-valley-green)]/[0.015]")}>
                        {/* Main Grid Row */}
                        <div
                          className={cn(
                            "grid items-center px-6 py-3.5 cursor-pointer transition-all text-xs text-[var(--color-adaline-ink)]/75",
                            isExpanded ? "bg-[var(--color-valley-green)]/[0.02]" : "hover:bg-[var(--color-valley-green)]/[0.015]"
                          )}
                          style={{ gridTemplateColumns: "45px 95px 1.25fr 1.25fr 1.25fr 65px 105px 85px 85px 85px 1.25fr 1.25fr 36px" }}
                          onClick={() => setExpandedRow(isExpanded ? null : idx)}
                        >
                          {/* index */}
                          <span className="font-mono font-bold text-[var(--color-adaline-ink)]/35 text-[11px]">
                            {String(e.n).padStart(2, "0")}
                          </span>

                          {/* date */}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/30 shrink-0" />
                            <span className="font-mono text-[var(--color-adaline-ink)]/70">{e.date_application}</span>
                          </div>

                          {/* parcelle label */}
                          <div className="flex items-center gap-2 pr-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor, boxShadow: `0 0 6px ${pColor}80` }} />
                            <span className="text-[var(--color-adaline-ink)]/80 font-bold truncate">{e.parcelle}</span>
                          </div>

                          {/* cible */}
                          <span className="text-[var(--color-adaline-ink)]/65 truncate pr-2 font-medium">{e.cible}</span>

                          {/* produits */}
                          <div className="flex items-center gap-1.5 pr-2">
                            <FlaskConical className="w-3.5 h-3.5 text-[var(--color-valley-green)]/60 shrink-0" />
                            <span className="text-[var(--color-adaline-ink)]/70 font-semibold truncate">{e.produits}</span>
                          </div>

                          {/* dar badge */}
                          <div className="flex justify-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide w-fit bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              {e.dar}
                            </span>
                          </div>

                          {/* date recolte */}
                          <span className="text-[var(--color-valley-green)] font-mono font-bold text-[10.5px]">
                            {e.date_recolte_permise}
                          </span>

                          {/* vol bouillie */}
                          <span className="font-mono text-[var(--color-adaline-ink)]/60">{e.quantite_melange}</span>

                          {/* dose */}
                          <span className="font-mono text-[var(--color-adaline-ink)]/60">{e.dose}</span>

                          {/* qte produit */}
                          <span className="text-[var(--color-adaline-ink)]/70 font-mono font-bold">{e.quantite_produit}</span>

                          {/* materiel */}
                          <span className="text-[var(--color-adaline-ink)]/60 truncate pr-2">{e.materiel}</span>

                          {/* operateur */}
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[var(--color-forest-dew)] border border-[var(--color-stone-moss)] flex items-center justify-center shrink-0">
                              <span className="text-[8px] font-black text-[var(--color-adaline-ink)]/70 uppercase">
                                {(e.operateurs || "?")[0]}
                              </span>
                            </div>
                            <span className="text-[var(--color-adaline-ink)]/70 truncate font-medium text-[11px]">{e.operateurs}</span>
                          </div>

                          {/* expand toggle chevron */}
                          <div className="flex justify-end">
                            <ChevronDown className={cn("w-4 h-4 text-[var(--color-adaline-ink)]/40 transition-all duration-300", isExpanded && "rotate-180 text-[var(--color-valley-green)]")} />
                          </div>
                        </div>

                        {/* Expanded details sheet */}
                        {isExpanded && t && (
                          <div className="px-8 py-5 border-t border-[var(--color-mist-gray)]/30 bg-[var(--color-stone-moss)]/[0.02]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                              {[
                                { label: "Culture en place",     value: (t as any).culture },
                                { label: "Variété Cultivée",     value: (t as any).variete },
                                { label: "Méthode d'Application",value: (t as any).mode_application },
                                { label: "Heure de Début",       value: (t as any).heure_debut },
                                { label: "Heure de Fin",         value: (t as any).heure_fin },
                                { label: "Quantité Totale",      value: (t as any).quantite_utilisee },
                                { label: "Nombre de Citernes",   value: (t as any).nb_citernes },
                                { label: "Bouillon par Citerne", value: (t as any).bouillon_citerne_l ? `${(t as any).bouillon_citerne_l} Litres` : null },
                                { label: "Délai de Réentrée",    value: fmtDate((t as any).date_reentree) },
                                { label: "Statut Opérationnel",  value: (
                                  <span className={cn("px-2 py-0.5 text-[9px] font-extrabold rounded-full border shrink-0 inline-block w-fit", st.text, st.bg, st.border)}>
                                    {st.label}
                                  </span>
                                )},
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white/40 border border-[var(--color-mist-gray)]/40 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
                                  <span className="text-[9px] text-[var(--color-adaline-ink)]/40 font-bold uppercase tracking-wider shrink-0">{label}</span>
                                  <span className="text-xs text-[var(--color-adaline-ink)]/75 font-bold truncate">
                                    {value || "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Signature Visa footer section */}
            {allEntries.length > 0 && (
              <div className="px-6 py-4.5 border-t border-[var(--color-mist-gray)]/50 bg-[var(--color-stone-moss)]/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--color-adaline-ink)]/50">
                  <CheckCircle className="w-4 h-4 text-[var(--color-valley-green)]" />
                  <span>Registre mis à jour en temps réel à chaque clôture d&apos;intervention.</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-[var(--color-adaline-ink)]/40 uppercase tracking-widest">VISA DU RESPONSABLE TECHNIQUE</p>
                    <div className="mt-1.5 w-44 h-px border-b border-dashed border-[var(--color-mist-gray)]" />
                  </div>
                  <Clock className="w-4 h-4 text-[var(--color-adaline-ink)]/30" />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
