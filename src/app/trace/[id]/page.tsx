"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { useParcelles, useTreatments } from "@/hooks/useData";
import { findParcelle, treatmentsForParcelle, getProp, STATUS_LABELS, TYPE_LABELS } from "@/components/map/dashboard-map-utils";
import {
  GitBranch, Loader2, MapPin, Sprout, Droplets,
  History, ArrowLeft, CheckCircle2, Clock, AlertCircle, XCircle,
  FlaskConical, User, Target, Calendar, ChevronDown, Wrench,
} from "lucide-react";
import type { Parcelle } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; border: string; label: string; Icon: typeof Clock }> = {
  completed:   { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20", label: "Terminé",   Icon: CheckCircle2 },
  termine:     { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20", label: "Terminé",   Icon: CheckCircle2 },
  in_progress: { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700",   border: "border-amber-500/20",   label: "En cours",  Icon: Clock        },
  en_cours:    { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700",   border: "border-amber-500/20",   label: "En cours",  Icon: Clock        },
  planned:     { dot: "bg-sky-500",     bg: "bg-sky-500/10",     text: "text-sky-700",     border: "border-sky-500/20",     label: "Planifié",  Icon: AlertCircle  },
  planifie:    { dot: "bg-sky-500",     bg: "bg-sky-500/10",     text: "text-sky-700",     border: "border-sky-500/20",     label: "Planifié",  Icon: AlertCircle  },
  cancelled:   { dot: "bg-red-400",     bg: "bg-red-500/10",     text: "text-red-600",     border: "border-red-400/20",     label: "Annulé",    Icon: XCircle      },
  annule:      { dot: "bg-red-400",     bg: "bg-red-500/10",     text: "text-red-600",     border: "border-red-400/20",     label: "Annulé",    Icon: XCircle      },
  default:     { dot: "bg-slate-400",   bg: "bg-slate-500/10",   text: "text-slate-600",   border: "border-slate-400/20",   label: "—",         Icon: AlertCircle  },
};

export default function TraceDetailPage() {
  const params = useParams();
  const rawId = typeof params.id === "string" ? decodeURIComponent(params.id) : "";

  const { data: parcelles, loading: loadingP } = useParcelles();
  const { data: allTreatments, loading: loadingT } = useTreatments();
  const loading = loadingP || loadingT;

  const parcelle = useMemo<Parcelle | null>(() => {
    if (!parcelles || !rawId) return null;
    return findParcelle(parcelles as Parcelle[], rawId);
  }, [parcelles, rawId]);

  const treatments = useMemo<Record<string, unknown>[]>(() => {
    if (!parcelle || !allTreatments) return [];
    return treatmentsForParcelle(allTreatments as Record<string, unknown>[], parcelle);
  }, [parcelle, allTreatments]);

  const sorted = useMemo(() =>
    [...treatments].sort((a, b) => {
      const da = String(getProp(a, "plannedDate", "planned_date") || "");
      const db = String(getProp(b, "plannedDate", "planned_date") || "");
      return new Date(db).getTime() - new Date(da).getTime();
    }),
  [treatments]);

  const stats = useMemo(() => ({
    total:      sorted.length,
    done:       sorted.filter(t => ["completed","termine"].includes(String(getProp(t,"status","status")||""))).length,
    planned:    sorted.filter(t => ["planned","planifie"].includes(String(getProp(t,"status","status")||""))).length,
    inProgress: sorted.filter(t => ["in_progress","en_cours"].includes(String(getProp(t,"status","status")||""))).length,
  }), [sorted]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trace"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--surface-recessed)]"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Link>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Traçabilité</h1>
            {parcelle && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md font-bold" style={{ background: "var(--primary-010)", color: "var(--primary)" }}>
                {parcelle.name}
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="glass-card p-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Chargement…</span>
          </div>
        )}

        {!loading && !parcelle && (
          <div className="glass-card p-8 text-center space-y-2">
            <MapPin className="w-8 h-8 mx-auto opacity-30" style={{ color: "var(--text-secondary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Parcelle introuvable</p>
            <Link href="/parcelles" className="inline-block mt-2 text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Voir toutes les parcelles →
            </Link>
          </div>
        )}

        {!loading && parcelle && (
          <>
            {/* Parcelle identity */}
            <section className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                <MapPin className="w-4 h-4" />
                Parcelle & zone
              </div>
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-white shadow" style={{ background: parcelle.color }} />
                <div className="flex-1">
                  <p className="text-base font-bold" style={{ color: parcelle.color }}>{parcelle.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {parcelle.areaHectares} ha · {parcelle.cropType}{parcelle.variete ? ` · ${parcelle.variete}` : ""}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
                {[
                  { label: "Zone",         val: parcelle.zone || "—" },
                  { label: "Secteur",      val: parcelle.secteur || "—" },
                  { label: "Sol",          val: parcelle.soilType || "—" },
                  { label: "Irrigation",   val: parcelle.irrigation || "—" },
                  { label: "Densité",      val: parcelle.densitePlantation ? `${parcelle.densitePlantation} ${parcelle.densiteUnit || "arb/ha"}` : "—" },
                  { label: "Implantation", val: parcelle.dateImplantation || "—" },
                  { label: "Site",         val: parcelle.site || "—" },
                  { label: "Exploitation", val: "Domaine Khelifa" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</dt>
                    <dd className="font-medium mt-0.5 text-sm" style={{ color: "var(--text-primary)" }}>{val}</dd>
                  </div>
                ))}
              </dl>
              {parcelle.observations && (
                <p className="text-xs italic border-t pt-3" style={{ color: "var(--text-secondary)", borderColor: "var(--glass-border)" }}>
                  {parcelle.observations}
                </p>
              )}
            </section>

            {/* Plantation */}
            <section className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                <Sprout className="w-4 h-4" />
                Plantation
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "Culture",        val: parcelle.cropType || "—" },
                  { label: "Variété",        val: parcelle.variete || "—" },
                  { label: "Date plantation",val: parcelle.dateImplantation || "—" },
                  { label: "Nb plants estimé",val: parcelle.densitePlantation ? `${Math.round(parcelle.densitePlantation * parcelle.areaHectares).toLocaleString("fr-FR")}` : "—" },
                  { label: "Type culture",   val: parcelle.cultureType || "—" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</dt>
                    <dd className="font-medium mt-0.5 text-sm" style={{ color: "var(--text-primary)" }}>{val}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { n: stats.total,      label: "Interventions", cls: ""                },
                { n: stats.done,       label: "Terminées",     cls: "text-emerald-700"},
                { n: stats.inProgress, label: "En cours",      cls: "text-amber-700"  },
                { n: stats.planned,    label: "Planifiées",    cls: "text-sky-700"    },
              ].map(s => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <div className={cn("text-2xl font-black", s.cls)} style={!s.cls ? { color: "var(--text-primary)" } : {}}>{s.n}</div>
                  <div className="text-[10px] uppercase tracking-wide mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Treatments timeline */}
            <section className="glass-card overflow-hidden">
              <div className="px-6 py-4 flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
                <Droplets className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                  Interventions ({sorted.length})
                </span>
              </div>

              {sorted.length === 0 ? (
                <p className="p-10 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                  Aucune intervention liée à cette parcelle.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                  {sorted.map((t, idx) => {
                    const type       = String(getProp(t, "type", "type") || "");
                    const rawStatus  = String(getProp(t, "status", "status") || "");
                    const st         = STATUS_CONFIG[rawStatus] ?? STATUS_CONFIG.default;
                    const StatusIcon = st.Icon;
                    const dateRaw    = getProp(t, "plannedDate", "planned_date");
                    const date       = dateRaw
                      ? new Date(String(dateRaw)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                      : "—";
                    const operator  = String(getProp(t, "operatorName", "operator_name") || "");
                    const site      = String(getProp(t, "sousParcelleName", "site_name") || getProp(t, "parcelleName", "parcelle_name") || "");
                    const cible     = String((t as any).cible || "");
                    const materiel  = String((t as any).materiel || "");

                    // Product list — prefer produitsDetail, fall back to treatment_products
                    const detailProduits = (t as any).produitsDetail as any[] | undefined;
                    const rawProducts    = detailProduits?.length
                      ? detailProduits
                      : ((getProp(t, "products", "products") as unknown[]) ?? (getProp(t, "treatment_products", "treatment_products") as unknown[]) ?? []);
                    const products = Array.isArray(rawProducts) ? rawProducts as Record<string, unknown>[] : [];

                    return (
                      <div key={String(t.id ?? idx)} className="flex gap-4 px-6 py-5 hover:bg-[var(--surface-recessed)]/40 transition-colors">

                        {/* Left: index + dot */}
                        <div className="flex flex-col items-center shrink-0 w-8 pt-1">
                          <span className="font-mono text-[9px] font-bold mb-2" style={{ color: "var(--text-tertiary)" }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0", st.dot)} />
                          {idx < sorted.length - 1 && (
                            <div className="flex-1 w-px mt-2 bg-[var(--glass-border)] min-h-[16px]" />
                          )}
                        </div>

                        {/* Right: content */}
                        <div className="flex-1 min-w-0">

                          {/* Row 1: type + date + status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>
                                {TYPE_LABELS[type] || type || "Traitement"}
                              </span>
                              <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                                <Calendar className="w-3 h-3 inline" />{date}
                              </span>
                            </div>
                            <span className={cn("inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border", st.text, st.bg, st.border)}>
                              <StatusIcon className="w-3 h-3" />
                              {STATUS_LABELS[rawStatus] || st.label}
                            </span>
                          </div>

                          {/* Row 2: cible */}
                          {cible && (
                            <p className="flex items-center gap-1.5 text-[11px] mb-2.5" style={{ color: "var(--text-secondary)" }}>
                              <Target className="w-3 h-3 text-red-400 shrink-0" />
                              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{cible}</span>
                            </p>
                          )}

                          {/* Row 3: products as chips */}
                          {products.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {products.slice(0, 6).map((p, pi) => {
                                const nested = p.products as Record<string, unknown> | undefined;
                                const name   = String(p.nom_commercial || p.productName || p.tradeName || nested?.trade_name || "Produit");
                                const dose   = p.dose_hl != null && String(p.dose_hl) !== "" ? String(p.dose_hl) : "";
                                const qtyRaw = p.quantityUsed ?? p.quantity_used;
                                const qty    =
                                  typeof qtyRaw === "number" || typeof qtyRaw === "string" ? qtyRaw : null;
                                const unit   = String(p.unit || "");
                                return (
                                  <span key={pi} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ background: "var(--primary-015)", color: "var(--primary)", borderColor: "var(--primary-025)" }}>
                                    <FlaskConical className="w-2.5 h-2.5 shrink-0" />
                                    {name}
                                    {dose ? <span className="opacity-60">{dose} L/hl</span> : qty != null ? <span className="opacity-60">{qty}{unit}</span> : null}
                                  </span>
                                );
                              })}
                              {products.length > 6 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  +{products.length - 6}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Row 4: meta pills */}
                          <div className="flex flex-wrap gap-2">
                            {operator && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <div className="w-4 h-4 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center shrink-0">
                                  <span className="text-[7px] font-black text-stone-600 uppercase">{operator[0]}</span>
                                </div>
                                {operator}
                              </span>
                            )}
                            {site && site !== parcelle.name && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <MapPin className="w-3 h-3" />{site}
                              </span>
                            )}
                            {materiel && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <Wrench className="w-3 h-3" />{materiel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Plantation history */}
            <section className="glass-card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
                <History className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                  Historique plantation (SCD2)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                      <th className="text-left py-2 px-4 font-medium text-xs">v</th>
                      <th className="text-left py-2 px-4 font-medium text-xs">Culture</th>
                      <th className="text-left py-2 px-4 font-medium text-xs">Variété</th>
                      <th className="text-left py-2 px-4 font-medium text-xs">Depuis</th>
                      <th className="text-left py-2 px-4 font-medium text-xs">Actuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-400">1</td>
                      <td className="py-2.5 px-4 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{parcelle.cropType || "—"}</td>
                      <td className="py-2.5 px-4 text-sm" style={{ color: "var(--text-secondary)" }}>{parcelle.variete || "—"}</td>
                      <td className="py-2.5 px-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{parcelle.dateImplantation || "—"}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Actuel</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Sub-parcelles */}
            {parcelle.children && parcelle.children.length > 0 && (
              <section className="glass-card overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
                  <GitBranch className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                    Sous-parcelles ({parcelle.children.length})
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                  {parcelle.children.map(child => (
                    <Link
                      key={child.id}
                      href={`/trace/${encodeURIComponent(child.id)}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-recessed)]/40 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: child.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{child.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {child.areaHectares} ha · {child.cropType}{child.variete ? ` · ${child.variete}` : ""}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 -rotate-90" style={{ color: "var(--text-secondary)" }} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
