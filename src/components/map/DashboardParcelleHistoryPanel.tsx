"use client";

import Link from "next/link";
import {
  X, TreePine, ExternalLink, Loader2, GitBranch,
  MapPin, Calendar, Droplets, Leaf, Sprout, Bug, Waves,
  CheckCircle2, Clock, AlertCircle, XCircle, FlaskConical,
  Thermometer, Wind, CloudRain, Ruler, Layers, TrendingUp,
  DollarSign, Wheat, Activity, Package, Shield, BarChart3,
  Target, ChevronDown, ChevronUp, Satellite, Apple, Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import ModalPortal from "@/components/ui/ModalPortal";
import type { Parcelle } from "@/lib/mock-data";
import type { ParcelleHistoryBundle, HistoryEventKind } from "@/lib/parcelle-history";
import { KIND_COLORS, KIND_LABELS } from "@/lib/parcelle-history";
import { getProp } from "@/components/map/dashboard-map-utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pulverisation: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <Droplets size={13} /> },
  desherbage:    { color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: <Leaf     size={13} /> },
  fertilisation: { color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", icon: <Sprout   size={13} /> },
  fongicide:     { color: "#991b1b", bg: "#fff1f2", border: "#fecdd3", icon: <Bug      size={13} /> },
  irrigation:    { color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: <Waves    size={13} /> },
};
const DEF_META = TYPE_META.pulverisation;

const STATUS_META: Record<string, { cls: string; icon: React.ReactNode }> = {
  completed:   { cls: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 size={9} /> },
  termine:     { cls: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 size={9} /> },
  in_progress: { cls: "bg-amber-100 text-amber-800",    icon: <Clock        size={9} /> },
  en_cours:    { cls: "bg-amber-100 text-amber-800",    icon: <Clock        size={9} /> },
  planned:     { cls: "bg-sky-100 text-sky-700",        icon: <AlertCircle  size={9} /> },
  planifie:    { cls: "bg-sky-100 text-sky-700",        icon: <AlertCircle  size={9} /> },
  cancelled:   { cls: "bg-red-100 text-red-700",        icon: <XCircle      size={9} /> },
  annule:      { cls: "bg-red-100 text-red-700",        icon: <XCircle      size={9} /> },
};

const IRRIGATION_LABELS: Record<string, string> = {
  goutte_a_goutte: "Goutte-à-goutte", aspersion: "Aspersion",
  gravitaire: "Gravitaire", pluvial: "Pluvial", aucune: "Aucune",
};

const SEVERITY_CLS: Record<string, string> = {
  FAIBLE:    "bg-yellow-100 text-yellow-800",
  MODEREE:   "bg-orange-100 text-orange-800",
  SEVERE:    "bg-red-100 text-red-800",
  CRITIQUE:  "bg-red-200 text-red-900 font-black",
};

const NDVI_COLOR = (v: number) =>
  v >= 0.6 ? "#16a34a" : v >= 0.4 ? "#ca8a04" : v >= 0.2 ? "#ea580c" : "#dc2626";

type Tab = "chronologie" | "traitements" | "produits" | "maladies" | "recoltes" | "satellite";

function fmt(n: number, d = 0) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtDate(s: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("fr-FR", opts ?? { day: "numeric", month: "long", year: "numeric" }); }
  catch { return "—"; }
}
function daysUntil(s: string) {
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  parcelle: Parcelle;
  history: ParcelleHistoryBundle | null;
  loading?: boolean;
  onClose: () => void;
  variant?: "modal" | "drawer";
};

