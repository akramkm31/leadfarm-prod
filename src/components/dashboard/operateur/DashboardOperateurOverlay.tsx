"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Play, CheckCircle2, AlertTriangle, ArrowRight, Wind,
  Thermometer, Droplets, Navigation, ClipboardList, Calendar,
  CheckCircle, Circle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMeteo, type MeteoData, type DashboardKPIs } from "@/lib/data-provider";
import { getExploitationCentroid } from "@/lib/agronome/geo-utils";
import { useParcelles } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import { useOperateurMetrics } from "./useOperateurMetrics";

const TONE_ICONS = {
  red: AlertTriangle,
  amber: Calendar,
  blue: Play,
  green: CheckCircle2,
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  in_progress: Play,
  approved: CheckCircle,
  planned: Circle,
};

type Props = {
  kpis: DashboardKPIs | null;
  onOpenTreatments: () => void;
};

export default function DashboardOperateurOverlay({ kpis, onOpenTreatments }: Props) {
  const [meteo, setMeteo] = useState<MeteoData | null>(null);
  const [meteoLoading, setMeteoLoading] = useState(true);
  const { data: parcRaw } = useParcelles();
  const parcelles = (parcRaw ?? []) as Parcelle[];
  const centroid = useMemo(() => getExploitationCentroid(parcelles), [parcelles]);

  useEffect(() => {
    if (!centroid) { setMeteoLoading(false); return; }
    setMeteoLoading(true);
    fetchMeteo(centroid.lat, centroid.lng).then((d) => {
      setMeteo(d);
      setMeteoLoading(false);
    }).catch(() => setMeteoLoading(false));
  }, [centroid?.lat, centroid?.lng]);

  const metrics = useOperateurMetrics();
  const { lead, counts, upcomingTasks, inProgress } = metrics;
  const LeadIcon = TONE_ICONS[lead.tone];

  const windSpeed = meteo?.windspeed ?? null;
  const canSpray = windSpeed !== null ? windSpeed <= 19 : null;
  const rainProb = meteo?.precipitation_prob ?? null;
  const temp = meteo?.temperature ?? null;

  const goDecision: "go" | "caution" | "nogo" | null =
    canSpray === null ? null
    : !canSpray ? "nogo"
    : rainProb !== null && rainProb >= 40 ? "caution"
    : "go";

  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="oper-dash-overlay" aria-label="Tableau de bord opérateur">

      {/* Command panel */}
      <div className="agro-glass oper-cmd">
        <div className="agro-cmd-top">
          <span className="agro-cmd-kicker">
            <span className="agro-cmd-pulse" style={{ background: inProgress.length ? "#2563eb" : "#22c55e" }} aria-hidden />
            Opérateur · Mission du jour
          </span>
          <span className="agro-cmd-date">{dateStr}</span>
        </div>

        <Link href={lead.href} className={cn("agro-cmd-lead", `agro-cmd-lead--${lead.tone}`)}>
          <span className="agro-cmd-lead-ic">
            <LeadIcon className="w-[15px] h-[15px]" aria-hidden />
          </span>
          <span className="agro-cmd-lead-txt">
            <span className="agro-cmd-lead-title">{lead.title}</span>
            <span className="agro-cmd-lead-sub">{lead.sub}</span>
          </span>
          <ArrowRight className="w-[14px] h-[14px] shrink-0 opacity-70" aria-hidden />
        </Link>

        <div className="agro-cmd-stats">
          <div className="agro-cmd-stat">
            <span className={cn("agro-cmd-stat-n", counts.inProgress > 0 && "is-ok")}>{counts.inProgress}</span>
            <span className="agro-cmd-stat-l">En cours</span>
          </div>
          <div className="agro-cmd-stat">
            <span className={cn("agro-cmd-stat-n", counts.today > 0 && "is-warn")}>{counts.today}</span>
            <span className="agro-cmd-stat-l">Aujourd&apos;hui</span>
          </div>
          <div className="agro-cmd-stat">
            <span className={cn("agro-cmd-stat-n", counts.overdue > 0 && "is-bad")}>{counts.overdue}</span>
            <span className="agro-cmd-stat-l">En retard</span>
          </div>
        </div>
      </div>

      {/* Weather go/no-go */}
      <div className="agro-glass oper-weather-card">
        <div className="agro-card-head">
          <span className="agro-label-chip">Conditions terrain</span>
          {!meteoLoading && goDecision && (
            <span className={cn("agro-spray-badge",
              goDecision === "go" ? "is-ok" : goDecision === "caution" ? "is-warn" : "is-bad"
            )}>
              {goDecision === "go" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {goDecision === "go" ? "Traitement OK" : goDecision === "caution" ? "Attention" : "Stop"}
            </span>
          )}
        </div>
        {meteoLoading ? (
          <div className="agro-loading"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : meteo ? (
          <>
            <div className="agro-weather-stats" style={{ marginTop: 6 }}>
              <div className="agro-stat">
                <Wind className="w-3.5 h-3.5" />
                <span className={cn(canSpray === false && "text-red-600 font-bold")}>{windSpeed} km/h</span>
              </div>
              <div className="agro-stat">
                <Droplets className="w-3.5 h-3.5" />
                <span className={cn(rainProb !== null && rainProb >= 40 && "text-amber-600 font-bold")}>{rainProb}%</span>
              </div>
              <div className="agro-stat">
                <Thermometer className="w-3.5 h-3.5" />
                <span>{temp}°C</span>
              </div>
            </div>
            {goDecision === "nogo" && (
              <p className="agro-cmd-foot" style={{ color: "#dc2626", fontWeight: 600 }}>Vent &gt; 19 km/h — dérive</p>
            )}
            {goDecision === "caution" && (
              <p className="agro-cmd-foot" style={{ color: "#d97706" }}>Pluie probable — lessivage</p>
            )}
          </>
        ) : (
          <p className="agro-cmd-foot">Météo indisponible</p>
        )}
      </div>

      {/* Task list */}
      {upcomingTasks.length > 0 && (
        <div className="agro-glass oper-task-list">
          <div className="agro-card-head">
            <span className="agro-label-chip">Mes tâches</span>
            <ClipboardList className="w-3.5 h-3.5 opacity-50" />
          </div>
          <ul className="oper-tasks">
            {upcomingTasks.map((t) => {
              const Icon = STATUS_ICONS[t.status] ?? Circle;
              const today = new Date().toISOString().slice(0, 10);
              const isLate = t.status !== "in_progress" && t.plannedDate < today;
              return (
                <li key={t.id} className={cn("oper-task", t.status === "in_progress" && "oper-task--active", isLate && "oper-task--late")}>
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
                  <div className="oper-task-text">
                    <span className="oper-task-name">{t.sousParcelleName || t.parcelleName}</span>
                    <span className="oper-task-meta">
                      {t.type === "pulverisation" ? "Pulvérisation" : t.type === "fertilisation" ? "Fertilisation" : t.type}
                      {" · "}{t.products[0]?.productName ?? "—"}
                    </span>
                  </div>
                  {isLate && <span className="oper-task-late">Retard</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* DAR alert */}
      {kpis && kpis.parcellesEnDAR > 0 && (
        <div className="agro-glass oper-dar-card">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <p className="agro-cmd-lead-title" style={{ fontSize: 11 }}>
              {kpis.parcellesEnDAR} parcelle{kpis.parcellesEnDAR > 1 ? "s" : ""} en DAR
            </p>
            <p className="agro-cmd-lead-sub">Récolte interdite — respecter le délai</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="oper-action-row">
        <button type="button" className="agro-action-btn" onClick={onOpenTreatments}>
          <ClipboardList className="w-4 h-4" />
          Traitements
        </button>
        <Link href="/trace" className="agro-action-btn">
          <Navigation className="w-4 h-4" />
          GPS / Trace
        </Link>
      </div>

    </div>
  );
}
