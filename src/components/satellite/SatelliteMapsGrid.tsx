"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, Droplets, Loader2, MapPin, TrendingUp, Zap } from "lucide-react";
import SatelliteNdviPreview from "@/components/satellite/SatelliteNdviPreview";
import type { ParcelleWithSatellite } from "@/lib/agronome/satellite-utils";
import { getIndexLevel, getIndexValue, hasSatelliteIndex } from "@/lib/agronome/satellite-utils";
import type { SatelliteVisionAnalysis } from "@/lib/satellite/vision-analysis";
import {
  cultureTypeLabels,
  type CultureType,
  type Parcelle,
} from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";

type Props = {
  items: ParcelleWithSatellite[];
  selectedParcelleId: string | null;
  onSelect: (parcelleId: string) => void;
};

function useCardAnalysis(parcelleId: string, date: string, enabled: boolean) {
  const [result, setResult]   = useState<SatelliteVisionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !date) return;
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ parcelleId, date });
    fetch(`/api/v1/satellite-data/preview?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        if (cancelled) return;
        const form = new FormData();
        form.append("image", new File([blob], "preview.png", { type: blob.type || "image/png" }));
        return fetch("/api/v1/satellite-data/analyze", {
          method: "POST",
          credentials: "include",
          body: form,
        });
      })
      .then((r) => r?.json() as Promise<{ success?: boolean; data?: SatelliteVisionAnalysis }>)
      .then((json) => {
        if (!cancelled && json?.data) setResult(json.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [parcelleId, date, enabled]);

  return { result, loading };
}

function IndexPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">{label}</span>
      <span className="text-[10px] font-black font-mono" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  );
}

function SatelliteCard({
  parcelle, entry, selectedParcelleId, onSelect,
}: { parcelle: ParcelleWithSatellite["parcelle"]; entry: ParcelleWithSatellite["entry"]; selectedParcelleId: string | null; onSelect: (id: string) => void }) {
  const p       = parcelle as Parcelle;
  const synced  = hasSatelliteIndex(entry);
  const ndvi    = getIndexValue(entry, "ndvi");
  const ndwi    = getIndexValue(entry, "ndwi");
  const ndviLevel = getIndexLevel(ndvi, "ndvi");
  const selected  = selectedParcelleId === parcelle.id;

  const { result: ai, loading: analyzing } = useCardAnalysis(
    entry.parcelle_id,
    entry.date_acquisition,
    synced,
  );

  const NDVI_BAR = (v: number) =>
    v >= 0.6 ? "#10b981" : v >= 0.4 ? "#84cc16" : v >= 0.2 ? "#f59e0b" : "#ef4444";

  return (
    <button
      key={parcelle.id}
      type="button"
      onClick={() => onSelect(parcelle.id)}
      className={cn(
        "glass-card text-left overflow-hidden transition-all hover:shadow-lg",
        selected && "ring-2 ring-[var(--color-valley-green)]/40 border-[var(--color-valley-green)]/30",
        !synced && "opacity-70",
      )}
    >
      {synced ? (
        <div className="relative">
          <SatelliteNdviPreview
            parcelleId={parcelle.id}
            date={entry.date_acquisition}
            className="aspect-[16/10] w-full"
            alt={`NDVI ${parcelle.name}`}
          />
          {analyzing && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[9px] font-bold">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              IA…
            </div>
          )}
        </div>
      ) : (
        <div
          className="aspect-[16/10] w-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #e8e6e1 0%, #d4d0c8 100%)" }}
        >
          <p className="text-[10px] text-[var(--text-tertiary)] font-medium">Non synchronisé</p>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Name + badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-md border-2 shrink-0"
              style={{ borderColor: p.color || "#6b9e7a", backgroundColor: `${p.color || "#6b9e7a"}20` }}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--color-adaline-ink)]/90 truncate">{parcelle.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                {cultureTypeLabels[p.cultureType as CultureType] || p.cultureType || "—"}
                {p.variete ? ` · ${p.variete}` : ""}
              </p>
            </div>
          </div>
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0"
            style={synced ? { background: ndviLevel.bg, color: ndviLevel.color } : { background: "#f3f4f6", color: "#9ca3af" }}
          >
            {synced ? ndviLevel.label : "Aucun indice"}
          </span>
        </div>

        {/* NDVI / NDWI / cloud */}
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[var(--leaf-green)]" />
            <span className="font-mono font-bold" style={{ color: synced ? ndviLevel.color : "#9ca3af" }}>
              {synced ? ndvi.toFixed(2) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3 text-blue-500" />
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {synced ? ndwi.toFixed(2) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
            <Cloud className="w-3 h-3" />
            <span>{synced && entry.cloud_cover_pct != null ? `${entry.cloud_cover_pct.toFixed(0)}%` : "—"}</span>
          </div>
        </div>

        {/* AI indices: EVI / SAVI / NDRE + stress */}
        {ai && (
          <div className="border-t border-[var(--black-008)] pt-2.5 space-y-2">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-2.5 h-2.5 text-[var(--interactive-green)]" />
              <span className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-wider">IA · Claude Vision</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              <IndexPill label="NDVI" value={ai.ndvi} color={NDVI_BAR(ai.ndvi)} />
              <IndexPill label="NDWI" value={ai.ndwi} color={NDVI_BAR(ai.ndwi)} />
              <IndexPill label="EVI"  value={ai.evi}  color={NDVI_BAR(ai.evi)} />
              <IndexPill label="SAVI" value={ai.savi} color={NDVI_BAR(ai.savi)} />
              <IndexPill label="NDRE" value={ai.ndre} color={NDVI_BAR(ai.ndre)} />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                H₂O {ai.stress_hydrique}
              </span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                N {ai.stress_nutritionnel}
              </span>
              {ai.alerte && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">⚠</span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
          <span>{formatHectares(p.areaHectares)}</span>
          <span>{synced ? new Date(entry.date_acquisition).toLocaleDateString("fr-FR") : "—"}</span>
          <Link
            href={`/parcelles?select=${parcelle.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[var(--color-valley-green)] hover:underline"
          >
            <MapPin className="w-3 h-3" />
            Parcelle
          </Link>
        </div>
      </div>
    </button>
  );
}

export default function SatelliteMapsGrid({ items, selectedParcelleId, onSelect }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-[28px] border border-[var(--black-008)] bg-[var(--surface-pure)] p-10 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Aucune parcelle enregistrée.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {items.map(({ parcelle, entry }) => (
        <SatelliteCard
          key={parcelle.id}
          parcelle={parcelle}
          entry={entry}
          selectedParcelleId={selectedParcelleId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
