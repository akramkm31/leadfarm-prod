"use client";

import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, ArrowRight, TrendingUp,
  Package, ClipboardList, Layers, FileText,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardKPIs } from "@/lib/data-provider";
import { useDirecteurMetrics } from "./useDirecteurMetrics";

const TONE_CLASSES = {
  red: "agro-cmd-lead--red",
  amber: "agro-cmd-lead--amber",
  blue: "agro-cmd-lead--blue",
};

type Props = {
  kpis: DashboardKPIs | null;
  onOpenTreatments: () => void;
};

export default function DashboardDirecteurOverlay({ kpis, onOpenTreatments }: Props) {
  const m = useDirecteurMetrics(kpis);
  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const hasUrgent = m.actions.some((a) => a.tone === "red");

  return (
    <div className="dir-dash-overlay" aria-label="Tableau de bord directeur">

      {/* Command panel */}
      <div className="agro-glass dir-cmd">
        <div className="agro-cmd-top">
          <span className="agro-cmd-kicker">
            <span className="agro-cmd-pulse" style={{ background: hasUrgent ? "#dc2626" : "#22c55e" }} aria-hidden />
            Direction · Vue d&apos;ensemble
          </span>
          <span className="agro-cmd-date">{dateStr}</span>
        </div>

        {m.actions.length === 0 ? (
          <div className={cn("agro-cmd-lead agro-cmd-lead--green")} style={{ pointerEvents: "none" }}>
            <CheckCircle2 className="w-[15px] h-[15px]" aria-hidden />
            <span className="agro-cmd-lead-txt">
              <span className="agro-cmd-lead-title">Exploitation nominale</span>
              <span className="agro-cmd-lead-sub">Aucune action urgente</span>
            </span>
          </div>
        ) : (
          <ul className="dir-actions">
            {m.actions.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className={cn("agro-cmd-lead dir-action", TONE_CLASSES[a.tone])}>
                  <AlertTriangle className="w-[13px] h-[13px] shrink-0" aria-hidden />
                  <span className="agro-cmd-lead-title" style={{ fontSize: 11 }}>{a.label}</span>
                  <ArrowRight className="w-[12px] h-[12px] ml-auto shrink-0 opacity-60" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="agro-cmd-stats" style={{ marginTop: 8 }}>
          <div className="agro-cmd-stat">
            <span className={cn("agro-cmd-stat-n", m.inProgress.length > 0 && "is-ok")}>{m.inProgress.length}</span>
            <span className="agro-cmd-stat-l"><Play className="w-[9px] h-[9px]" />En cours</span>
          </div>
          <div className="agro-cmd-stat">
            <span className="agro-cmd-stat-n">{kpis?.traitementsMois ?? "—"}</span>
            <span className="agro-cmd-stat-l">Ce mois</span>
          </div>
          <div className="agro-cmd-stat">
            <span className={cn("agro-cmd-stat-n", kpis?.parcellesEnDAR ? "is-warn" : undefined)}>
              {kpis?.parcellesEnDAR ?? "—"}
            </span>
            <span className="agro-cmd-stat-l">En DAR</span>
          </div>
        </div>
      </div>

      {/* Stock financier */}
      <div className="agro-glass dir-stock-card">
        <div className="agro-card-head">
          <span className="agro-label-chip">Stock phyto</span>
          <TrendingUp className="w-3.5 h-3.5 opacity-40" />
        </div>
        <div className="dir-stock-grid">
          <div className="dir-kpi">
            <span className={cn("dir-kpi-n", m.criticalStock.length > 0 && "is-bad")}>{m.criticalStock.length}</span>
            <span className="agro-cmd-stat-l">Critique</span>
          </div>
          <div className="dir-kpi">
            <span className={cn("dir-kpi-n", m.lowStock.length > 0 && "is-warn")}>{m.lowStock.length}</span>
            <span className="agro-cmd-stat-l">Stock bas</span>
          </div>
          <div className="dir-kpi">
            <span className={cn("dir-kpi-n", m.expiringStock.length > 0 && "is-warn")}>{m.expiringStock.length}</span>
            <span className="agro-cmd-stat-l">Péremption</span>
          </div>
        </div>
        {(m.criticalStock.length > 0 || m.lowStock.length > 0) && (
          <Link href="/stock" className="agro-weather-link">
            <Package className="w-3 h-3" />
            Voir le stock
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="oper-action-row">
        <button type="button" className="agro-action-btn" onClick={onOpenTreatments}>
          <ClipboardList className="w-4 h-4" />
          Traitements
        </button>
        <Link href="/parcelles" className="agro-action-btn">
          <Layers className="w-4 h-4" />
          Parcelles
        </Link>
        <Link href="/reports" className="agro-action-btn">
          <FileText className="w-4 h-4" />
          Rapports
        </Link>
      </div>

    </div>
  );
}
