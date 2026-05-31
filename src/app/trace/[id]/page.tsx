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
} from "lucide-react";
import type { Parcelle } from "@/lib/mock-data";

const STATUS_CLS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  termine:   "bg-emerald-100 text-emerald-800",
  in_progress:"bg-amber-100 text-amber-800",
  en_cours:  "bg-amber-100 text-amber-800",
  planned:   "bg-stone-100 text-stone-600",
  planifie:  "bg-stone-100 text-stone-600",
  cancelled: "bg-red-100 text-red-700",
  annule:    "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed:   <CheckCircle2 className="w-3 h-3" />,
  termine:     <CheckCircle2 className="w-3 h-3" />,
  in_progress: <Clock className="w-3 h-3" />,
  en_cours:    <Clock className="w-3 h-3" />,
  planned:     <AlertCircle className="w-3 h-3" />,
  planifie:    <AlertCircle className="w-3 h-3" />,
  cancelled:   <XCircle className="w-3 h-3" />,
  annule:      <XCircle className="w-3 h-3" />,
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
    total: sorted.length,
    done:    sorted.filter(t => { const s = String(getProp(t,"status","status")||""); return s==="completed"||s==="termine"; }).length,
    planned: sorted.filter(t => { const s = String(getProp(t,"status","status")||""); return s==="planned"||s==="planifie"; }).length,
    inProgress: sorted.filter(t => { const s = String(getProp(t,"status","status")||""); return s==="in_progress"||s==="en_cours"; }).length,
  }), [sorted]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trace"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Link>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Traçabilité
            </h1>
            {parcelle && (
              <span
                className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md font-mono"
                style={{ background: "var(--primary-010)", color: "var(--primary)" }}
              >
                parcelle
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
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Aucune parcelle ne correspond à l&apos;identifiant <code className="font-mono text-xs bg-stone-100 px-1 rounded">{rawId}</code>
            </p>
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
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-white shadow"
                  style={{ background: parcelle.color }}
                />
                <div className="flex-1">
                  <p className="text-base font-bold" style={{ color: parcelle.color }}>{parcelle.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {parcelle.areaHectares} ha · {parcelle.cropType}
                    {parcelle.variete ? ` · ${parcelle.variete}` : ""}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
                {[
                  { label: "Zone", val: parcelle.zone || "—" },
                  { label: "Secteur", val: parcelle.secteur || "—" },
                  { label: "Sol", val: parcelle.soilType || "—" },
                  { label: "Irrigation", val: parcelle.irrigation || "—" },
                  { label: "Densité", val: parcelle.densitePlantation ? `${parcelle.densitePlantation} ${parcelle.densiteUnit || "arb/ha"}` : "—" },
                  { label: "Implantation", val: parcelle.dateImplantation || "—" },
                  { label: "Site", val: parcelle.site || "—" },
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
                  { label: "Culture", val: parcelle.cropType || "—" },
                  { label: "Variété", val: parcelle.variete || "—" },
                  { label: "Date plantation", val: parcelle.dateImplantation || "—" },
                  { label: "Nb plants estimé", val: parcelle.densitePlantation ? `${Math.round(parcelle.densitePlantation * parcelle.areaHectares).toLocaleString("fr-FR")}` : "—" },
                  { label: "Type culture", val: parcelle.cultureType || "—" },
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
                { n: stats.total, label: "Interventions", cls: "" },
                { n: stats.done, label: "Terminées", cls: "text-emerald-700" },
                { n: stats.inProgress, label: "En cours", cls: "text-amber-700" },
                { n: stats.planned, label: "Planifiées", cls: "text-stone-600" },
              ].map(s => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <div className={`text-2xl font-bold ${s.cls}`} style={!s.cls ? { color: "var(--text-primary)" } : {}}>{s.n}</div>
                  <div className="text-[10px] uppercase tracking-wide mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Treatments timeline */}
            <section className="glass-card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
                <Droplets className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                  Interventions ({sorted.length})
                </span>
              </div>

              {sorted.length === 0 ? (
                <p className="p-8 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                  Aucune intervention liée à cette parcelle.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                  {sorted.map(t => {
                    const type = String(getProp(t, "type", "type") || "");
                    const rawStatus = String(getProp(t, "status", "status") || "");
                    const dateRaw = getProp(t, "plannedDate", "planned_date");
                    const date = dateRaw
                      ? new Date(String(dateRaw)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                      : "—";
                    const operator = String(getProp(t, "operatorName", "operator_name") || "");
                    const site = String(getProp(t, "sousParcelleName", "site_name") || getProp(t, "parcelleName", "parcelle_name") || "");
                    const rawProducts = (getProp(t, "products", "products") as unknown[]) ?? (getProp(t, "treatment_products", "treatment_products") as unknown[]) ?? [];
                    const products = Array.isArray(rawProducts) ? rawProducts as Record<string, unknown>[] : [];
                    const pillCls = STATUS_CLS[rawStatus] ?? "bg-stone-100 text-stone-600";
                    const pillIcon = STATUS_ICON[rawStatus] ?? <AlertCircle className="w-3 h-3" />;

                    return (
                      <div key={String(t.id ?? Math.random())} className="px-5 py-4 flex gap-4 items-start hover:bg-stone-50/60 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              {TYPE_LABELS[type] || type || "Traitement"}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pillCls}`}>
                              {pillIcon}
                              {STATUS_LABELS[rawStatus] || rawStatus}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{date}</span>
                            {operator && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>👤 {operator}</span>}
                            {site && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>📍 {site}</span>}
                          </div>
                          {products.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {products.slice(0, 5).map((p, pi) => {
                                const nested = p.products as Record<string, unknown> | undefined;
                                const name = String(p.productName || p.tradeName || nested?.trade_name || "Produit");
                                const qty = p.quantityUsed ?? p.quantity_used;
                                const unit = String(p.unit || "");
                                return (
                                  <span key={pi} className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-700">
                                    {name}{qty != null ? ` · ${qty}${unit}` : ""}
                                  </span>
                                );
                              })}
                              {products.length > 5 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                                  +{products.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Historique SCD2 placeholder */}
            <section className="glass-card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
                <History className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                  Historique plantation (SCD2)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                      <th className="text-left py-2 px-4 font-medium">v</th>
                      <th className="text-left py-2 px-4 font-medium">Culture</th>
                      <th className="text-left py-2 px-4 font-medium">Variété</th>
                      <th className="text-left py-2 px-4 font-medium">Depuis</th>
                      <th className="text-left py-2 px-4 font-medium">Actuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td className="py-2 px-4 font-mono text-xs">1</td>
                      <td className="py-2 px-4">{parcelle.cropType || "—"}</td>
                      <td className="py-2 px-4">{parcelle.variete || "—"}</td>
                      <td className="py-2 px-4 text-xs font-mono">{parcelle.dateImplantation || "—"}</td>
                      <td className="py-2 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">oui</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Sub-parcelles if any */}
            {parcelle.children && parcelle.children.length > 0 && (
              <section className="glass-card overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
                  <GitBranch className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                    Sous-parcelles ({parcelle.children.length})
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                  {parcelle.children.map(child => (
                    <Link
                      key={child.id}
                      href={`/trace/${encodeURIComponent(child.id)}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: child.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{child.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {child.areaHectares} ha · {child.cropType}{child.variete ? ` · ${child.variete}` : ""}
                        </p>
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>→</span>
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
