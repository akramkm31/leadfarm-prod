"use client";

import {
  X, Droplets, Leaf, Sprout, Bug, Waves,
  CheckCircle2, Clock, AlertCircle, XCircle,
  Thermometer, Wind, CloudRain, FlaskConical,
  CalendarDays, User, Ruler, TreePine, Layers,
  TrendingUp, DollarSign, ExternalLink, ChevronDown, ChevronUp,
  MapPin, Beaker, BarChart3, GitBranch, Wheat, Shield,
  Package, Activity, Target, Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Parcelle } from "@/lib/mock-data";
import { getProp, STATUS_LABELS, TYPE_LABELS } from "./dashboard-map-utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  pulverisation: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <Droplets size={14} />, label: "Pulvérisation" },
  desherbage:    { color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: <Leaf     size={14} />, label: "Désherbage" },
  fertilisation: { color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", icon: <Sprout   size={14} />, label: "Fertilisation" },
  fongicide:     { color: "#991b1b", bg: "#fff1f2", border: "#fecdd3", icon: <Bug      size={14} />, label: "Fongicide" },
  irrigation:    { color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: <Waves    size={14} />, label: "Irrigation" },
};
const DEFAULT_META = TYPE_META.pulverisation;

const STATUS_META: Record<string, { cls: string; dot: string; icon: React.ReactNode }> = {
  completed:   { cls: "bg-emerald-100 text-emerald-800", dot: "#16a34a", icon: <CheckCircle2 size={10} /> },
  termine:     { cls: "bg-emerald-100 text-emerald-800", dot: "#16a34a", icon: <CheckCircle2 size={10} /> },
  in_progress: { cls: "bg-amber-100 text-amber-800",    dot: "#d97706", icon: <Clock        size={10} /> },
  en_cours:    { cls: "bg-amber-100 text-amber-800",    dot: "#d97706", icon: <Clock        size={10} /> },
  planned:     { cls: "bg-sky-100 text-sky-700",        dot: "#0284c7", icon: <AlertCircle  size={10} /> },
  planifie:    { cls: "bg-sky-100 text-sky-700",        dot: "#0284c7", icon: <AlertCircle  size={10} /> },
  cancelled:   { cls: "bg-red-100 text-red-700",        dot: "#dc2626", icon: <XCircle      size={10} /> },
  annule:      { cls: "bg-red-100 text-red-700",        dot: "#dc2626", icon: <XCircle      size={10} /> },
};
const DEFAULT_STATUS = STATUS_META.planned;

const IRRIGATION_LABELS: Record<string, string> = {
  goutte_a_goutte: "Goutte-à-goutte",
  aspersion:       "Aspersion",
  gravitaire:      "Gravitaire",
  pluvial:         "Pluvial",
  aucune:          "Aucune",
};

