"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Satellite, Sprout, Layers, FileText, TrendingUp,
  AlertTriangle, CheckCircle2, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageScreen } from "@/components/adaline/PageScreen";
import { averageIndex, getIndexLevel, isStressed } from "@/lib/agronome/satellite-utils";
import type { DashboardKPIs } from "@/lib/data-provider";
import type { DonneesSatellite } from "@/lib/mcd/types";

type Props = {
  kpis: DashboardKPIs | null;
  satelliteData: DonneesSatellite[];
  onLoadSatellite: () => void;
  satelliteLoading: boolean;
};

function ndviColor(v: number) {
  if (v >= 0.70) return "#16a34a";
  if (v >= 0.55) return "#65a30d";
  if (v >= 0.40) return "#d97706";
  return "#dc2626";
}

type TooltipPayload = { value: number; payload: { name: string } };

function NdviTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const v = entry.value;
  const lvl = getIndexLevel(v, "ndvi");
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{entry.payload.name}</p>
      <p style={{ color: ndviColor(v) }}>NDVI: {v.toFixed(3)} — <span>{lvl.label}</span></p>
    </div>
  );
}

export default function ConsultantDashboard({ kpis, satelliteData, onLoadSatellite, satelliteLoading }: Props) {
  const analysis = useMemo(() => {
    if (!satelliteData.length) return null;
    const avg = averageIndex(satelliteData, "ndvi");
    const level = avg !== null ? getIndexLevel(avg, "ndvi") : null;
    const stressed = satelliteData.filter(r => isStressed(r.indice_ndvi ?? 0, "ndvi"));
    const sorted = [...satelliteData].sort((a, b) => (a.indice_ndvi ?? 0) - (b.indice_ndvi ?? 0));
    const chartData = sorted.map(r => ({
      name: r.parcelle_name ?? r.parcelle_id,
      ndvi: Math.round((r.indice_ndvi ?? 0) * 1000) / 1000,
      ndwi: Math.round((r.indice_ndwi ?? 0) * 1000) / 1000,
    }));
    const acqDate = satelliteData[0]?.date_acquisition ?? null;
    return { avg, level, stressed, sorted, chartData, total: satelliteData.length, acqDate };
  }, [satelliteData]);

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <PageScreen className="cons-full-dashboard">
      <div className="cons-fd-inner">
        {/* Header */}
        <div className="cons-fd-header-row">
          <div>
            <h1 className="cons-fd-title">Analyse stratégique · Consultant</h1>
            <p className="cons-fd-date">{dateStr}</p>
          </div>
        </div>

        {/* NDVI Summary */}
        {analysis ? (
          <div className="cons-fd-summary" style={{
            background: analysis.stressed.length > 0 ? "#fffbeb" : "#f0fdf4",
            borderColor: analysis.stressed.length > 0 ? "#fed7aa" : "#bbf7d0",
          }}>
            <div className="cons-fd-summary-left">
              <p className="cons-fd-summary-tag">
                <Satellite className="w-3.5 h-3.5" />
                Sentinel-2 · NDVI moyen
              </p>
              <p className="cons-fd-summary-val" style={{ color: ndviColor(analysis.avg ?? 0) }}>
                {analysis.avg?.toFixed(3) ?? "—"}
              </p>
              <p className="cons-fd-summary-level" style={{ color: ndviColor(analysis.avg ?? 0) }}>
                {analysis.level?.label}
              </p>
              {analysis.acqDate && (
                <p className="cons-fd-summary-acq">
                  Acquisition: {new Date(analysis.acqDate).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
            <div className="cons-fd-summary-right">
              <p className="cons-fd-summary-lead">
                {analysis.stressed.length > 0
                  ? `${analysis.stressed.length} parcelle${analysis.stressed.length > 1 ? "s" : ""} en stress détectées — intervention recommandée`
                  : "Végétation satisfaisante · Surveillance périodique suffisante"}
              </p>
              <div className="cons-fd-summary-stats">
                {[
                  { n: analysis.total, l: "Parcelles analysées" },
                  { n: analysis.stressed.length, l: "En stress", warn: analysis.stressed.length > 0 },
                  { n: kpis?.traitementsMois ?? "—", l: "Traitements/mois" },
                  { n: kpis?.stressedParcels ?? 0, l: "Stress signalés", warn: (kpis?.stressedParcels ?? 0) > 0 },
                ].map(s => (
                  <div key={s.l} className="cons-fd-stat">
                    <span className={cn("cons-fd-stat-n", s.warn && "text-amber-600")}>{s.n}</span>
                    <span className="cons-fd-stat-l">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="cons-fd-no-data">
            <Satellite className="w-12 h-12 opacity-30 mx-auto mb-2" />
            <p className="cons-fd-no-data-title">Données satellite non chargées</p>
            <p className="cons-fd-no-data-sub">Indices NDVI/NDWI Sentinel-2 L2A disponibles via Copernicus</p>
            <button
              type="button"
              className="agro-action-btn mt-2"
              onClick={onLoadSatellite}
              disabled={satelliteLoading}
            >
              {satelliteLoading ? "Chargement…" : <><Satellite className="w-4 h-4" />Charger les données satellite</>}
            </button>
          </div>
        )}

        {/* NDVI Bar Chart */}
        {analysis && analysis.chartData.length > 0 && (
          <section className="cons-fd-panel">
            <header className="cons-fd-panel-hd">
              <span className="agro-label-chip">
                <BarChart3 className="w-3.5 h-3.5" />
                NDVI par parcelle
              </span>
              <span className="cons-fd-acq-date">Sentinel-2 · {analysis.acqDate ? new Date(analysis.acqDate).toLocaleDateString("fr-FR") : "—"}</span>
            </header>
            <div className="cons-fd-chart-wrap">
              <ResponsiveContainer width="100%" height={Math.max(200, analysis.chartData.length * 38)}>
                <BarChart
                  data={analysis.chartData}
                  layout="vertical"
                  margin={{ left: 0, right: 48, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" domain={[0, 1]} tickCount={6} tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#444" }}
                    width={120}
                  />
                  <Tooltip content={<NdviTooltip />} />
                  <ReferenceLine x={0.55} stroke="#d97706" strokeDasharray="4 2" label={{ value: "Stress", fontSize: 10, fill: "#d97706", position: "insideTopRight" }} />
                  <Bar dataKey="ndvi" radius={[0, 5, 5, 0]} label={{ position: "right", formatter: (v: unknown) => typeof v === "number" ? v.toFixed(3) : "", fontSize: 11, fill: "#666" }}>
                    {analysis.chartData.map((entry, i) => (
                      <Cell key={i} fill={ndviColor(entry.ndvi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="cons-fd-legend">
              {[
                { color: "#16a34a", label: "≥ 0.70 · Excellent" },
                { color: "#65a30d", label: "≥ 0.55 · Bon" },
                { color: "#d97706", label: "≥ 0.40 · Modéré" },
                { color: "#dc2626", label: "< 0.40 · Stress sévère" },
              ].map(l => (
                <div key={l.label} className="cons-fd-legend-item">
                  <span className="cons-fd-legend-dot" style={{ background: l.color }} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Strategic recommendations */}
        {analysis && analysis.stressed.length > 0 && (
          <section className="cons-fd-panel">
            <header className="cons-fd-panel-hd">
              <span className="agro-label-chip">
                <AlertTriangle className="w-3.5 h-3.5" />
                Recommandations stratégiques
              </span>
            </header>
            <div className="cons-fd-reco-list">
              {analysis.stressed.slice(0, 4).map(r => {
                const lvl = getIndexLevel(r.indice_ndvi ?? 0, "ndvi");
                return (
                  <div key={r.parcelle_id} className={cn("cons-fd-reco", (r.indice_ndvi ?? 0) < 0.4 ? "cons-fd-reco--red" : "cons-fd-reco--amber")}>
                    <Sprout className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="cons-fd-reco-name">{r.parcelle_name ?? r.parcelle_id}</p>
                      <p className="cons-fd-reco-action">NDVI {(r.indice_ndvi ?? 0).toFixed(3)} · {lvl.label} — {lvl.action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <div className="cons-fd-quick">
          <button type="button" className="agro-action-btn" onClick={onLoadSatellite} disabled={satelliteLoading}>
            <Satellite className="w-4 h-4" />{satelliteLoading ? "Chargement…" : "Satellite"}
          </button>
          <Link href="/parcelles" className="agro-action-btn">
            <Layers className="w-4 h-4" />Parcelles
          </Link>
          <Link href="/reports" className="agro-action-btn">
            <FileText className="w-4 h-4" />Rapports
          </Link>
          <Link href="/treatments" className="agro-action-btn">
            <TrendingUp className="w-4 h-4" />Traitements
          </Link>
        </div>
      </div>
    </PageScreen>
  );
}
