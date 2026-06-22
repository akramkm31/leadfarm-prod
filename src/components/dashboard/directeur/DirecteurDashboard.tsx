"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle, Package, Calendar, Layers, FileText,
  Settings, RefreshCw, CheckCircle2, ArrowRight, TrendingUp, Clock,
  Hourglass, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageScreen } from "@/components/adaline/PageScreen";
import { useTreatments, useStockLevels } from "@/hooks/useData";
import type { DashboardKPIs } from "@/lib/data-provider";
import type { Treatment, StockLevel } from "@/lib/mock-data";

const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), { ssr: false });

type Props = {
  kpis: DashboardKPIs | null;
  loading: boolean;
  onRefresh: () => void;
  variant?: "directeur" | "responsable_technique";
};

export default function DirecteurDashboard({ kpis, loading, onRefresh, variant = "directeur" }: Props) {
  const { data: treatRaw } = useTreatments();
  const { data: stockRaw } = useStockLevels();
  const treatments = (treatRaw ?? []) as Treatment[];
  const stock = (stockRaw ?? []) as StockLevel[];

  const m = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10);

    const overdue    = treatments.filter(t => t.status === "planned" && t.plannedDate < today);
    const pending    = treatments.filter(t => t.status === "pending_approval");
    const inProgress = treatments.filter(t => t.status === "in_progress");
    const monthDone  = treatments.filter(
      t => t.status === "completed" && (t.completedDate ?? t.plannedDate) >= monthStart,
    );
    const recentAll = [...treatments]
      .sort((a, b) => ((b.completedDate ?? b.plannedDate) > (a.completedDate ?? a.plannedDate) ? 1 : -1))
      .slice(0, 8);
    const criticalStock = stock.filter(s => s.status === "critical");
    const lowStock      = stock.filter(s => s.status === "low");

    type ActionIcon = typeof AlertTriangle;
    const actions: Array<{ tone: "red" | "amber"; title: string; sub: string; href: string; icon: ActionIcon }> = [];
    if (pending.length)
      actions.push({ tone: "red", icon: Hourglass, title: `${pending.length} traitement${pending.length > 1 ? "s" : ""} en attente d'approbation`, sub: "Réviser avant exécution terrain", href: "/treatments?status=pending_approval" });
    if (overdue.length)
      actions.push({ tone: "red", icon: AlertTriangle, title: `${overdue.length} traitement${overdue.length > 1 ? "s" : ""} en retard`, sub: `${overdue[0]?.sousParcelleName || overdue[0]?.parcelleName || "—"} — intervention requise`, href: "/treatments" });
    if (criticalStock.length)
      actions.push({ tone: "red", icon: Package, title: `${criticalStock.length} produit${criticalStock.length > 1 ? "s" : ""} en rupture critique`, sub: `${criticalStock[0]?.productName ?? "—"} — réapprovisionner`, href: "/stock" });
    if (kpis?.parcellesEnDAR)
      actions.push({ tone: "amber", icon: Layers, title: `${kpis.parcellesEnDAR} parcelle${kpis.parcellesEnDAR > 1 ? "s" : ""} en DAR`, sub: "Coordonner avec équipe terrain", href: "/parcelles" });
    if (lowStock.length)
      actions.push({ tone: "amber", icon: FlaskConical, title: `${lowStock.length} produit${lowStock.length > 1 ? "s" : ""} en stock bas`, sub: "Prévoir réapprovisionnement", href: "/stock" });
    if (kpis?.expiryCount)
      actions.push({ tone: "amber", icon: Clock, title: `${kpis.expiryCount} lot${kpis.expiryCount > 1 ? "s" : ""} à périmer dans 90 j`, sub: "Consommer en priorité", href: "/stock" });

    return { overdue, pending, inProgress, monthDone, recentAll, criticalStock, lowStock, actions };
  }, [treatments, stock, kpis]);

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const title = variant === "responsable_technique"
    ? "Vue d'ensemble · Responsable technique"
    : "Vue d'ensemble · Direction";

  return (
    <PageScreen className="dir-full-dashboard">
      <div className="dir-fd-inner">

        {/* Header */}
        <div className="dir-fd-header">
          <div>
            <h1 className="dir-fd-title">{title}</h1>
            <p className="dir-fd-date">{dateStr}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="agro-action-btn" onClick={onRefresh}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Actualiser
            </button>
            {[
              { href: "/treatments", icon: Calendar, label: "Traitements" },
              { href: "/parcelles",  icon: Layers,   label: "Parcelles" },
              { href: "/stock",      icon: Package,  label: "Stock" },
              { href: "/reports",    icon: FileText,  label: "Rapports" },
              { href: "/settings",   icon: Settings, label: "Paramètres" },
            ].map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.label} href={a.href} className="agro-action-btn">
                  <Icon className="w-3.5 h-3.5" />{a.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* KPI strip */}
        <div className="dir-fd-kpis">
          {[
            { label: "Traitements/mois", value: kpis?.traitementsMois ?? m.monthDone.length, icon: Calendar, href: "/treatments", tone: null },
            { label: "Surface ce mois",  value: kpis?.surfaceMois ?? 0, unit: "ha", icon: Layers, href: "/parcelles", tone: null },
            { label: "Alertes actives",  value: m.actions.length, icon: AlertTriangle, href: "/treatments", tone: m.actions.length > 0 ? "alert" : "ok" },
            { label: "En cours",         value: m.inProgress.length, icon: TrendingUp, href: "/treatments?status=in_progress", tone: m.inProgress.length ? "blue" : null },
            { label: "À approuver",      value: m.pending.length, icon: Clock, href: "/treatments?status=pending_approval", tone: m.pending.length ? "warn" : null },
          ].map(c => {
            const Icon = c.icon;
            return (
              <Link key={c.label} href={c.href}>
                <div className={cn("dir-fd-kpi", c.tone === "alert" && "dir-fd-kpi--alert", c.tone === "warn" && "dir-fd-kpi--warn", c.tone === "blue" && "dir-fd-kpi--blue", c.tone === "ok" && "dir-fd-kpi--ok")}>
                  <span className="dir-fd-kpi-label"><Icon className="w-3.5 h-3.5" />{c.label}</span>
                  <span className="dir-fd-kpi-val">{c.value}{c.unit && <span className="dir-fd-kpi-unit"> {c.unit}</span>}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── 3-column body ── */}
        <div className="dir-fd-body">

          {/* Left: Actions requises */}
          <div className="dir-fd-col">
            <section className="dir-fd-panel dir-fd-panel--grow">
              <header className="dir-fd-panel-hd">
                <span className="agro-label-chip">Actions requises</span>
                {m.actions.length > 0 && <span className="dir-fd-badge">{m.actions.length}</span>}
              </header>
              {m.actions.length === 0 ? (
                <div className="dir-fd-ok">
                  <CheckCircle2 className="w-7 h-7 text-green-500 shrink-0" />
                  <div>
                    <p className="dir-fd-ok-title">Exploitation stable</p>
                    <p className="dir-fd-ok-sub">Aucune action urgente</p>
                  </div>
                </div>
              ) : (
                <ul className="dir-fd-actions">
                  {m.actions.map((a, i) => {
                    const ActionIcon = a.icon;
                    return (
                      <li key={i}>
                        <Link href={a.href} className={cn("dir-fd-action", `dir-fd-action--${a.tone}`)}>
                          <ActionIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div className="dir-fd-action-body">
                            <span className="dir-fd-action-title">{a.title}</span>
                            <span className="dir-fd-action-sub">{a.sub}</span>
                          </div>
                          <ArrowRight className="w-3 h-3 shrink-0 opacity-50 ml-auto" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Center: Map */}
          <div className="dir-fd-map-wrap">
            <DashboardMap embedded hideQuickNav historyPanelExternal />
          </div>

          {/* Right: Activity + Recent treatments */}
          <div className="dir-fd-col">
            <section className="dir-fd-panel">
              <header className="dir-fd-panel-hd">
                <span className="agro-label-chip">Activité terrain</span>
              </header>
              <div className="dir-fd-stat-grid">
                {[
                  { n: m.inProgress.length,        l: "En cours",   tone: m.inProgress.length ? "blue" : null, href: "/treatments?status=in_progress" },
                  { n: m.overdue.length,            l: "En retard",  tone: m.overdue.length ? "red" : null,     href: "/treatments" },
                  { n: kpis?.parcellesEnDAR ?? 0,   l: "En DAR",     tone: (kpis?.parcellesEnDAR ?? 0) ? "amber" : null, href: "/parcelles" },
                  { n: m.criticalStock.length,      l: "Stock crit.", tone: m.criticalStock.length ? "red" : null, href: "/stock" },
                ].map(s => (
                  <Link key={s.l} href={s.href} className="dir-fd-stat">
                    <span className={cn("dir-fd-stat-n", s.tone === "red" && "text-red-600", s.tone === "amber" && "text-amber-600", s.tone === "blue" && "text-blue-600")}>{s.n}</span>
                    <span className="dir-fd-stat-l">{s.l}</span>
                  </Link>
                ))}
              </div>
              {kpis?.prochainRecolte && (
                <div className="dir-fd-harvest">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <div>
                    <p className="dir-fd-harvest-title">Prochaine récolte</p>
                    <p className="dir-fd-harvest-sub">{kpis.prochainRecolte.parcelleName} · {kpis.prochainRecolte.date}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="dir-fd-panel dir-fd-panel--grow">
              <header className="dir-fd-panel-hd">
                <span className="agro-label-chip">Traitements récents</span>
                <Link href="/treatments" className="dir-fd-link-sm">Tout voir →</Link>
              </header>
              {m.recentAll.length === 0 ? (
                <p className="dir-fd-empty">Aucun traitement enregistré</p>
              ) : (
                <div className="dir-fd-trt-list">
                  {m.recentAll.map(t => {
                    const isCompleted  = t.status === "completed";
                    const isInProgress = t.status === "in_progress";
                    const isPending    = t.status === "pending_approval";
                    return (
                      <div key={t.id} className="dir-fd-trt">
                        {isCompleted  && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                        {isInProgress && <TrendingUp   className="w-3 h-3 text-blue-500 shrink-0" />}
                        {isPending    && <Hourglass    className="w-3 h-3 text-amber-500 shrink-0" />}
                        {!isCompleted && !isInProgress && !isPending && (
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        )}
                        <span className="dir-fd-trt-name">{t.sousParcelleName || t.parcelleName || "—"}</span>
                        <span className="dir-fd-trt-date">{(t.completedDate ?? t.plannedDate)?.slice(0, 10)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

        </div>
      </div>
    </PageScreen>
  );
}