const CULTURE_ICON: Record<string, React.ReactNode> = {
  arboriculture: <TreePine size={13} />,
  viticulture:   <Wheat    size={13} />,
  maraichage:    <Sprout   size={13} />,
  cereales:      <Wheat    size={13} />,
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR", opts ?? { day: "numeric", month: "long", year: "numeric" }); }
  catch { return "—"; }
}
function daysFrom(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

type Tab = "historique" | "produits" | "enfants";

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParcelleOverlay({
  parcelle,
  treatments,
  onClose,
  embedded = false,
}: {
  parcelle: Parcelle;
  treatments: Record<string, unknown>[];
  onClose: () => void;
  embedded?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("historique");

  // ── Derived stats ──
  const totalCost  = treatments.reduce((a, t) => a + Number(getProp(t, "totalCostDZD", "total_cost_dzd") ?? 0), 0);
  const totalArea  = treatments.reduce((a, t) => a + Number(getProp(t, "areaTreatedHectares", "area_treated_hectares") ?? 0), 0);
  const doneCount  = treatments.filter(t => { const s = String(getProp(t,"status","status")??""); return s==="completed"||s==="termine"; }).length;
  const planCount  = treatments.filter(t => { const s = String(getProp(t,"status","status")??""); return s==="planned"||s==="planifie"; }).length;
  const inProgCount= treatments.filter(t => { const s = String(getProp(t,"status","status")??""); return s==="in_progress"||s==="en_cours"; }).length;

  const nextTreatment = useMemo(() =>
    treatments.find(t => { const s = String(getProp(t,"status","status")??""); return s==="planned"||s==="planifie"; }),
  [treatments]);

  // ── Aggregate products across all treatments ──
  const productMap = useMemo(() => {
    const map = new Map<string, {
      name: string; category: string; unit: string;
      totalQty: number; applications: number;
      totalDoseHa: number; doseCount: number;
      lastDate: string | null;
    }>();
    for (const t of treatments) {
      const rawProds = (getProp(t,"products","products") as unknown[]) ?? (getProp(t,"treatment_products","treatment_products") as unknown[]) ?? [];
      const prods = Array.isArray(rawProds) ? rawProds as Record<string,unknown>[] : [];
      const dateRaw = String(getProp(t,"plannedDate","planned_date")??"");
      for (const p of prods) {
        const nested = p.products as Record<string,unknown> | undefined;
        const name = String(p.productName ?? p.product_name ?? nested?.trade_name ?? p.tradeName ?? "Produit");
        const qty  = Number(p.quantityUsed ?? p.quantity_used ?? 0);
        const unit = String(p.unit ?? nested?.unit ?? "");
        const dph  = Number(p.dosePerHectare ?? p.dose_per_hectare ?? 0);
        const cat  = String(nested?.category ?? p.category ?? p.type ?? "");
        const key  = name.toLowerCase();
        const prev = map.get(key);
        if (prev) {
          prev.totalQty += qty;
          prev.applications += 1;
          if (dph > 0) { prev.totalDoseHa += dph; prev.doseCount += 1; }
          if (dateRaw && (!prev.lastDate || dateRaw > prev.lastDate)) prev.lastDate = dateRaw;
        } else {
          map.set(key, { name, category: cat, unit, totalQty: qty, applications: 1,
            totalDoseHa: dph > 0 ? dph : 0, doseCount: dph > 0 ? 1 : 0,
            lastDate: dateRaw || null });
        }
      }
    }
    return [...map.values()].sort((a,b) => b.applications - a.applications);
  }, [treatments]);

  const implantAge = parcelle.dateImplantation
    ? Math.floor((Date.now() - new Date(parcelle.dateImplantation).getTime()) / (365.25*24*3600*1000))
    : null;

  // ── Embedded (theater) mode ──
  if (embedded) {
    return (
      <div className="absolute inset-0 z-[1100] pointer-events-none flex justify-end p-2">
        <div
          className="pointer-events-auto flex flex-col w-full max-w-[min(100%,300px)] rounded-xl border bg-white/98 shadow-xl overflow-hidden max-h-full"
          style={{ borderColor: `${parcelle.color}40` }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b shrink-0"
               style={{ background: `${parcelle.color}12`, borderColor: `${parcelle.color}25` }}>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: parcelle.color }}>{parcelle.name}</p>
              <p className="text-[10px] text-slate-500">{parcelle.areaHectares} ha · {treatments.length} traitement(s)</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 p-1 rounded-lg hover:bg-black/5 text-slate-400">
              <X size={14} />
            </button>
          </div>
          {nextTreatment && <div className="shrink-0 px-2 pt-2"><NextBanner t={nextTreatment} /></div>}
          <div className="flex-1 min-h-0 overflow-y-auto ov-scroll px-2 py-2">
            {treatments.length === 0
              ? <p className="text-[11px] text-slate-400 text-center py-6">Aucun traitement</p>
              : treatments.slice(0, 8).map((t, i) => (
                  <TreatmentRow key={String(t.id ?? i)} t={t} index={i}
                    expanded={expandedId === String(t.id ?? i)}
                    onToggle={() => setExpandedId(p => p === String(t.id ?? i) ? null : String(t.id ?? i))}
                    isLast={i === Math.min(treatments.length, 8) - 1}
                  />
                ))
            }
          </div>
          <div className="shrink-0 px-3 py-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
            <span>{fmt(totalArea, 1)} ha traités</span>
            <a href={`/parcelles?select=${encodeURIComponent(parcelle.id)}`}
               className="font-semibold text-[var(--color-valley-green)] hover:underline inline-flex items-center gap-0.5">
              Fiche <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Full modal ──
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 cursor-pointer"
           style={{ background: "rgba(8,12,8,0.65)", backdropFilter: "blur(6px)" }}
           onClick={onClose} />

      <div
        className="relative w-full flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          maxWidth: 1100, width: "100%",
          height: "calc(100vh - 48px)", maxHeight: 900,
          background: "#fff",
          border: `1.5px solid ${parcelle.color}30`,
          animation: "ov-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes ov-in { from{opacity:0;transform:scale(0.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes row-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
          .ov-row { animation: row-in 0.16s ease forwards; opacity:0; }
          .ov-scroll::-webkit-scrollbar { width:4px; }
          .ov-scroll::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.10); border-radius:4px; }
          .ov-tab { transition: all 0.15s; }
          .ov-tab-active { border-bottom: 2px solid var(--tab-color); }
        `}</style>

        {/* ══ HEADER ══ */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg,${parcelle.color}15 0%,${parcelle.color}05 100%)`,
            borderBottom: `1.5px solid ${parcelle.color}20`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: parcelle.color + "20", border: `1.5px solid ${parcelle.color}35` }}>
              <span style={{ color: parcelle.color }}>
                {CULTURE_ICON[parcelle.cultureType ?? ""] ?? <TreePine size={18} />}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] font-black tracking-tight" style={{ color: parcelle.color }}>
                  {parcelle.name}
                </h2>
                {parcelle.variete && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: parcelle.color+"18", color: parcelle.color }}>
                    {parcelle.variete}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium flex-shrink-0">
                  {parcelle.cropType}
                </span>
                {parcelle.cultureType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium flex-shrink-0">
                    {parcelle.cultureType}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <MapPin size={10} />
                {parcelle.areaHectares} ha
                {parcelle.zone ? ` · ${parcelle.zone}` : ""}
                {parcelle.secteur ? ` · ${parcelle.secteur}` : ""}
                {parcelle.site ? ` · ${parcelle.site}` : ""}
              </p>
            </div>
          </div>

          {/* Quick links + close */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <a href={`/trace/${encodeURIComponent(parcelle.id)}`}
               className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Activity size={11} /> Traçabilité
            </a>
            <a href={`/parcelles?select=${encodeURIComponent(parcelle.id)}`}
               className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
               style={{ background: parcelle.color }}>
              <ExternalLink size={11} /> Fiche complète
            </a>
            <button type="button" onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/8 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ══ STATS STRIP ══ */}
        <div className="flex flex-shrink-0 border-b border-slate-100 bg-slate-50/60">
          {[
            { icon: <Target size={13} />,   val: treatments.length,           label: "Interventions",  color: "#334155" },
            { icon: <CheckCircle2 size={13}/>,val: doneCount,                 label: "Terminées",      color: "#16a34a" },
            { icon: <Clock size={13} />,     val: inProgCount,                label: "En cours",       color: "#d97706" },
            { icon: <AlertCircle size={13}/>,val: planCount,                  label: "Planifiées",     color: "#0284c7" },
            { icon: <Ruler size={13} />,     val: `${fmt(totalArea,1)} ha`,   label: "Surface traitée",color: "#7c3aed" },
            { icon: <Package size={13} />,   val: productMap.length,          label: "Produits utilisés",color:"#be185d" },
            ...(totalCost > 0 ? [{ icon: <DollarSign size={13}/>, val: `${fmt(totalCost/1000,0)}k DZD`, label: "Coût cumulé", color:"#b45309" }] : []),
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-2.5 px-1 border-r border-slate-100 last:border-r-0 min-w-0">
              <div className="flex items-center gap-1" style={{ color: s.color }}>
                {s.icon}
                <span className="text-[15px] font-black leading-none">{s.val}</span>
              </div>
              <span className="text-[8px] text-slate-400 font-medium text-center mt-0.5 leading-none">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ══ BODY: LEFT + RIGHT ══ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT RAIL: Identité complète ── */}
          <div className="flex-shrink-0 overflow-y-auto ov-scroll border-r border-slate-100 py-3"
               style={{ width: 252 }}>

            <SectionHead label="Identité & culture" icon={<Layers size={10} />} />
            <InfoRow icon={<Wheat size={11}/>}       label="Culture"      value={parcelle.cropType} />
            {parcelle.variete && (
              <InfoRow icon={<Sprout size={11}/>}    label="Variété"      value={parcelle.variete} />
            )}
            {parcelle.cultureType && (
              <InfoRow icon={<TreePine size={11}/>}  label="Type culture" value={parcelle.cultureType} />
            )}
            {parcelle.soilType && (
              <InfoRow icon={<Ruler size={11}/>}     label="Type de sol"  value={parcelle.soilType} />
            )}
            {parcelle.irrigation && (
              <InfoRow icon={<Droplets size={11}/>}  label="Irrigation"   value={IRRIGATION_LABELS[parcelle.irrigation] ?? parcelle.irrigation} />
            )}

            <div className="my-3 mx-3 border-t border-slate-100" />
            <SectionHead label="Plantation" icon={<CalendarDays size={10} />} />
            {parcelle.dateImplantation && (
              <InfoRow icon={<CalendarDays size={11}/>} label="Date plantation"
                value={fmtDate(parcelle.dateImplantation,{month:"short",year:"numeric"})} />
            )}
            {implantAge != null && (
              <InfoRow icon={<TrendingUp size={11}/>} label="Âge du verger" value={`${implantAge} ans`} />
            )}
            {parcelle.densitePlantation != null && (
              <InfoRow icon={<TreePine size={11}/>} label="Densité"
                value={`${parcelle.densitePlantation} ${parcelle.densiteUnit ?? "arb/ha"}`} />
            )}
            {parcelle.densitePlantation != null && (
              <InfoRow icon={<BarChart3 size={11}/>} label="Plants estimés"
                value={fmt(Math.round(parcelle.densitePlantation * parcelle.areaHectares))} />
            )}
            {parcelle.altitude != null && (
              <InfoRow icon={<TrendingUp size={11}/>} label="Altitude" value={`${parcelle.altitude} m`} />
            )}

            <div className="my-3 mx-3 border-t border-slate-100" />
            <SectionHead label="Localisation" icon={<MapPin size={10} />} />
            {parcelle.site    && <InfoRow icon={<MapPin size={11}/>}  label="Site"      value={parcelle.site} />}
            {parcelle.zone    && <InfoRow icon={<MapPin size={11}/>}  label="Zone"      value={parcelle.zone} />}
            {parcelle.secteur && <InfoRow icon={<Layers size={11}/>}  label="Secteur"   value={parcelle.secteur} />}
            <InfoRow icon={<Ruler size={11}/>} label="Superficie" value={`${parcelle.areaHectares} ha`} />
            {parcelle.center && (
              <InfoRow icon={<MapPin size={11}/>} label="GPS"
                value={`${parcelle.center[0].toFixed(4)}, ${parcelle.center[1].toFixed(4)}`} />
            )}

            {parcelle.lastTreatmentDate && (
              <>
                <div className="my-3 mx-3 border-t border-slate-100" />
                <SectionHead label="Activité" icon={<Activity size={10} />} />
                <InfoRow icon={<CalendarDays size={11}/>} label="Dernier traitement"
                  value={fmtDate(parcelle.lastTreatmentDate,{day:"numeric",month:"short"})} />
              </>
            )}

            {parcelle.observations && (
              <>
                <div className="my-3 mx-3 border-t border-slate-100" />
                <SectionHead label="Observations" icon={<AlertCircle size={10} />} />
                <p className="text-[10px] text-slate-500 leading-relaxed px-3 pb-2">{parcelle.observations}</p>
              </>
            )}

            {/* Sub-parcelles quick count */}
            {(parcelle.children?.length ?? 0) > 0 && (
              <>
                <div className="my-3 mx-3 border-t border-slate-100" />
                <SectionHead label="Sous-parcelles" icon={<GitBranch size={10} />} />
                {parcelle.children!.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-700 truncate">{c.name}</p>
                      <p className="text-[9px] text-slate-400">{c.areaHectares} ha · {c.cropType}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Links mobile */}
            <div className="px-3 mt-4 flex flex-col gap-1.5 sm:hidden">
              <a href={`/parcelles?select=${encodeURIComponent(parcelle.id)}`}
                 className="flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-lg text-white hover:opacity-90"
                 style={{ background: parcelle.color }}>
                Fiche Parcelle <ExternalLink size={9} />
              </a>
              <a href={`/trace/${encodeURIComponent(parcelle.id)}`}
                 className="flex items-center justify-center gap-1.5 text-[10px] font-semibold py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Traçabilité <ExternalLink size={9} />
              </a>
            </div>
          </div>

          {/* ── RIGHT: Tabs ── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {/* Next treatment banner */}
            {nextTreatment && (
              <div className="flex-shrink-0 px-4 pt-3 pb-0">
                <NextBanner t={nextTreatment} />
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-slate-100 flex-shrink-0 px-4 mt-2"
                 style={{ "--tab-color": parcelle.color } as React.CSSProperties}>
              {([
                { id: "historique", label: "Historique interventions", icon: <Activity size={11} />, count: treatments.length },
                { id: "produits",   label: "Produits utilisés",        icon: <Beaker   size={11} />, count: productMap.length },
                { id: "enfants",    label: "Sous-parcelles",           icon: <GitBranch size={11}/>, count: parcelle.children?.length ?? 0 },
              ] as { id: Tab; label: string; icon: React.ReactNode; count: number }[]).map(t => (
                <button key={t.id} type="button"
                  onClick={() => setTab(t.id)}
                  className={`ov-tab flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold transition-colors ${
                    tab === t.id ? "text-slate-800 border-b-2" : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
                  }`}
                  style={tab === t.id ? { borderBottomColor: parcelle.color } : {}}
                >
                  <span style={tab === t.id ? { color: parcelle.color } : {}}>{t.icon}</span>
                  {t.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "text-white" : "bg-slate-100 text-slate-500"}`}
                        style={tab === t.id ? { background: parcelle.color } : {}}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto ov-scroll">

              {/* ── TAB: Historique ── */}
              {tab === "historique" && (
                <div className="px-3 pb-4 pt-1">
                  {treatments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                      <Leaf size={28} className="text-slate-200" />
                      <p className="text-[11px] text-slate-400 text-center">
                        Aucune intervention enregistrée<br />pour cette parcelle
                      </p>
                    </div>
                  ) : treatments.map((t, i) => (
                    <TreatmentRow key={String(t.id ?? i)} t={t} index={i}
                      expanded={expandedId === String(t.id ?? i)}
                      onToggle={() => setExpandedId(p => p === String(t.id ?? i) ? null : String(t.id ?? i))}
                      isLast={i === treatments.length - 1}
                    />
                  ))}
                </div>
              )}

              {/* ── TAB: Produits agrégés ── */}
              {tab === "produits" && (
                <div className="p-4">
                  {productMap.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                      <FlaskConical size={28} className="text-slate-200" />
                      <p className="text-[11px] text-slate-400 text-center">
                        Aucun produit enregistré
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                        <Shield size={10} /> Inventaire phytosanitaire — tous traitements confondus
                      </p>
                      <div className="grid gap-3">
                        {productMap.map((prod, i) => {
                          const avgDose = prod.doseCount > 0 ? prod.totalDoseHa / prod.doseCount : 0;
                          const barPct = Math.min(100, (prod.applications / Math.max(...productMap.map(p => p.applications))) * 100);
                          return (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 hover:border-slate-200 transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[12px] font-black text-slate-800">{prod.name}</p>
                                    {prod.category && (
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">
                                        {prod.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Dernière utilisation : {fmtDate(prod.lastDate, {day:"numeric",month:"short",year:"numeric"})}
                                  </p>
                                </div>
                                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                  <span className="text-[18px] font-black text-slate-800 leading-none">
                                    {prod.applications}
                                  </span>
                                  <span className="text-[8.5px] text-slate-400 font-medium">application{prod.applications > 1 ? "s" : ""}</span>
                                </div>
                              </div>

                              {/* Usage bar */}
                              <div className="h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                     style={{ width: `${barPct}%`, background: parcelle.color }} />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <ProdStat label="Qté totale"
                                  value={`${fmt(prod.totalQty, 1)} ${prod.unit}`} />
                                <ProdStat label="Dose moy/ha"
                                  value={avgDose > 0 ? `${fmt(avgDose, 2)} ${prod.unit}/ha` : "—"} />
                                <ProdStat label="Applications"
                                  value={String(prod.applications)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary table */}
                      <div className="mt-5 rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Tableau récapitulatif
                          </p>
                        </div>
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-slate-100">
                              {["Produit","Catégorie","Total utilisé","Dose moy/ha","Applications","Dernière date"].map(h => (
                                <th key={h} className="text-left px-3 py-2 font-semibold text-slate-400 text-[9px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {productMap.map((prod, i) => {
                              const avgDose = prod.doseCount > 0 ? prod.totalDoseHa / prod.doseCount : 0;
                              return (
                                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-semibold text-slate-800">{prod.name}</td>
                                  <td className="px-3 py-2 text-slate-500">{prod.category || "—"}</td>
                                  <td className="px-3 py-2 font-mono text-slate-700">{fmt(prod.totalQty,1)} {prod.unit}</td>
                                  <td className="px-3 py-2 font-mono text-slate-600">{avgDose > 0 ? `${fmt(avgDose,2)} ${prod.unit}/ha` : "—"}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="font-bold text-slate-800">{prod.applications}</span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">{fmtDate(prod.lastDate,{day:"numeric",month:"short",year:"numeric"})}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: Sous-parcelles ── */}
              {tab === "enfants" && (
                <div className="p-4">
                  {(parcelle.children?.length ?? 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                      <GitBranch size={28} className="text-slate-200" />
                      <p className="text-[11px] text-slate-400 text-center">Aucune sous-parcelle définie</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {parcelle.children!.map(child => (
                        <a key={child.id}
                           href={`/trace/${encodeURIComponent(child.id)}`}
                           className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors group">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                               style={{ background: child.color+"18", border:`1.5px solid ${child.color}30` }}>
                            <div className="w-3 h-3 rounded-full" style={{ background: child.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[13px] font-bold text-slate-800">{child.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {child.areaHectares} ha · {child.cropType}
                                  {child.variete ? ` · ${child.variete}` : ""}
                                </p>
                              </div>
                              <span className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1">
                                <ExternalLink size={12} />
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                              {[
                                { label: "Sol",       val: child.soilType  || "—" },
                                { label: "Secteur",   val: child.secteur   || "—" },
                                { label: "Irrigation",val: IRRIGATION_LABELS[child.irrigation ?? ""] ?? child.irrigation ?? "—" },
                              ].map(d => (
                                <div key={d.label}>
                                  <p className="text-[8.5px] text-slate-400 font-medium">{d.label}</p>
                                  <p className="text-[10px] text-slate-700 font-semibold">{d.val}</p>
                                </div>
                              ))}
                            </div>
                            {child.lastTreatmentDate && (
                              <p className="text-[9px] text-slate-400 mt-2">
                                Dernier traitement : {fmtDate(child.lastTreatmentDate,{day:"numeric",month:"short"})}
                              </p>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHead({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2 flex items-center gap-1.5">
      <span className="text-slate-300">{icon}</span>{label}
    </p>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-1">
      <span className="text-slate-300 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-[9px] text-slate-400 font-medium block">{label}</span>
        <span className="text-[10.5px] text-slate-700 font-semibold leading-tight">{value}</span>
      </div>
    </div>
  );
}

function ProdStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg px-2.5 py-2 border border-slate-100">
      <p className="text-[11px] font-black text-slate-800 leading-none">{value}</p>
      <p className="text-[8px] text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}

function NextBanner({ t }: { t: Record<string, unknown> }) {
  const type = String(getProp(t, "type", "type") ?? "");
  const meta = TYPE_META[type] ?? DEFAULT_META;
  const dateStr = String(getProp(t, "plannedDate", "planned_date") ?? "");
  const date = fmtDate(dateStr, { day: "numeric", month: "long", year: "numeric" });
  const operator = String(getProp(t, "operatorName", "operator_name") ?? "");
  const area = getProp(t, "areaTreatedHectares", "area_treated_hectares");
  const rawProds = (getProp(t, "products", "products") as unknown[]) ?? [];
  const products = Array.isArray(rawProds) ? rawProds as Record<string, unknown>[] : [];
  const days = dateStr ? daysFrom(dateStr) : null;

  return (
    <div className="rounded-xl p-3 border flex-shrink-0" style={{ background: meta.bg, borderColor: meta.border }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
            Prochaine intervention
          </span>
        </div>
        {days != null && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: meta.color+"18", color: meta.color }}>
            {days > 0 ? `Dans ${days}j` : days === 0 ? "Aujourd'hui !" : `${Math.abs(days)}j de retard`}
          </span>
        )}
      </div>
      <p className="text-[12px] font-bold text-slate-800 leading-tight">
        {TYPE_LABELS[type] ?? type} · {date}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
        {operator && <span className="text-[10px] text-slate-500">👤 {operator}</span>}
        {area != null && <span className="text-[10px] text-slate-500 font-mono">{String(area)} ha</span>}
        {products.length > 0 && (
          <span className="text-[10px] text-slate-500">
            🧪 {products.map(p => String(p.productName ?? p.tradeName ?? "Produit")).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

function TreatmentRow({ t, index, expanded, onToggle, isLast }:
  { t: Record<string,unknown>; index: number; expanded: boolean; onToggle: ()=>void; isLast: boolean }) {

  const type      = String(getProp(t,"type","type")??"");
  const rawStatus = String(getProp(t,"status","status")??"");
  const meta      = TYPE_META[type] ?? DEFAULT_META;
  const sm        = STATUS_META[rawStatus] ?? DEFAULT_STATUS;
  const planned   = fmtDate(String(getProp(t,"plannedDate","planned_date")??""));
  const executed  = getProp(t,"executedDate","executed_date");
  const completed = getProp(t,"completedDate","completed_date");
  const operator  = String(getProp(t,"operatorName","operator_name")??"");
  const area      = getProp(t,"areaTreatedHectares","area_treated_hectares");
  const trees     = getProp(t,"treesCount","trees_count");
  const weather   = String(getProp(t,"weatherConditions","weather_conditions")??"");
  const temp      = getProp(t,"temperature","temperature");
  const humidity  = getProp(t,"humidity","humidity");
  const wind      = getProp(t,"windSpeed","wind_speed");
  const cost      = Number(getProp(t,"totalCostDZD","total_cost_dzd")??0);
  const volume    = getProp(t,"volumeBouillie","volume_bouillie");
  const volumeU   = String(getProp(t,"volumeBouillieUnit","volume_bouillie_unit")??"L");
  const notes     = String(getProp(t,"notes","notes")??"");
  const subName   = String(getProp(t,"sousParcelleName","site_name")??"");
  const rawProds  = (getProp(t,"products","products") as unknown[]) ??
                    (getProp(t,"treatment_products","treatment_products") as unknown[]) ?? [];
  const products  = (Array.isArray(rawProds) ? rawProds : []) as Record<string,unknown>[];

  return (
    <div className="ov-row relative" style={{ animationDelay: `${index * 22}ms` }}>
      {!isLast && (
        <div className="absolute left-[19px] w-px"
             style={{ top: 42, bottom: 0, background: `${meta.color}20` }} />
      )}

      <button type="button" onClick={onToggle}
              className="w-full flex items-start gap-3 py-2.5 text-left hover:bg-slate-50/80 rounded-xl px-2 transition-colors group">
        <div className="flex-shrink-0 w-[36px] h-[36px] rounded-xl flex items-center justify-center mt-0.5"
             style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800 leading-tight">
                {TYPE_LABELS[type] ?? type}
              </p>
              <p className="text-[9.5px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono">{planned}</span>
                {subName && <span className="text-slate-300">·</span>}
                {subName && <span>{subName}</span>}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${sm.cls}`}>
                {sm.icon}
                {STATUS_LABELS[rawStatus] ?? rawStatus}
              </span>
              <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {operator && <span className="text-[9.5px] text-slate-500">👤 {operator}</span>}
            {area != null && <span className="text-[9.5px] text-slate-500 font-mono">{String(area)} ha</span>}
            {products.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {products.slice(0,3).map((p, pi) => {
                  const n = String(p.productName ?? p.tradeName ?? (p.products as Record<string,unknown>|undefined)?.trade_name ?? "Produit");
                  return (
                    <span key={pi} className="text-[8.5px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: meta.bg, color: meta.color }}>
                      {n}
                    </span>
                  );
                })}
                {products.length > 3 && (
                  <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    +{products.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="ml-[48px] mb-3 rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">

          {/* Products table */}
          {products.length > 0 && (
            <>
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <FlaskConical size={9} /> Produits & doses
                </p>
              </div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Produit","Matière active","Qté totale","Dose/ha","Dose/arbre"].map(h => (
                      <th key={h} className="text-left px-3 py-1.5 font-semibold text-slate-400 text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, pi) => {
                    const nested  = p.products as Record<string,unknown> | undefined;
                    const name    = String(p.productName ?? p.tradeName ?? nested?.trade_name ?? "Produit");
                    const active  = String(p.activeSubstance ?? nested?.active_substance ?? "—");
                    const qty     = Number(p.quantityUsed ?? p.quantity_used ?? 0);
                    const unit    = String(p.unit ?? nested?.unit ?? "");
                    const doseHa  = Number(p.dosePerHectare ?? p.dose_per_hectare ?? 0);
                    const doseTree= p.dosePerTree ?? p.dose_per_tree;
                    return (
                      <tr key={pi} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-2">
                          <span className="font-semibold text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: meta.bg, color: meta.color }}>
                            {name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 italic text-[9.5px]">{active}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 font-semibold">{fmt(qty,1)} {unit}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{doseHa > 0 ? `${fmt(doseHa,2)} ${unit}/ha` : "—"}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{doseTree != null ? `${fmt(Number(doseTree),3)} ${unit}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* Operation details */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 px-3 py-2.5 border-t border-slate-100">
            {area != null && <Detail icon={<Ruler size={9}/>}        label="Surface traitée"   value={`${area} ha`} />}
            {trees != null && <Detail icon={<TreePine size={9}/>}    label="Nb arbres"          value={fmt(Number(trees))} />}
            {volume != null && <Detail icon={<Droplets size={9}/>}   label="Vol. bouillie"      value={`${volume} ${volumeU}`} />}
            {cost > 0 && <Detail icon={<DollarSign size={9}/>}       label="Coût"               value={`${fmt(cost)} DZD`} />}
            {operator && <Detail icon={<User size={9}/>}             label="Opérateur"          value={operator} />}
            {executed != null && <Detail icon={<CalendarDays size={9}/>} label="Exécuté le"    value={fmtDate(String(executed),{day:"numeric",month:"short"})} />}
            {completed != null && <Detail icon={<CheckCircle2 size={9}/>} label="Terminé le"   value={fmtDate(String(completed),{day:"numeric",month:"short"})} />}
          </div>

          {/* Weather */}
          {(weather || temp != null || humidity != null || wind != null) && (
            <div className="border-t border-slate-100 px-3 py-2">
              <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                Conditions météo
              </p>
              {weather && <p className="text-[10px] text-slate-600 mb-1.5">{weather}</p>}
              <div className="flex gap-4 flex-wrap">
                {temp != null && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-600">
                    <Thermometer size={10} className="text-orange-400" />{String(temp)}°C
                  </span>
                )}
                {humidity != null && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-600">
                    <CloudRain size={10} className="text-blue-400" />{String(humidity)}%
                  </span>
                )}
                {wind != null && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-600">
                    <Wind size={10} className="text-slate-400" />{String(wind)} km/h
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="border-t border-slate-100 px-3 py-2">
              <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 mb-1">Notes</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">{notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-slate-300 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[8.5px] text-slate-400 font-medium">{label}</p>
        <p className="text-[10.5px] text-slate-700 font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}
