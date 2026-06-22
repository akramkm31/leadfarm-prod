"use client";

import { NDVI_LEVELS, NDWI_LEVELS, type SatelliteIndexKey } from "@/lib/agronome/satellite-utils";

type Props = {
  index: SatelliteIndexKey;
  avgValue: number | null;
  stressedCount?: number;
  parcelleCount?: number;
  acquisitionDate?: string | null;
};

export default function AgroLegend({
  index,
  avgValue,
  stressedCount = 0,
  parcelleCount,
  acquisitionDate,
}: Props) {
  const levels = index === "ndvi" ? NDVI_LEVELS.slice(0, 4) : NDWI_LEVELS.slice(0, 4);
  const dateLabel = acquisitionDate
    ? new Date(acquisitionDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
    : null;

  return (
    <div className="agro-legend" aria-label="Légende indices satellite">
      <span className="agro-leg-title">{index.toUpperCase()}</span>
      {levels.map((l) => (
        <span key={l.label} className="agro-leg-pill">
          <span className="agro-leg-dot" style={{ background: l.bar }} aria-hidden />
          {l.short}
        </span>
      ))}
      {avgValue != null && (
        <span className="agro-leg-pill agro-leg-pill--value">
          Moy. {avgValue.toFixed(2)}
        </span>
      )}
      {stressedCount > 0 && (
        <span className="agro-leg-pill agro-leg-pill--warn">
          {stressedCount} stress
        </span>
      )}
      {parcelleCount != null && parcelleCount > 0 && (
        <span className="agro-leg-pill agro-leg-pill--muted">
          {parcelleCount} zones
        </span>
      )}
      {dateLabel && (
        <span className="agro-leg-pill agro-leg-pill--muted">
          S2 · {dateLabel}
        </span>
      )}
    </div>
  );
}
