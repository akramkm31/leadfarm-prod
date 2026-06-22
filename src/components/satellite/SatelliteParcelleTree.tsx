"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  Droplets,
  Layers,
  MapPin,
  Satellite,
  TrendingUp,
} from "lucide-react";
import type { SatelliteCatalogEntry } from "@/lib/agronome/satellite-utils";
import { getIndexLevel, getIndexValue } from "@/lib/agronome/satellite-utils";
import {
  cultureTypeLabels,
  type CultureType,
  type Parcelle,
} from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";

function IndexBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, ((value + 0.2) / 1.2) * 100));
  return (
    <div className="h-1.5 rounded-full bg-[var(--black-008)] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function entryForParcelle(
  parcelle: Parcelle,
  lookup: Map<string, SatelliteCatalogEntry>
): SatelliteCatalogEntry {
  const existing = lookup.get(parcelle.id);
  const hasBoundary = (parcelle.boundary?.length ?? 0) >= 3;
  if (existing) {
    return {
      ...existing,
      parcelle_name: parcelle.name,
      hasBoundary: existing.hasBoundary ?? hasBoundary,
    };
  }
  return {
    id: `pending-${parcelle.id}`,
    parcelle_id: parcelle.id,
    parcelle_name: parcelle.name,
    date_acquisition: new Date().toISOString().slice(0, 10),
    synced: false,
    hasBoundary,
  };
}

function SatelliteIndexGrid({ entry }: { entry: SatelliteCatalogEntry }) {
  const synced = entry.synced !== false && entry.indice_ndvi != null;

  if (!synced) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-[var(--black-004)] border border-[var(--black-008)]">
        <p className="text-xs text-[var(--text-tertiary)]">
          {entry.hasBoundary
            ? "Indices non synchronisés — lancez Sync Sentinel-2."
            : "Contour GPS requis — définissez la parcelle dans Parcelles."}
        </p>
      </div>
    );
  }

  const ndvi = getIndexValue(entry, "ndvi");
  const ndwi = getIndexValue(entry, "ndwi");
  const ndviLevel = getIndexLevel(ndvi, "ndvi");
  const ndwiLevel = getIndexLevel(ndwi, "ndwi");

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="w-3.5 h-3.5 text-[var(--leaf-green)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase">NDVI</p>
            <p className="text-sm font-black font-mono" style={{ color: ndviLevel.color }}>
              {ndvi.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase">NDWI</p>
            <p className="text-sm font-black font-mono" style={{ color: ndwiLevel.color }}>
              {ndwi.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Satellite className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase">EVI</p>
            <p className="text-sm font-bold font-mono text-[var(--text-primary)]">
              {entry.indice_evi != null ? entry.indice_evi.toFixed(2) : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Cloud className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Acquisition</p>
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
              {new Date(entry.date_acquisition).toLocaleDateString("fr-FR")}
              {entry.cloud_cover_pct != null ? ` · ${entry.cloud_cover_pct.toFixed(0)}% nuages` : ""}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[var(--text-tertiary)]">Vigueur · {ndviLevel.label}</span>
            <span className="font-mono font-bold" style={{ color: ndviLevel.color }}>
              {ndvi.toFixed(2)}
            </span>
          </div>
          <IndexBar value={ndvi} color={ndviLevel.bar} />
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)]">↳ {ndviLevel.action}</p>
      </div>
    </>
  );
}

type SatelliteParcelleCardProps = {
  parcelle: Parcelle;
  entry: SatelliteCatalogEntry;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
};

