"use client";

import { Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { NDVI_LEVELS, NDWI_LEVELS, type SatelliteIndexKey } from "@/lib/agronome/satellite-utils";
import type { SatelliteIndex } from "@/components/dashboard/useDashboardPage";

type Props = {
  index: SatelliteIndex;
  onIndexChange: (index: SatelliteIndex) => void;
  parcelleCount: number;
};

export default function AgroMapIndexRail({ index, onIndexChange, parcelleCount }: Props) {
  const levels = index === "ndvi" ? NDVI_LEVELS.slice(0, 4) : NDWI_LEVELS.slice(0, 4);

  return (
    <div className="agro-index-rail" aria-label="Couche satellite active">
      <div className="agro-index-rail-cap">
        <Satellite className="w-3 h-3" aria-hidden />
        SAT
      </div>

      <button
        type="button"
        className={cn("agro-index-rail-btn", index === "ndvi" && "is-active")}
        onClick={() => onIndexChange("ndvi")}
        title="NDVI — vigueur"
      >
        <span className="agro-index-rail-btn-k">NDVI</span>
        <span className="agro-index-rail-btn-l">Vigueur</span>
      </button>
      <button
        type="button"
        className={cn("agro-index-rail-btn", index === "ndwi" && "is-active")}
        onClick={() => onIndexChange("ndwi")}
        title="NDWI — eau"
      >
        <span className="agro-index-rail-btn-k">NDWI</span>
        <span className="agro-index-rail-btn-l">Eau</span>
      </button>

      <div className="agro-index-rail-scale" aria-hidden>
        {levels.map((l) => (
          <span key={l.label} className="agro-index-rail-dot" style={{ background: l.bar }} title={l.short} />
        ))}
      </div>

      <span className="agro-index-rail-count">{parcelleCount} zones</span>
    </div>
  );
}
