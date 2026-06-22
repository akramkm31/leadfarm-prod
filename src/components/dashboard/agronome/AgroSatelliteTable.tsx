"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DonneesSatellite } from "@/lib/mcd/types";
import {
  getIndexLevel,
  getIndexValue,
  type SatelliteIndexKey,
} from "@/lib/agronome/satellite-utils";

type Props = {
  rows: DonneesSatellite[];
  index: SatelliteIndexKey;
  loading: boolean;
  onSelectParcelle?: (parcelleId: string) => void;
  activeParcelleId?: string | null;
};

export default function AgroSatelliteTable({
  rows,
  index,
  loading,
  onSelectParcelle,
  activeParcelleId,
}: Props) {
  return (
    <div className="agro-glass agro-sat-table" role="region" aria-label="Indices satellite par parcelle">
      <div className="agro-sat-table-head">
        <span className="agro-label-chip">Parcelles · {index.toUpperCase()}</span>
        <span className="agro-sat-count">{rows.length} zones</span>
      </div>

      {loading ? (
        <div className="agro-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="agro-sublabel" style={{ padding: "8px 0" }}>
          Aucune acquisition satellite
        </p>
      ) : (
        <div className="agro-sat-rows">
          {rows.map((row) => {
            const v = getIndexValue(row, index);
            const lvl = getIndexLevel(v, index);
            const active = activeParcelleId === row.parcelle_id;
            return (
              <button
                key={row.id}
                type="button"
                className={cn("agro-sat-row", active && "is-active")}
                onClick={() => onSelectParcelle?.(row.parcelle_id)}
              >
                <div className="agro-sat-row-main">
                  <span className="agro-sat-name">{row.parcelle_name ?? row.parcelle_id}</span>
                  <span
                    className="agro-sat-badge"
                    style={{ background: lvl.bg, color: lvl.color }}
                  >
                    {lvl.label}
                  </span>
                </div>
                <div className="agro-sat-row-meta">
                  <span className="agro-sat-val" style={{ color: lvl.color }}>
                    {v.toFixed(3)}
                  </span>
                  <div className="agro-sat-bar-track">
                    <div
                      className="agro-sat-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(4, v * 100))}%`, background: lvl.bar }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