function SatelliteParcelleCard({
  parcelle,
  entry,
  selected,
  compact,
  onSelect,
}: SatelliteParcelleCardProps) {
  const synced = entry.synced !== false && entry.indice_ndvi != null;
  const ndviLevel = synced ? getIndexLevel(getIndexValue(entry, "ndvi"), "ndvi") : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "glass-card cursor-pointer transition-all",
        compact ? "p-4" : "p-5",
        selected && "border-[var(--color-valley-green)]/30 ring-1 ring-[var(--green-010)]"
      )}
    >
      <div className={cn("flex items-center justify-between gap-3", compact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn("rounded-md border-2 shrink-0", compact ? "w-3 h-3" : "w-4 h-4")}
            style={{
              borderColor: parcelle.color || "#6b9e7a",
              backgroundColor: `${parcelle.color || "#6b9e7a"}20`,
            }}
          />
          <div className="min-w-0">
            <span
              className={cn(
                "font-semibold text-[var(--color-adaline-ink)]/85 block truncate",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {parcelle.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-[var(--color-adaline-ink)]/50 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
                {cultureTypeLabels[parcelle.cultureType as CultureType] || parcelle.cultureType || "—"}
              </span>
              {parcelle.variete && (
                <span className="text-[10px] text-[var(--color-adaline-ink)]/50 truncate">{parcelle.variete}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {synced && ndviLevel ? (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
              style={{ background: ndviLevel.bg, color: ndviLevel.color }}
            >
              {ndviLevel.label}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[var(--black-008)] text-[var(--text-tertiary)]">
              {entry.hasBoundary ? "En attente" : "GPS requis"}
            </span>
          )}
          <span className="text-sm font-bold text-[var(--color-valley-green)] font-mono">
            {formatHectares(parcelle.areaHectares)}
          </span>
          <Link
            href={`/parcelles?select=${parcelle.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border border-white/[0.12] text-[var(--color-valley-green)] hover:bg-white/[0.06]"
          >
            <MapPin className="w-3 h-3" />
            Parcelle
          </Link>
        </div>
      </div>
      <SatelliteIndexGrid entry={entry} />
    </div>
  );
}

type Props = {
  parcelles: Parcelle[];
  lookup: Map<string, SatelliteCatalogEntry>;
  selectedParcelleId: string | null;
  expandedParcelleId: string | null;
  onSelect: (parcelleId: string, entryId: string) => void;
  onToggleExpand: (parcelleId: string) => void;
};

export default function SatelliteParcelleTree({
  parcelles,
  lookup,
  selectedParcelleId,
  expandedParcelleId,
  onSelect,
  onToggleExpand,
}: Props) {
  if (!parcelles.length) return null;

  return (
    <div className="space-y-3">
      {parcelles.map((parcelle) => {
        const hasChildren = (parcelle.children?.length ?? 0) > 0;
        const isExpanded = expandedParcelleId === parcelle.id;
        const entry = entryForParcelle(parcelle, lookup);

        return (
          <div key={parcelle.id}>
            <div className="flex gap-2 items-start">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(parcelle.id)}
                  className="mt-5 p-1 rounded-lg hover:bg-white/[0.06] shrink-0"
                  aria-label={isExpanded ? "Replier" : "Déplier"}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[var(--color-adaline-ink)]/55" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--color-adaline-ink)]/55" />
                  )}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <SatelliteParcelleCard
                  parcelle={parcelle}
                  entry={entry}
                  selected={selectedParcelleId === parcelle.id}
                  onSelect={() => onSelect(parcelle.id, entry.id)}
                />
                {hasChildren && (
                  <span className="inline-flex items-center gap-1 mt-2 ml-1 text-[10px] text-[var(--text-tertiary)]">
                    <Layers className="w-3 h-3" />
                    {parcelle.children!.length} sous-parcelle{parcelle.children!.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {isExpanded && hasChildren && (
              <div className="ml-8 mt-2 space-y-2 border-l-2 border-white/[0.08] pl-4">
                {parcelle.children!.map((child) => {
                  const childEntry = entryForParcelle(child, lookup);
                  return (
                    <SatelliteParcelleCard
                      key={child.id}
                      parcelle={child}
                      entry={childEntry}
                      selected={selectedParcelleId === child.id}
                      compact
                      onSelect={() => onSelect(child.id, childEntry.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
