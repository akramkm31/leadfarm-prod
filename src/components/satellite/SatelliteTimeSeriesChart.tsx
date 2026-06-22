"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { DonneesSatellite } from "@/lib/mcd/types";
import type { SatelliteIndexKey } from "@/lib/agronome/satellite-utils";
import { getIndexLevel } from "@/lib/agronome/satellite-utils";

type Props = {
  rows: DonneesSatellite[];
  index?: SatelliteIndexKey;
  parcelleName?: string;
};

export default function SatelliteTimeSeriesChart({
  rows,
  index = "ndvi",
  parcelleName,
}: Props) {
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        date: r.date_acquisition.slice(5),
        ndvi: r.indice_ndvi ?? null,
        ndwi: r.indice_ndwi ?? null,
      })),
    [rows]
  );

  if (chartData.length < 2) return null;

  const stressThreshold = index === "ndvi" ? 0.55 : 0.1;
  const key = index === "ndvi" ? "ndvi" : "ndwi";
  const label = index.toUpperCase();

  return (
    <div className="mt-6 p-4 rounded-2xl border border-[var(--black-008)] bg-[var(--surface-pure)]">
      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
        Historique {label}
        {parcelleName ? ` — ${parcelleName}` : " — exploitation"}
      </p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="#94a3b8" width={32} />
            <Tooltip
              content={({ active, payload, label: dateLabel }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0]?.value as number;
                const lvl = getIndexLevel(v, index);
                return (
                  <div className="rounded-lg border border-[var(--black-008)] bg-white px-3 py-2 text-xs shadow-sm">
                    <p className="font-bold mb-1">{dateLabel}</p>
                    <p style={{ color: lvl.bar }}>
                      {label}: {v.toFixed(3)} — {lvl.label}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={stressThreshold} stroke="#f59e0b" strokeDasharray="4 4" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {index === "ndvi" && (
              <Line type="monotone" dataKey="ndvi" name="NDVI" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            )}
            {index === "ndwi" && (
              <Line type="monotone" dataKey="ndwi" name="NDWI" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
