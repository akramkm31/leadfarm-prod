"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DonneesSatellite } from "@/lib/mcd/types";
import {
  daysSinceAcquisition,
  estimateNextAcquisitionDays,
  formatSatelliteIndexDisplay,
  getNdwiMapColor,
  getSatelliteMapColor,
  getSatelliteStatusLabel,
  imageAgeTone,
  isHydricStress,
  type SatelliteIndexKey,
} from "@/lib/agronome/satellite-utils";
import { satellitePreviewUrl } from "@/lib/satellite/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, BarChart2, Loader2, RefreshCcw, TrendingUp } from "lucide-react";

type Props = {
  parcelleId: string | null;
  parcelleName?: string;
  culture?: string;
  areaHa?: number;
  entry?: DonneesSatellite | null;
  historyRows: DonneesSatellite[];
  historyLoading: boolean;
  index: SatelliteIndexKey;
  alertCount?: number;
  onSync?: () => void;
  syncing?: boolean;
};

function ImageAgeBadge({ days }: { days: number | null }) {
  if (days == null) return null;
  const tone = imageAgeTone(days);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2",
        tone === "fresh" && "bg-green-100 text-green-800",
        tone === "aging" && "bg-amber-100 text-amber-800",
        tone === "stale" && "bg-red-100 text-red-800"
      )}
    >
      🛰️ Image il y a {days}j
      {days > 7 && " — Rafraîchissement recommandé"}
    </span>
  );
}

export default function SatelliteMapSidePanel({
  parcelleId,
  parcelleName,
  culture,
  areaHa,
  entry,
  historyRows,
  historyLoading,
  index,
  alertCount = 0,
  onSync,
  syncing = false,
}: Props) {
  const chartData = historyRows.map((r) => ({
    date: r.date_acquisition.slice(5),
    ndvi: r.indice_ndvi ?? null,
    ndwi: r.indice_ndwi ?? null,
  }));

  const ndvi = entry?.indice_ndvi ?? null;
  const ndwi = entry?.indice_ndwi ?? null;
  const savi = entry?.indice_savi ?? null;
  const previewUrl =
    parcelleId && entry?.date_acquisition
      ? satellitePreviewUrl(parcelleId, entry.date_acquisition)
      : null;
  const days = daysSinceAcquisition(entry?.date_acquisition);
  const nextAcq = estimateNextAcquisitionDays(days);
  const hydric = entry ? isHydricStress(entry) : false;

  if (!parcelleId) {
    return (
      <aside className="w-full lg:w-80 shrink-0 border-l border-[var(--black-008)] bg-[var(--surface-pure)] p-4 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
        Cliquez une parcelle sur la carte
      </aside>
    );
  }

  return (
    <aside className="w-full lg:w-80 shrink-0 border-l border-[var(--black-008)] bg-[var(--surface-pure)] flex flex-col max-h-[min(70vh,580px)] overflow-y-auto">
      <div className="p-4 border-b border-[var(--black-008)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
          Parcelle sélectionnée
        </p>
        <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">
          {parcelleName ?? "—"}
        </h3>
        {(culture || areaHa != null) && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {culture ?? "—"}
            {areaHa != null ? ` · ${areaHa.toFixed(2)} ha` : ""}
          </p>
        )}
        {ndvi != null && (
          <p className="text-xs font-medium mt-2" style={{ color: getSatelliteMapColor(ndvi, "ndvi") }}>
            {getSatelliteStatusLabel(ndvi, "ndvi")}
          </p>
        )}
        <ImageAgeBadge days={days} />
        {previewUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-[var(--black-008)] bg-[var(--black-004)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`NDVI ${parcelleName ?? parcelleId}`}
              className="w-full h-28 object-cover"
              loading="lazy"
            />
          </div>
        )}
        {hydric && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Stress hydrique détecté
          </div>
        )}
      </div>

      <div className="p-4 border-b border-[var(--black-008)]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[var(--interactive-green)]" />
          <p className="text-xs font-bold text-[var(--text-primary)]">
            Évolution {index.toUpperCase()}
          </p>
        </div>
        {historyLoading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] h-[132px]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement…
          </div>
        ) : chartData.length >= 2 ? (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ndviSideGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis
                  domain={index === "ndwi" ? [-1, 1] : [0, 1]}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  width={28}
                />
                <ReferenceLine
                  y={index === "ndwi" ? -0.2 : 0.25}
                  stroke="#cc1a1a"
                  strokeDasharray="3 3"
                />
                <Tooltip
                  formatter={(v) => [typeof v === "number" ? v.toFixed(3) : String(v ?? ""), index.toUpperCase()]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey={index === "ndvi" ? "ndvi" : "ndwi"}
                  stroke={index === "ndwi" ? "#0066cc" : "#16a34a"}
                  fill="url(#ndviSideGrad)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: index === "ndwi" ? "#0066cc" : "#16a34a" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--black-008)] bg-[var(--black-004)] p-4 flex flex-col items-center justify-center text-center min-h-[132px]">
            <BarChart2 className="w-6 h-6 text-[var(--text-tertiary)] opacity-40 mb-2" />
            <p className="text-xs text-[var(--text-secondary)] leading-snug mb-3">
              Historique disponible après
              <br />
              2+ acquisitions satellites
            </p>
            <p className="text-[10px] text-[var(--interactive-green)] font-semibold mb-3">
              Prochaine : dans ~{nextAcq}j
            </p>
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--text-primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3.5 h-3.5" />
                )}
                Synchroniser maintenant
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-3 gap-2">
        {[
          {
            label: "NDVI",
            display: formatSatelliteIndexDisplay(ndvi, "ndvi"),
            color: ndvi != null ? getSatelliteMapColor(ndvi, "ndvi") : "#94a3b8",
          },
          {
            label: "NDWI",
            display: formatSatelliteIndexDisplay(ndwi, "ndwi"),
            color: ndwi != null ? getNdwiMapColor(ndwi) : "#94a3b8",
          },
          {
            label: "SAVI",
            display: formatSatelliteIndexDisplay(savi, "savi", entry),
            color: savi != null ? getSatelliteMapColor(savi, "ndvi") : "#94a3b8",
          },
        ].map(({ label, display, color }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--black-008)] bg-[var(--black-004)] p-2 text-center"
          >
            <p className="text-[9px] font-bold uppercase text-[var(--text-tertiary)]">{label}</p>
            <p className="text-lg font-black tabular-nums" style={{ color }}>
              {display}
            </p>
          </div>
        ))}
      </div>

      <div className="p-4 pt-0 mt-auto flex flex-col gap-2">
        {alertCount > 0 && (
          <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center">
            {alertCount} alerte{alertCount > 1 ? "s" : ""} active{alertCount > 1 ? "s" : ""}
          </p>
        )}
        <Link
          href={`/parcelles?id=${encodeURIComponent(parcelleId)}`}
          className={cn(
            "block text-center text-xs font-bold py-2.5 rounded-full",
            "bg-[var(--text-primary)] text-white hover:opacity-90"
          )}
        >
          Voir historique parcelle
        </Link>
      </div>
    </aside>
  );
}
