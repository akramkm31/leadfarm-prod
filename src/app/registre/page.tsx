"use client";

import { useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useParcelles, useTreatments } from "@/hooks/useData";
import { genererRegistreMensuelPDF, type RegistreEntry } from "@/lib/pdf/registreMensuel";
import { cn } from "@/lib/utils";
import {
  FileDown, Calendar, MapPin, FlaskConical, Clock, CheckCircle,
  Loader2, ChevronDown, BookOpen, TrendingUp, Layers, Users, Info, TableIcon,
  Target, Droplets, Wrench
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
  const [exportingCsv, setExportingCsv]   = useState(false);
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

  function exportCSV() {
    setExportingCsv(true);
    try {
      const moisStr = `${MONTHS_FR[selectedMonth]}_${selectedYear}`;
      const headers = [
        "Index","Date_Application","Parcelle","Culture","Variete",
        "EPPO_Code","BBCH_Stage","Cible","Produits","N_Homologation",
        "DAR_Jours","Date_Recolte_Permise","Volume_Bouillie_L",
        "Dose","Quantite_Produit","Materiel","Operateur","Statut",
      ];
      const rows = filteredTreatments
        .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())
        .map((t, i) => {
          const raw = t as any;
          const dateExec = t.executedDate || t.plannedDate || "";
          const darJ: number = raw.dar_jours || 21;
          const prodList: any[] = raw.produitsDetail?.length ? raw.produitsDetail : (t.products || []);
          const produitsStr = prodList.map((p: any) => p.nom_commercial || p.productName || "").filter(Boolean).join("|");
          const authNums = prodList.map((p: any) => p.product_auth_number || "").filter(Boolean).join("|");
          const dose = prodList[0]?.dose_hl ? `${prodList[0].dose_hl} L/hl` : prodList[0]?.dosePerHectare ? `${prodList[0].dosePerHectare} L/ha` : "";
          const qteProduit = prodList.map((p: any) => p.quantite_sortir || (p.quantityUsed ? `${p.quantityUsed}` : "")).filter(Boolean).join("|");
          return [
            i + 1,
            dateExec,
            t.parcelleName || "",
            raw.culture || "",
            raw.variete || "",
            raw.eppo_crop_code || "",
            raw.bbch_stage || "",
            raw.cible || "",
            produitsStr,
            authNums,
            darJ,
            dateExec ? (() => { const d = new Date(dateExec); d.setDate(d.getDate() + darJ); return d.toISOString().slice(0, 10); })() : "",
            t.volumeBouillie || "",
            dose,
            qteProduit,
            raw.materiel || "",
            t.operatorName || "",
            t.status || "",
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        });
      const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FOR.PR6.004_${moisStr}_EU2023-564.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
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

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={exportCSV}
                  disabled={exportingCsv || allEntries.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs border border-[var(--color-valley-green)]/40 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/5 disabled:opacity-40 transition-all duration-200 disabled:pointer-events-none"
                >
                  {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <TableIcon className="w-4 h-4" />}
                  CSV EU 2023/564
                </button>
                <button
                  onClick={exportPDF}
                  disabled={exporting || allEntries.length === 0}
                  className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs shadow-[0_4px_12px_rgba(45,90,39,0.12)] hover:shadow-[0_6px_16px_rgba(45,90,39,0.2)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 transition-all duration-200 text-white bg-gradient-to-r from-[var(--color-valley-green)] to-emerald-600 disabled:pointer-events-none"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  PDF Officiel
                </button>
              </div>
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

          {/* ── INTERVENTIONS TIMELINE ── */}
          <div className="glass-card overflow-hidden shadow-sm border border-[var(--color-mist-gray)]/60 bg-white/70 backdrop-blur-md">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--color-mist-gray)]/50 bg-[var(--color-stone-moss)]/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[var(--color-valley-green)]" />
                <span className="text-xs font-bold text-[var(--color-adaline-ink)]/85">
                  Interventions Phytosanitaires — {MONTHS_FR[selectedMonth]} {selectedYear}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--color-stone-moss)]/40 text-[var(--color-adaline-ink)]/65 font-mono">
                  Campagne {selectedYear - 1}-{selectedYear}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-adaline-ink)]/40 font-bold uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                <span>{allEntries.length} enregistrement{allEntries.length !== 1 ? "s" : ""}</span>
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
                  <p className="text-sm text-[var(--color-adaline-ink)]/70 font-bold">Aucune opération ce mois</p>
                  <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-1 max-w-xs">
                    Sélectionnez un autre mois ou validez des traitements depuis le registre principal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-mist-gray)]/30">
                {filteredTreatments.map((t, idx) => {
                  const e = allEntries[idx];
                  if (!e) return null;
                  const st = STATUS_STYLE[t.status] || STATUS_STYLE.default;
                  const isExpanded = expandedRow === idx;
                  const raw = t as any;
                  const produits: any[] = raw.produitsDetail?.length
                    ? raw.produitsDetail
                    : (t.products || []);
                  const matchedParcelle = parcelles.find((p: any) =>
                    p.name === e.parcelle || p.children?.some((c: any) => c.name === e.parcelle)
                  );
                  const pColor = matchedParcelle?.color || "#10b981";

                  return (
                    <div key={idx} className={cn("transition-colors", isExpanded && "bg-[var(--color-valley-green)]/[0.015]")}>
                      <div className="flex gap-4 px-6 py-5">

                        {/* Left: number + timeline dot */}
                        <div className="flex flex-col items-center shrink-0 w-10 pt-1">
                          <span className="font-mono text-[9px] font-bold text-[var(--color-adaline-ink)]/30 mb-2">
                            {String(e.n).padStart(2, "0")}
                          </span>
                          <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-md shrink-0", st.dot)} />
                          {idx < filteredTreatments.length - 1 && (
                            <div className="flex-1 w-px mt-2 bg-[var(--color-mist-gray)]/40 min-h-[20px]" />
                          )}
                        </div>

                        {/* Right: card content */}
                        <div className="flex-1 min-w-0">

                          {/* Row 1: Parcelle + date + status */}
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: pColor }} />
                              <span className="text-sm font-extrabold text-[var(--color-adaline-ink)]/85 truncate">{e.parcelle}</span>
                              <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/40 shrink-0">
                                <Calendar className="w-3 h-3 inline mr-0.5 -mt-0.5" />{e.date_application}
                              </span>
                            </div>
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0", st.text, st.bg, st.border)}>
                              {st.label}
                            </span>
                          </div>

                          {/* Row 2: Cible */}
                          {e.cible !== "—" && (
                            <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-adaline-ink)]/60 mb-3">
                              <Target className="w-3 h-3 shrink-0 text-red-400" />
                              <span className="font-semibold text-[var(--color-adaline-ink)]/75">{e.cible}</span>
                            </p>
                          )}

                          {/* Row 3: Product chips */}
                          {produits.filter(p => p.nom_commercial || p.productName || p.name).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {produits
                                .filter(p => p.nom_commercial || p.productName || p.name)
                                .map((p, pi) => (
                                  <span key={pi} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--color-valley-green)]/8 text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/20">
                                    <FlaskConical className="w-2.5 h-2.5 shrink-0" />
                                    {p.nom_commercial || p.productName || p.name}
                                    {p.dose_hl && (
                                      <span className="text-[9px] opacity-60 font-semibold">{p.dose_hl} L/hl</span>
                                    )}
                                  </span>
                                ))}
                            </div>
                          )}

                          {/* Row 4: Metric pills */}
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <Clock className="w-3 h-3" />DAR {e.dar}
                            </span>
                            {e.date_recolte_permise !== "—" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3" />Récolte dès le {e.date_recolte_permise}
                              </span>
                            )}
                            {e.quantite_melange !== "—" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                <Droplets className="w-3 h-3" />{e.quantite_melange}
                              </span>
                            )}
                            {e.dose !== "—" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                                {e.dose}
                              </span>
                            )}
                            {e.materiel !== "—" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <Wrench className="w-3 h-3" />{e.materiel}
                              </span>
                            )}
                            {e.operateurs !== "—" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <div className="w-4 h-4 rounded-full bg-[var(--color-forest-dew)] border border-[var(--color-stone-moss)] flex items-center justify-center">
                                  <span className="text-[7px] font-black text-[var(--color-adaline-ink)]/70 uppercase">{(e.operateurs || "?")[0]}</span>
                                </div>
                                {e.operateurs}
                              </span>
                            )}
                          </div>

                          {/* Expand toggle */}
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : idx)}
                            className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[var(--color-adaline-ink)]/35 hover:text-[var(--color-valley-green)] transition-colors"
                          >
                            <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isExpanded && "rotate-180")} />
                            {isExpanded ? "Réduire" : "Détails complets"}
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-8 py-5 border-t border-[var(--color-mist-gray)]/30 bg-[var(--color-stone-moss)]/[0.02]">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {[
                              { label: "Culture",              value: raw.culture },
                              { label: "Variété",              value: raw.variete },
                              { label: "Code EPPO",            value: raw.eppo_crop_code },
                              { label: "Stade BBCH",           value: raw.bbch_stage },
                              { label: "Mode d'application",   value: raw.mode_application },
                              { label: "Heure début",          value: raw.heure_debut },
                              { label: "Heure fin",            value: raw.heure_fin },
                              { label: "Qté totale utilisée",  value: raw.quantite_utilisee },
                              { label: "Nb citernes",          value: raw.nb_citernes },
                              { label: "Bouillon / citerne",   value: raw.bouillon_citerne_l ? `${raw.bouillon_citerne_l} L` : null },
                              { label: "Délai réentrée",       value: fmtDate(raw.date_reentree) },
                              { label: "Statut",               value: (
                                <span className={cn("px-2 py-0.5 text-[9px] font-extrabold rounded-full border inline-block", st.text, st.bg, st.border)}>
                                  {st.label}
                                </span>
                              )},
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-white/40 border border-[var(--color-mist-gray)]/40 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
                                <span className="text-[9px] text-[var(--color-adaline-ink)]/40 font-bold uppercase tracking-wider">{label}</span>
                                <span className="text-xs text-[var(--color-adaline-ink)]/75 font-bold">{value || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {allEntries.length > 0 && (
              <div className="px-6 py-4 border-t border-[var(--color-mist-gray)]/50 bg-[var(--color-stone-moss)]/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