export default function DashboardParcelleHistoryPanel({
  parcelle,
  history,
  loading,
  onClose,
  variant = "modal",
}: Props) {
  const isDrawer = variant === "drawer";
  const [tab, setTab] = useState<Tab>("chronologie");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = history?.stats;
  const timeline = history?.timeline ?? [];
  const treatments = history?.treatments ?? [];

  const byKind = useMemo(() => {
    const map: Partial<Record<HistoryEventKind, typeof timeline>> = {};
    for (const ev of timeline) {
      (map[ev.kind] ??= []).push(ev);
    }
    return map;
  }, [timeline]);

  // Aggregate products across all treatments
  const productMap = useMemo(() => {
    const map = new Map<string, {
      name: string; category: string; unit: string;
      totalQty: number; applications: number;
      totalDoseHa: number; doseCount: number;
      lastDate: string | null;
    }>();
    for (const t of treatments) {
      const rawProds = (getProp(t,"products","products") as unknown[]) ??
                       (getProp(t,"treatment_products","treatment_products") as unknown[]) ?? [];
      const prods = Array.isArray(rawProds) ? rawProds as Record<string,unknown>[] : [];
      const dateRaw = String(getProp(t,"plannedDate","planned_date")??"");
      for (const p of prods) {
        const nested = p.products as Record<string,unknown>|undefined;
        const name   = String(p.productName??p.product_name??nested?.trade_name??p.tradeName??"Produit");
        const qty    = Number(p.quantityUsed??p.quantity_used??0);
        const unit   = String(p.unit??nested?.unit??"");
        const dph    = Number(p.dosePerHectare??p.dose_per_hectare??0);
        const cat    = String(nested?.category??p.category??p.type??"");
        const key    = name.toLowerCase();
        const prev   = map.get(key);
        if (prev) {
          prev.totalQty += qty; prev.applications += 1;
          if (dph>0){ prev.totalDoseHa+=dph; prev.doseCount+=1; }
          if (dateRaw&&(!prev.lastDate||dateRaw>prev.lastDate)) prev.lastDate=dateRaw;
        } else {
          map.set(key,{ name, category:cat, unit, totalQty:qty, applications:1,
            totalDoseHa:dph>0?dph:0, doseCount:dph>0?1:0, lastDate:dateRaw||null });
        }
      }
    }
    return [...map.values()].sort((a,b)=>b.applications-a.applications);
  }, [treatments]);

  const implantAge = parcelle.dateImplantation
    ? Math.floor((Date.now()-new Date(parcelle.dateImplantation).getTime())/(365.25*24*3600*1000))
    : null;

  const nextTreatment = treatments.find(t => {
    const s = String(getProp(t,"status","status")??"");
    return s==="planned"||s==="planifie";
  });

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "chronologie",  label: "Chronologie",   icon: <Activity  size={11}/>, count: timeline.length },
    { id: "traitements",  label: "Traitements",   icon: <Droplets  size={11}/>, count: stats?.traitements ?? 0 },
    { id: "produits",     label: "Produits",       icon: <FlaskConical size={11}/>, count: productMap.length },
    { id: "maladies",     label: "Maladies",       icon: <Shield    size={11}/>, count: byKind.maladie?.length ?? 0 },
    { id: "recoltes",     label: "Récoltes",       icon: <Apple     size={11}/>, count: (byKind.recolte?.length??0)+(byKind.revenu?.length??0) },
    { id: "satellite",    label: "Satellite",      icon: <Satellite size={11}/>, count: byKind.satellite?.length ?? 0 },
  ];

  const panel = (
      <div
        className={cn(
          "relative w-full flex flex-col overflow-hidden",
          isDrawer ? "h-full min-h-0 rounded-none shadow-none" : "rounded-2xl shadow-2xl"
        )}
        style={
          isDrawer
            ? {
                height: "100%",
                maxHeight: "none",
                background: "#fff",
                borderLeft: `3px solid ${parcelle.color}`,
              }
            : {
                maxWidth: 1120,
                width: "100%",
                height: "calc(100vh - 48px)",
                maxHeight: 900,
                background: "#fff",
                border: `1.5px solid ${parcelle.color}30`,
                animation: "ph-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes ph-in { from{opacity:0;transform:scale(0.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes ph-row { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
          .ph-row { animation:ph-row 0.16s ease forwards; opacity:0; }
          .ph-scroll::-webkit-scrollbar{width:4px;}
          .ph-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.10);border-radius:4px;}
        `}</style>

        {/* ══ HEADER ══ */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
             style={{ background:`linear-gradient(135deg,${parcelle.color}15 0%,${parcelle.color}05 100%)`, borderBottom:`1.5px solid ${parcelle.color}20` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background:`${parcelle.color}20`, border:`1.5px solid ${parcelle.color}35` }}>
              <TreePine size={18} style={{ color: parcelle.color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] font-black tracking-tight" style={{ color: parcelle.color }}>
                  {parcelle.name}
                </h2>
                {parcelle.variete && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background:`${parcelle.color}18`, color: parcelle.color }}>
                    {parcelle.variete}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                  {parcelle.cropType}
                </span>
                {parcelle.cultureType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
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
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <Link href={`/trace/${encodeURIComponent(parcelle.id)}`}
                  className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <GitBranch size={11} /> Traçabilité
            </Link>
            <Link href={`/parcelles?select=${encodeURIComponent(parcelle.id)}`}
                  className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white hover:opacity-90"
                  style={{ background: parcelle.color }}>
              <ExternalLink size={11} /> Fiche parcelle
            </Link>
            <button type="button" onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/8 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ══ STATS STRIP ══ */}
        <div className="flex flex-shrink-0 border-b border-slate-100 bg-slate-50/60">
          {[
            { icon:<Target size={12}/>,      val: stats?.traitements ?? 0,               label:"Interventions",   color:"#334155" },
            { icon:<Shield size={12}/>,      val: stats?.maladies ?? 0,                   label:"Maladies",        color:"#b45309" },
            { icon:<Apple size={12}/>,       val: stats?.recoltes ?? 0,                   label:"Récoltes",        color:"#7c3aed" },
            { icon:<Ruler size={12}/>,       val:`${fmt(stats?.surfaceTraiteeHa??0,1)} ha`,label:"Surface traitée",color:"#0891b2" },
            { icon:<Package size={12}/>,     val: productMap.length,                      label:"Produits",        color:"#be185d" },
            ...(stats?.coutTotalDzd ? [{ icon:<DollarSign size={12}/>, val:`${fmt((stats.coutTotalDzd)/1000,0)}k DZD`, label:"Coût cumulé", color:"#b45309" }] : []),
            ...(stats?.dernierNdvi != null ? [{ icon:<Satellite size={12}/>, val:stats.dernierNdvi.toFixed(2), label:"Dernier NDVI", color:NDVI_COLOR(stats.dernierNdvi) }] : []),
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-2.5 px-1 border-r border-slate-100 last:border-r-0 min-w-0">
              <div className="flex items-center gap-1" style={{ color: s.color }}>
                {s.icon}
                <span className="text-[14px] font-black leading-none">{s.val}</span>
              </div>
              <span className="text-[8px] text-slate-400 font-medium text-center mt-0.5 leading-none">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ══ BODY ══ */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: parcelle.color }} />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── LEFT RAIL ── */}
            <div className="flex-shrink-0 overflow-y-auto ph-scroll border-r border-slate-100 py-3" style={{ width: 240 }}>

              <Rail label="Identité" icon={<Layers size={10}/>}>
                <RailRow icon={<Wheat size={11}/>}      label="Culture"      val={parcelle.cropType} />
                {parcelle.variete&&<RailRow icon={<Sprout size={11}/>}  label="Variété"  val={parcelle.variete}/>}
                {parcelle.soilType&&<RailRow icon={<Ruler size={11}/>}  label="Sol"      val={parcelle.soilType}/>}
                {parcelle.irrigation&&<RailRow icon={<Droplets size={11}/>} label="Irrigation" val={IRRIGATION_LABELS[parcelle.irrigation]??parcelle.irrigation}/>}
                {parcelle.altitude!=null&&<RailRow icon={<TrendingUp size={11}/>} label="Altitude" val={`${parcelle.altitude} m`}/>}
              </Rail>

              <Divider />
              <Rail label="Plantation" icon={<Calendar size={10}/>}>
                {parcelle.dateImplantation&&<RailRow icon={<Calendar size={11}/>} label="Implantation" val={fmtDate(parcelle.dateImplantation,{month:"short",year:"numeric"})}/>}
                {implantAge!=null&&<RailRow icon={<TrendingUp size={11}/>} label="Âge" val={`${implantAge} ans`}/>}
                {parcelle.densitePlantation!=null&&<RailRow icon={<TreePine size={11}/>} label="Densité" val={`${parcelle.densitePlantation} ${parcelle.densiteUnit??"arb/ha"}`}/>}
                {parcelle.densitePlantation!=null&&<RailRow icon={<BarChart3 size={11}/>} label="Plants estimés" val={fmt(Math.round(parcelle.densitePlantation*parcelle.areaHectares))}/>}
              </Rail>

              <Divider />
              <Rail label="Localisation" icon={<MapPin size={10}/>}>
                {parcelle.site&&<RailRow icon={<MapPin size={11}/>}  label="Site"    val={parcelle.site}/>}
                {parcelle.zone&&<RailRow icon={<MapPin size={11}/>}  label="Zone"    val={parcelle.zone}/>}
                {parcelle.secteur&&<RailRow icon={<Layers size={11}/>} label="Secteur" val={parcelle.secteur}/>}
                <RailRow icon={<Ruler size={11}/>} label="Superficie" val={`${parcelle.areaHectares} ha`}/>
              </Rail>

              {(parcelle.children?.length??0)>0&&(
                <>
                  <Divider/>
                  <Rail label="Sous-parcelles" icon={<GitBranch size={10}/>}>
                    {parcelle.children!.map(c=>(
                      <div key={c.id} className="flex items-center gap-2 px-3 py-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:c.color}}/>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-700 truncate">{c.name}</p>
                          <p className="text-[9px] text-slate-400">{c.areaHectares} ha</p>
                        </div>
                      </div>
                    ))}
                  </Rail>
                </>
              )}

              {parcelle.observations&&(
                <>
                  <Divider/>
                  <Rail label="Observations" icon={<AlertCircle size={10}/>}>
                    <p className="text-[10px] text-slate-500 leading-relaxed px-3">{parcelle.observations}</p>
                  </Rail>
                </>
              )}
            </div>

            {/* ── RIGHT: TABS ── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

              {/* Next treatment banner */}
              {nextTreatment && <div className="flex-shrink-0 px-4 pt-3 pb-0"><NextBanner t={nextTreatment} color={parcelle.color}/></div>}

              {/* Tabs */}
              <div className="flex items-center border-b border-slate-100 flex-shrink-0 px-4 mt-2 overflow-x-auto">
                {TABS.map(t => (
                  <button key={t.id} type="button" onClick={()=>setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold whitespace-nowrap transition-colors border-b-2 ${
                      tab===t.id ? "text-slate-800" : "text-slate-400 hover:text-slate-600 border-transparent"
                    }`}
                    style={tab===t.id ? {borderBottomColor:parcelle.color} : {}}>
                    <span style={tab===t.id?{color:parcelle.color}:{}}>{t.icon}</span>
                    {t.label}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={tab===t.id ? {background:parcelle.color,color:"#fff"} : {background:"#f1f5f9",color:"#64748b"}}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto ph-scroll">

                {/* CHRONOLOGIE */}
                {tab==="chronologie"&&(
                  <div className="px-4 pb-4 pt-2">
                    {timeline.length===0?(
                      <Empty icon={<Activity size={26}/>} text="Aucun événement enregistré pour cette parcelle"/>
                    ):(
                      <ul className="border-l-2 border-slate-200 ml-2 pl-4 space-y-0">
                        {timeline.map((ev,i)=>(
                          <li key={ev.id} className="ph-row relative pb-3 last:pb-0" style={{animationDelay:`${i*18}ms`}}>
                            <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                                  style={{backgroundColor:KIND_COLORS[ev.kind]}}/>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:border-slate-200 hover:shadow-md transition-all">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
                                      style={{backgroundColor:KIND_COLORS[ev.kind]}}>
                                  {KIND_LABELS[ev.kind]}
                                </span>
                                <time className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                                  {fmtDate(ev.date,{day:"numeric",month:"short",year:"numeric"})}
                                </time>
                              </div>
                              <p className="text-[11px] font-bold text-slate-800 leading-snug">{ev.title}</p>
                              {ev.subtitle&&<p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{ev.subtitle}</p>}
                              {ev.status&&ev.kind==="traitement"&&(
                                <span className="inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  {ev.status}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* TRAITEMENTS */}
                {tab==="traitements"&&(
                  <div className="px-3 pb-4 pt-1">
                    {treatments.length===0?(
                      <Empty icon={<Droplets size={26}/>} text="Aucun traitement enregistré"/>
                    ):treatments.map((t,i)=>(
                      <TreatRow key={String(t.id??i)} t={t} index={i}
                        expanded={expandedId===String(t.id??i)}
                        onToggle={()=>setExpandedId(p=>p===String(t.id??i)?null:String(t.id??i))}
                        isLast={i===treatments.length-1}/>
                    ))}
                  </div>
                )}

                {/* PRODUITS */}
                {tab==="produits"&&(
                  <div className="p-4">
                    {productMap.length===0?(
                      <Empty icon={<FlaskConical size={26}/>} text="Aucun produit enregistré"/>
                    ):(
                      <>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                          <Shield size={10}/> Inventaire phytosanitaire — tous traitements
                        </p>
                        <div className="grid gap-3">
                          {productMap.map((prod,i)=>{
                            const avgDose = prod.doseCount>0 ? prod.totalDoseHa/prod.doseCount : 0;
                            const barPct  = Math.min(100,(prod.applications/Math.max(...productMap.map(p=>p.applications)))*100);
                            return (
                              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 hover:border-slate-200 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-[12px] font-black text-slate-800">{prod.name}</p>
                                      {prod.category&&<span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">{prod.category}</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Dernière utilisation : {fmtDate(prod.lastDate,{day:"numeric",month:"short",year:"numeric"})}</p>
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <p className="text-[18px] font-black text-slate-800 leading-none">{prod.applications}</p>
                                    <p className="text-[8.5px] text-slate-400 font-medium">application{prod.applications>1?"s":""}</p>
                                  </div>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden">
                                  <div className="h-full rounded-full" style={{width:`${barPct}%`,background:parcelle.color}}/>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <ProdStat label="Qté totale"   val={`${fmt(prod.totalQty,1)} ${prod.unit}`}/>
                                  <ProdStat label="Dose moy/ha"  val={avgDose>0?`${fmt(avgDose,2)} ${prod.unit}/ha`:"—"}/>
                                  <ProdStat label="Applications" val={String(prod.applications)}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Summary table */}
                        <div className="mt-5 rounded-xl border border-slate-100 overflow-hidden">
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tableau récapitulatif</p>
                          </div>
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b border-slate-100">
                                {["Produit","Catégorie","Total utilisé","Dose moy/ha","Applications","Dernière date"].map(h=>(
                                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-400 text-[9px]">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {productMap.map((prod,i)=>{
                                const avgD = prod.doseCount>0?prod.totalDoseHa/prod.doseCount:0;
                                return (
                                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-3 py-2 font-semibold text-slate-800">{prod.name}</td>
                                    <td className="px-3 py-2 text-slate-500">{prod.category||"—"}</td>
                                    <td className="px-3 py-2 font-mono text-slate-700">{fmt(prod.totalQty,1)} {prod.unit}</td>
                                    <td className="px-3 py-2 font-mono text-slate-600">{avgD>0?`${fmt(avgD,2)} ${prod.unit}/ha`:"—"}</td>
                                    <td className="px-3 py-2 text-center font-bold text-slate-800">{prod.applications}</td>
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

                {/* MALADIES */}
                {tab==="maladies"&&(
                  <div className="p-4">
                    {(byKind.maladie?.length??0)===0?(
                      <Empty icon={<Shield size={26}/>} text="Aucune maladie ou observation pathologique enregistrée"/>
                    ):(
                      <div className="space-y-3">
                        {byKind.maladie!.map((ev,i)=>{
                          const sev = String((ev.meta as Record<string,unknown>)?.severite??"");
                          return (
                            <div key={ev.id} className="ph-row rounded-xl border border-amber-100 bg-amber-50/40 p-3.5" style={{animationDelay:`${i*18}ms`}}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[12px] font-black text-slate-800">{ev.title}</p>
                                  {ev.subtitle&&<p className="text-[10px] text-slate-500 mt-0.5">{ev.subtitle}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <time className="text-[10px] text-slate-400 font-mono">{fmtDate(ev.date,{day:"numeric",month:"short",year:"numeric"})}</time>
                                  {sev&&<span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_CLS[sev]??""}`}>{sev}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* RÉCOLTES */}
                {tab==="recoltes"&&(
                  <div className="p-4 space-y-3">
                    {(byKind.recolte?.length??0)===0&&(byKind.revenu?.length??0)===0?(
                      <Empty icon={<Apple size={26}/>} text="Aucune récolte ou revenu enregistré"/>
                    ):(
                      <>
                        {(byKind.recolte??[]).map((ev,i)=>(
                          <div key={ev.id} className="ph-row rounded-xl border border-purple-100 bg-purple-50/40 p-3.5" style={{animationDelay:`${i*18}ms`}}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                  <Apple size={12} className="text-purple-500"/> Récolte
                                </p>
                                {ev.subtitle&&<p className="text-[10px] text-slate-600 mt-1 font-medium">{ev.subtitle}</p>}
                              </div>
                              <time className="text-[10px] text-slate-400 font-mono flex-shrink-0">{fmtDate(ev.date,{day:"numeric",month:"short",year:"numeric"})}</time>
                            </div>
                          </div>
                        ))}
                        {(byKind.revenu??[]).map((ev,i)=>(
                          <div key={ev.id} className="ph-row rounded-xl border border-blue-100 bg-blue-50/40 p-3.5" style={{animationDelay:`${i*18}ms`}}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                  <DollarSign size={12} className="text-blue-500"/> Revenu enregistré
                                </p>
                                {ev.subtitle&&<p className="text-[11px] text-blue-700 mt-1 font-black">{ev.subtitle}</p>}
                              </div>
                              <time className="text-[10px] text-slate-400 font-mono flex-shrink-0">{fmtDate(ev.date,{day:"numeric",month:"short",year:"numeric"})}</time>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* SATELLITE */}
                {tab==="satellite"&&(
                  <div className="p-4">
                    {(byKind.satellite?.length??0)===0?(
                      <Empty icon={<Satellite size={26}/>} text="Aucune donnée satellite disponible pour cette parcelle"/>
                    ):(
                      <div className="space-y-3">
                        {byKind.satellite!.map((ev,i)=>{
                          const meta = ev.meta as Record<string,unknown>|undefined;
                          const ndvi = meta?.indice_ndvi != null ? Number(meta.indice_ndvi) : null;
                          const ndwi = meta?.indice_ndwi != null ? Number(meta.indice_ndwi) : null;
                          const src  = String(meta?.source_satellite??"—");
                          return (
                            <div key={ev.id} className="ph-row rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5" style={{animationDelay:`${i*18}ms`}}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                                  <Satellite size={12} className="text-indigo-500"/> {src}
                                </p>
                                <time className="text-[10px] text-slate-400 font-mono">{fmtDate(ev.date,{day:"numeric",month:"short",year:"numeric"})}</time>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {ndvi!=null&&(
                                  <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                                    <p className="text-[8.5px] text-slate-400 font-medium mb-1">NDVI (végétation)</p>
                                    <div className="h-2 bg-slate-200 rounded-full mb-1.5">
                                      <div className="h-full rounded-full" style={{width:`${Math.max(0,Math.min(100,(ndvi+1)/2*100))}%`,background:NDVI_COLOR(ndvi)}}/>
                                    </div>
                                    <p className="text-[13px] font-black" style={{color:NDVI_COLOR(ndvi)}}>{ndvi.toFixed(3)}</p>
                                  </div>
                                )}
                                {ndwi!=null&&(
                                  <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                                    <p className="text-[8.5px] text-slate-400 font-medium mb-1">NDWI (eau)</p>
                                    <div className="h-2 bg-slate-200 rounded-full mb-1.5">
                                      <div className="h-full rounded-full bg-blue-500" style={{width:`${Math.max(0,Math.min(100,(ndwi+1)/2*100))}%`}}/>
                                    </div>
                                    <p className="text-[13px] font-black text-blue-600">{ndwi.toFixed(3)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
  );

  if (isDrawer) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#fcfdfa]">
        {panel}
      </div>
    );
  }

  return (
    <ModalPortal>
      <div className="lf-overlay-root flex items-center justify-center p-4">
        <div
          className="absolute inset-0 cursor-pointer"
          style={{ background: "rgba(8,12,8,0.65)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        />
        {panel}
      </div>
    </ModalPortal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Rail({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2 flex items-center gap-1.5">
        <span className="text-slate-300">{icon}</span>{label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function RailRow({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-0.5">
      <span className="text-slate-300 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-[9px] text-slate-400 font-medium block">{label}</span>
        <span className="text-[10.5px] text-slate-700 font-semibold leading-tight">{val}</span>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-3 mx-3 border-t border-slate-100"/>;
}

function ProdStat({ label, val }: { label: string; val: string }) {
  return (
    <div className="bg-white rounded-lg px-2.5 py-2 border border-slate-100">
      <p className="text-[11px] font-black text-slate-800 leading-none">{val}</p>
      <p className="text-[8px] text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-slate-200">{icon}</div>
      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">{text}</p>
    </div>
  );
}

function NextBanner({ t, color }: { t: Record<string,unknown>; color: string }) {
  const type    = String(getProp(t,"type","type")??"");
  const meta    = TYPE_META[type]??DEF_META;
  const dateStr = String(getProp(t,"plannedDate","planned_date")??"");
  const days    = dateStr ? daysUntil(dateStr) : null;
  const operator= String(getProp(t,"operatorName","operator_name")??"");
  return (
    <div className="rounded-xl p-3 border mb-1" style={{background:meta.bg,borderColor:meta.border}}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span style={{color:meta.color}}>{meta.icon}</span>
          <span className="text-[9.5px] font-black uppercase tracking-wider" style={{color:meta.color}}>Prochaine intervention</span>
        </div>
        {days!=null&&(
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{background:`${meta.color}18`,color:meta.color}}>
            {days>0?`Dans ${days}j`:days===0?"Aujourd'hui !":`${Math.abs(days)}j de retard`}
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold text-slate-800">{type} · {fmtDate(dateStr,{day:"numeric",month:"long"})}</p>
      {operator&&<p className="text-[10px] text-slate-500 mt-0.5">👤 {operator}</p>}
    </div>
  );
}

function TreatRow({ t, index, expanded, onToggle, isLast }:
  { t:Record<string,unknown>; index:number; expanded:boolean; onToggle:()=>void; isLast:boolean }) {

  const type      = String(getProp(t,"type","type")??"");
  const rawStatus = String(getProp(t,"status","status")??"");
  const meta      = TYPE_META[type]??DEF_META;
  const sm        = STATUS_META[rawStatus]??STATUS_META.planned;
  const planned   = fmtDate(String(getProp(t,"plannedDate","planned_date")??""));
  const operator  = String(getProp(t,"operatorName","operator_name")??"");
  const area      = getProp(t,"areaTreatedHectares","area_treated_hectares");
  const trees     = getProp(t,"treesCount","trees_count");
  const cost      = Number(getProp(t,"totalCostDZD","total_cost_dzd")??0);
  const volume    = getProp(t,"volumeBouillie","volume_bouillie");
  const volumeU   = String(getProp(t,"volumeBouillieUnit","volume_bouillie_unit")??"L");
  const temp      = getProp(t,"temperature","temperature");
  const humidity  = getProp(t,"humidity","humidity");
  const wind      = getProp(t,"windSpeed","wind_speed");
  const notes     = String(getProp(t,"notes","notes")??"");
  const subName   = String(getProp(t,"sousParcelleName","site_name")??"");
  const rawProds  = (getProp(t,"products","products") as unknown[])??
                    (getProp(t,"treatment_products","treatment_products") as unknown[])??[];
  const products  = (Array.isArray(rawProds)?rawProds:[]) as Record<string,unknown>[];

  const STATUS_LABELS: Record<string,string> = {
    completed:"Terminé",termine:"Terminé",in_progress:"En cours",en_cours:"En cours",
    planned:"Planifié",planifie:"Planifié",cancelled:"Annulé",annule:"Annulé"
  };
  const TYPE_LABELS: Record<string,string> = {
    pulverisation:"Pulvérisation",desherbage:"Désherbage",
    fertilisation:"Fertilisation",fongicide:"Fongicide",irrigation:"Irrigation"
  };

  return (
    <div className="ph-row relative" style={{animationDelay:`${index*22}ms`}}>
      {!isLast&&<div className="absolute left-[19px] w-px" style={{top:42,bottom:0,background:`${meta.color}20`}}/>}
      <button type="button" onClick={onToggle}
              className="w-full flex items-start gap-3 py-2.5 text-left hover:bg-slate-50/80 rounded-xl px-2 transition-colors group">
        <div className="flex-shrink-0 w-[36px] h-[36px] rounded-xl flex items-center justify-center mt-0.5"
             style={{background:meta.bg,color:meta.color,border:`1px solid ${meta.border}`}}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800 leading-tight">
                {TYPE_LABELS[type]??type}
              </p>
              <p className="text-[9.5px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono">{planned}</span>
                {subName&&<><span className="text-slate-300">·</span><span>{subName}</span></>}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${sm?.cls??""}`}>
                {sm?.icon}{STATUS_LABELS[rawStatus]??rawStatus}
              </span>
              <span className="text-slate-300 group-hover:text-slate-500">
                {expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {operator&&<span className="text-[9.5px] text-slate-500">👤 {operator}</span>}
            {area!=null&&<span className="text-[9.5px] text-slate-500 font-mono">{String(area)} ha</span>}
            {products.slice(0,3).map((p,pi)=>{
              const nested=p.products as Record<string,unknown>|undefined;
              const n=String(p.productName??p.tradeName??nested?.trade_name??"Produit");
              return <span key={pi} className="text-[8.5px] font-medium px-1.5 py-0.5 rounded" style={{background:meta.bg,color:meta.color}}>{n}</span>;
            })}
            {products.length>3&&<span className="text-[8.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">+{products.length-3}</span>}
          </div>
        </div>
      </button>

      {expanded&&(
        <div className="ml-[48px] mb-3 rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
          {products.length>0&&(
            <>
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <FlaskConical size={9}/> Produits & doses
                </p>
              </div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Produit","Matière active","Qté","Dose/ha","Dose/arbre"].map(h=>(
                      <th key={h} className="text-left px-3 py-1.5 font-semibold text-slate-400 text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p,pi)=>{
                    const nested=p.products as Record<string,unknown>|undefined;
                    const name=String(p.productName??p.tradeName??nested?.trade_name??"Produit");
                    const active=String(p.activeSubstance??nested?.active_substance??"—");
                    const qty=Number(p.quantityUsed??p.quantity_used??0);
                    const unit=String(p.unit??nested?.unit??"");
                    const doseHa=Number(p.dosePerHectare??p.dose_per_hectare??0);
                    const doseTree=p.dosePerTree??p.dose_per_tree;
                    return (
                      <tr key={pi} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-2">
                          <span className="font-semibold text-[10px] px-1.5 py-0.5 rounded" style={{background:meta.bg,color:meta.color}}>{name}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 italic text-[9.5px]">{active}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 font-semibold">{fmt(qty,1)} {unit}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{doseHa>0?`${fmt(doseHa,2)} ${unit}/ha`:"—"}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{doseTree!=null?`${fmt(Number(doseTree),3)} ${unit}`:"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 px-3 py-2.5 border-t border-slate-100">
            {area!=null&&<Detail icon={<Ruler size={9}/>}      label="Surface"       val={`${area} ha`}/>}
            {trees!=null&&<Detail icon={<TreePine size={9}/>}  label="Arbres"        val={fmt(Number(trees))}/>}
            {volume!=null&&<Detail icon={<Droplets size={9}/>} label="Vol. bouillie" val={`${volume} ${volumeU}`}/>}
            {cost>0&&<Detail icon={<DollarSign size={9}/>}     label="Coût"          val={`${fmt(cost)} DZD`}/>}
            {operator&&<Detail icon={<Zap size={9}/>}          label="Opérateur"     val={operator}/>}
          </div>
          {(temp!=null||humidity!=null||wind!=null)&&(
            <div className="border-t border-slate-100 px-3 py-2">
              <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Météo</p>
              <div className="flex gap-4 flex-wrap">
                {temp!=null&&<span className="flex items-center gap-1 text-[10px] text-slate-600"><Thermometer size={10} className="text-orange-400"/>{String(temp)}°C</span>}
                {humidity!=null&&<span className="flex items-center gap-1 text-[10px] text-slate-600"><CloudRain size={10} className="text-blue-400"/>{String(humidity)}%</span>}
                {wind!=null&&<span className="flex items-center gap-1 text-[10px] text-slate-600"><Wind size={10} className="text-slate-400"/>{String(wind)} km/h</span>}
              </div>
            </div>
          )}
          {notes&&(
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

function Detail({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-slate-300 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[8.5px] text-slate-400 font-medium">{label}</p>
        <p className="text-[10.5px] text-slate-700 font-semibold leading-tight">{val}</p>
      </div>
    </div>
  );
}
