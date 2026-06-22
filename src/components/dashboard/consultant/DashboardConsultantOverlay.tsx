"use client";

import Link from "next/link";
import { Satellite, TrendingUp, FileText, Layers, Sprout, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { averageIndex, getIndexLevel } from "@/lib/agronome/satellite-utils";
import type { DashboardKPIs } from "@/lib/data-provider";
import type { DonneesSatellite } from "@/lib/mcd/types";

type Props = {
  kpis: DashboardKPIs | null;
  satelliteData: DonneesSatellite[];
  onOpenSatellite: () => void;
};

export default function DashboardConsultantOverlay({ kpis, satelliteData, onOpenSatellite }: Props) {
  const rows = satelliteData.length ? satelliteData : [];

  const analysis = useMemo(() => {
    if (!rows.length) return null;
    const avg = averageIndex(rows, "ndvi");
    const level = avg !== null ? getIndexLevel(avg, "ndvi") : null;
    const stressed = rows.filter((r) => (r.indice_ndvi ?? 0) < 0.55).length;
    const acquisitionDate = rows[0]?.date_acquisition ?? null;
    return { avg, level, stressed, total: rows.length, acquisitionDate };
  }, [rows]);

  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="cons-dash-overlay" aria-label="Tableau de bord consultant">
      <div className="agro-glass cons-cmd">
        <div className="agro-cmd-top">
          <span className="agro-cmd-kicker">
            <Satellite className="w-3 h-3" />
            Consultant · Analyse stratégique
          </span>
          <span className="agro-cmd-date">{dateStr}</span>
        </div>

        {analysis ? (
          <>
            <div className={cn("agro-cmd-lead", analysis.stressed > 0 ? "agro-cmd-lead--amber" : "agro-cmd-lead--green")}
              style={{ cursor: "default", pointerEvents: "none" }}>
              <Sprout className="w-[14px] h-[14px]" aria-hidden />
              <span className="agro-cmd-lead-txt">
                <span className="agro-cmd-lead-title">
                  NDVI moyen: {analysis.avg?.toFixed(3)} — {analysis.level?.label}
                </span>
                <span className="agro-cmd-lead-sub">
                  {analysis.stressed > 0
                    ? `${analysis.stressed} parcelle${analysis.stressed > 1 ? "s" : ""} en stress — ${analysis.level?.action}`
                    : "Végétation satisfaisante sur l'ensemble de l'exploitation"}
                </span>
              </span>
            </div>

            <div className="agro-cmd-stats">
              <div className="agro-cmd-stat">
                <span className="agro-cmd-stat-n">{analysis.total}</span>
                <span className="agro-cmd-stat-l">Parcelles</span>
              </div>
              <div className="agro-cmd-stat">
                <span className={cn("agro-cmd-stat-n", analysis.stressed > 0 && "is-warn")}>{analysis.stressed}</span>
                <span className="agro-cmd-stat-l">En stress</span>
              </div>
              <div className="agro-cmd-stat">
                <span className="agro-cmd-stat-n">{kpis?.traitementsMois ?? "—"}</span>
                <span className="agro-cmd-stat-l">Traitements/mois</span>
              </div>
            </div>

            {analysis.acquisitionDate && (
              <p className="agro-cmd-foot">
                Sentinel-2 · {new Date(analysis.acquisitionDate).toLocaleDateString("fr-FR")}
              </p>
            )}
          </>
        ) : (
          <div className="agro-cmd-lead agro-cmd-lead--blue" style={{ cursor: "pointer" }} onClick={onOpenSatellite}>
            <Satellite className="w-[14px] h-[14px]" aria-hidden />
            <span className="agro-cmd-lead-txt">
              <span className="agro-cmd-lead-title">Charger les données satellite</span>
              <span className="agro-cmd-lead-sub">Indices NDVI/NDWI Sentinel-2 L2A</span>
            </span>
            <ArrowRight className="w-[13px] h-[13px] ml-auto opacity-60" aria-hidden />
          </div>
        )}
      </div>

      <div className="oper-action-row">
        <button type="button" className="agro-action-btn" onClick={onOpenSatellite}>
          <Satellite className="w-4 h-4" />
          Satellite
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
