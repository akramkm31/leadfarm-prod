"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2, AlertTriangle, Wind, Thermometer, Droplets,
  Navigation, ClipboardList, Play, Circle, CheckCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageScreen } from "@/components/adaline/PageScreen";
import { fetchMeteo, type MeteoData, type DashboardKPIs } from "@/lib/data-provider";
import { getExploitationCentroid } from "@/lib/agronome/geo-utils";
import { useParcelles } from "@/hooks/useData";
import { useOperateurMetrics } from "./useOperateurMetrics";
import type { Parcelle } from "@/lib/mock-data";

const STATUS_ICONS: Record<string, React.ElementType> = {
  in_progress: Play,
  approved: CheckCircle,
  planned: Circle,
};

type Props = { kpis: DashboardKPIs | null };

export default function OperateurDashboard({ kpis }: Props) {
  const [meteo, setMeteo] = useState<MeteoData | null>(null);
  const [meteoLoading, setMeteoLoading] = useState(true);
  const { data: parcRaw } = useParcelles();
  const parcelles = (parcRaw ?? []) as Parcelle[];
  const centroid = useMemo(() => getExploitationCentroid(parcelles), [parcelles]);

  useEffect(() => {
    if (!centroid) { setMeteoLoading(false); return; }
    setMeteoLoading(true);
    fetchMeteo(centroid.lat, centroid.lng)
      .then(d => { setMeteo(d); setMeteoLoading(false); })
      .catch(() => setMeteoLoading(false));
  }, [centroid?.lat, centroid?.lng]);

  const { lead, counts, upcomingTasks, inProgress } = useOperateurMetrics();

  const windSpeed = meteo?.windspeed ?? null;
  const rainProb = meteo?.precipitation_prob ?? null;
  const temp = meteo?.temperature ?? null;
  const canSpray = windSpeed !== null ? windSpeed <= 19 : null;
  const goDecision: "go" | "caution" | "nogo" | null =
    canSpray === null ? null
    : !canSpray ? "nogo"
    : rainProb !== null && rainProb >= 40 ? "caution"
    : "go";

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const activeTask = inProgress[0] ?? null;
  const pendingToday = upcomingTasks.filter(t => {
    const today = new Date().toISOString().slice(0, 10);
    return t.status !== "in_progress" && t.plannedDate === today;
  });
  const upcoming = upcomingTasks.filter(t => t.status !== "in_progress").slice(0, 5);

  return (
    <PageScreen className="oper-full-dashboard">
      <div className="oper-fd-inner">
        {/* Header */}
        <div className="oper-fd-header">
          <div>
            <h1 className="oper-fd-title">Mission du jour · Opérateur</h1>
            <p className="oper-fd-date">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("oper-fd-status-dot", inProgress.length ? "oper-fd-status-dot--active" : "oper-fd-status-dot--idle")} aria-hidden />
            <span className="oper-fd-status-label">
              {inProgress.length ? "En intervention" : counts.today > 0 ? `${counts.today} à réaliser` : "Pas de tâche"}
            </span>
          </div>
        </div>

        {/* Weather go/no-go — primary decision */}
        <div className={cn("oper-fd-weather", goDecision === "go" && "oper-fd-weather--go", goDecision === "caution" && "oper-fd-weather--caution", goDecision === "nogo" && "oper-fd-weather--nogo", goDecision === null && "oper-fd-weather--loading")}>
          {meteoLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin opacity-50" />
              <span className="oper-fd-weather-label">Chargement météo…</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="oper-fd-weather-label">Conditions terrain</p>
                  <p className="oper-fd-weather-verdict">
                    {goDecision === "go" && "✓ Traitement autorisé"}
                    {goDecision === "caution" && "⚠ Prudence — pluie probable"}
                    {goDecision === "nogo" && "✗ Stop — vent trop fort"}
                    {goDecision === null && "Météo indisponible"}
                  </p>
                </div>
                {goDecision && (
                  <span className={cn("oper-fd-weather-badge",
                    goDecision === "go" ? "oper-fd-weather-badge--go" : goDecision === "caution" ? "oper-fd-weather-badge--caution" : "oper-fd-weather-badge--nogo"
                  )}>
                    {goDecision === "go" ? "OK" : goDecision === "caution" ? "⚠" : "STOP"}
                  </span>
                )}
              </div>
              {meteo && (
                <div className="oper-fd-weather-stats">
                  <div className="oper-fd-weather-stat">
                    <Wind className="w-4 h-4" />
                    <span className={cn(canSpray === false && "font-bold")}>{windSpeed} km/h</span>
                    {canSpray === false && <span className="oper-fd-weather-tag oper-fd-weather-tag--bad">Limite 19</span>}
                  </div>
                  <div className="oper-fd-weather-stat">
                    <Droplets className="w-4 h-4" />
                    <span className={cn(rainProb !== null && rainProb >= 40 && "font-bold")}>{rainProb}%</span>
                    {rainProb !== null && rainProb >= 40 && <span className="oper-fd-weather-tag oper-fd-weather-tag--warn">Risque lessivage</span>}
                  </div>
                  <div className="oper-fd-weather-stat">
                    <Thermometer className="w-4 h-4" />
                    <span>{temp}°C</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Active treatment — featured card */}
        {activeTask && (
          <div className="oper-fd-active">
            <p className="oper-fd-active-tag">
              <span className="oper-fd-pulse" aria-hidden />
              En cours · {activeTask.type === "pulverisation" ? "Pulvérisation" : activeTask.type === "fertilisation" ? "Fertilisation" : activeTask.type}
            </p>
            <p className="oper-fd-active-name">{activeTask.sousParcelleName || activeTask.parcelleName}</p>
            <p className="oper-fd-active-meta">
              {activeTask.products[0]?.productName ?? "Produit non renseigné"}
              {activeTask.areaTreatedHectares > 0 && ` · ${activeTask.areaTreatedHectares} ha`}
            </p>
            <Link href="/live" className="oper-fd-active-cta">
              Reprendre sur Live GPS →
            </Link>
          </div>
        )}

        {/* Task list */}
        <section className="oper-fd-tasks-panel">
          <header className="oper-fd-tasks-hd">
            <span className="agro-label-chip">
              <ClipboardList className="w-3.5 h-3.5" />
              Mes tâches
            </span>
            <span className="oper-fd-tasks-count">
              {pendingToday.length > 0 ? `${pendingToday.length} aujourd'hui` : ""}
              {counts.overdue > 0 ? ` · ${counts.overdue} en retard` : ""}
            </span>
          </header>

          {upcoming.length === 0 && !activeTask ? (
            <div className="oper-fd-empty">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="font-medium text-[var(--text-secondary)]">Aucune tâche planifiée</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Toutes les interventions sont à jour</p>
            </div>
          ) : (
            <div className="oper-fd-task-list">
              {upcoming.map(t => {
                const today = new Date().toISOString().slice(0, 10);
                const isLate = t.plannedDate < today;
                const Icon = STATUS_ICONS[t.status] ?? Circle;
                return (
                  <div key={t.id} className={cn("oper-fd-task", isLate && "oper-fd-task--late")}>
                    <Icon className="w-4 h-4 shrink-0 opacity-60" aria-hidden />
                    <div className="min-w-0">
                      <p className="oper-fd-task-name">{t.sousParcelleName || t.parcelleName}</p>
                      <p className="oper-fd-task-meta">
                        {t.type === "pulverisation" ? "Pulvérisation" : t.type === "fertilisation" ? "Fertilisation" : t.type}
                        {" · "}{t.products[0]?.productName ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="oper-fd-task-date">{t.plannedDate}</span>
                      {isLate && <span className="oper-fd-task-late-tag">Retard</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* DAR alert */}
        {kpis && kpis.parcellesEnDAR > 0 && (
          <div className="oper-fd-dar">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="oper-fd-dar-text">
                {kpis.parcellesEnDAR} parcelle{kpis.parcellesEnDAR > 1 ? "s" : ""} en DAR
              </p>
              <p className="oper-fd-dar-sub">Récolte interdite — respecter le délai avant récolte</p>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="oper-fd-quick">
          <Link href="/live" className="agro-action-btn agro-action-btn--primary">
            <Play className="w-4 h-4" />Live GPS
          </Link>
          <Link href="/mobile" className="agro-action-btn">
            <Navigation className="w-4 h-4" />Mobile terrain
          </Link>
          <Link href="/treatments" className="agro-action-btn">
            <ClipboardList className="w-4 h-4" />Traitements
          </Link>
          <Link href="/trace" className="agro-action-btn">
            <Navigation className="w-4 h-4" />Trace
          </Link>
        </div>
      </div>
    </PageScreen>
  );
}
