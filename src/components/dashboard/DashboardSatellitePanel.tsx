"use client";

import { X, Satellite, TrendingDown, Droplets, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DonneesSatellite } from "@/lib/mcd/types";

// ── NDVI expert thresholds ─────────────────────────────────────────────────
const NDVI_LEVELS = [
  { min: 0.70, max: 1.00, label: "Excellent",       short: "Couvert dense",        color: "text-emerald-600", bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", action: "Aucune intervention nécessaire." },
  { min: 0.55, max: 0.70, label: "Sain",             short: "Croissance normale",   color: "text-green-600",   bar: "bg-green-400",   badge: "bg-green-50 text-green-700 border-green-200",     action: "Surveiller à J+14. Fenêtre traitement possible." },
  { min: 0.40, max: 0.55, label: "Stress modéré",   short: "Surveillance requise", color: "text-amber-600",   bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200",     action: "Diagnostic foliaire sous 7 jours recommandé." },
  { min: 0.20, max: 0.40, label: "Stress sévère",   short: "Intervention urgente", color: "text-orange-600",  bar: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border-orange-200",  action: "Inspection terrain & traitement phyto à planifier." },
  { min: -1,   max: 0.20, label: "Critique",         short: "Sol nu / végétation absente", color: "text-red-600", bar: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200",       action: "Zone hors production ou destruction totale — audit urgent." },
] as const;

// ── NDWI expert thresholds ─────────────────────────────────────────────────
const NDWI_LEVELS = [
  { min: 0.30,  max: 1.00, label: "Hydratation optimale", short: "Stress hydrique faible", color: "text-blue-600",  bar: "bg-blue-500",  badge: "bg-blue-50 text-blue-700 border-blue-200",   action: "Irrigation non nécessaire." },
  { min: 0.10,  max: 0.30, label: "Normal",                short: "Humidité suffisante",    color: "text-sky-600",   bar: "bg-sky-400",   badge: "bg-sky-50 text-sky-700 border-sky-200",       action: "Surveiller en période de forte chaleur." },
  { min: 0.00,  max: 0.10, label: "Légèrement sec",        short: "Surveiller",             color: "text-yellow-600",bar: "bg-yellow-400",badge: "bg-yellow-50 text-yellow-700 border-yellow-200",action: "Prévoir irrigation si chaleur persistante." },
  { min: -0.10, max: 0.00, label: "Stress hydrique",       short: "Irrigation recommandée", color: "text-amber-600", bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200", action: "Irrigation à planifier sous 48h." },
  { min: -1,    max: -0.10,label: "Stress sévère",          short: "Irrigation urgente",     color: "text-red-600",   bar: "bg-red-500",   badge: "bg-red-50 text-red-700 border-red-200",       action: "Irrigation immédiate — risque de pertes de rendement." },
] as const;

function getLevel(value: number, index: "ndvi" | "ndwi") {
  const levels = index === "ndvi" ? NDVI_LEVELS : NDWI_LEVELS;
  return levels.find((l) => value >= l.min && value < l.max) ?? levels[levels.length - 1];
}

function stressOrder(value: number, index: "ndvi" | "ndwi"): number {
  // Lower NDVI = more stress → lower order number = shown first
  // Lower NDWI = more stress
  return index === "ndvi" ? value : value;
}

type Props = {
  open: boolean;
  onClose: () => void;
  data: DonneesSatellite[];
  loading: boolean;
  index: "ndvi" | "ndwi";
  onIndexChange: (i: "ndvi" | "ndwi") => void;
  onRefresh: () => void;
};

export default function DashboardSatellitePanel({ open, onClose, data, loading, index, onIndexChange, onRefresh }: Props) {
  if (!open) return null;

  const rows = [...data].sort((a, b) => {
    const av = index === "ndvi" ? (a.indice_ndvi ?? 0) : (a.indice_ndwi ?? 0);
    const bv = index === "ndvi" ? (b.indice_ndvi ?? 0) : (b.indice_ndwi ?? 0);
    return stressOrder(av, index) - stressOrder(bv, index);
  });

  const stressed = rows.filter((r) => {
    const v = index === "ndvi" ? (r.indice_ndvi ?? 0) : (r.indice_ndwi ?? 0);
    return index === "ndvi" ? v < 0.55 : v < 0.10;
  });

  return (
    <div className="satellite-panel-backdrop" onClick={onClose} aria-modal="true">
      <aside
        className="satellite-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Indices satellite"
      >
        {/* Header */}
        <div className="satellite-panel-head">
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-sm">Indices Satellite</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] ml-1">Sentinel-2</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onRefresh} className="satellite-icon-btn" title="Actualiser" disabled={loading}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
            <button type="button" onClick={onClose} className="satellite-icon-btn" aria-label="Fermer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Index selector */}
        <div className="satellite-panel-tabs">
          <button
            type="button"
            className={cn("satellite-tab", index === "ndvi" && "is-active")}
            onClick={() => onIndexChange("ndvi")}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            NDVI
            <span className="satellite-tab-hint">Vigueur végétale</span>
          </button>
          <button
            type="button"
            className={cn("satellite-tab", index === "ndwi" && "is-active")}
            onClick={() => onIndexChange("ndwi")}
          >
            <Droplets className="w-3.5 h-3.5" />
            NDWI
            <span className="satellite-tab-hint">Stress hydrique</span>
          </button>
        </div>

        {/* Summary */}
        {!loading && rows.length > 0 && (
          <div className="satellite-panel-summary">
            <span className="font-medium text-sm text-[var(--text-primary)]">{rows.length} parcelle{rows.length > 1 ? "s" : ""}</span>
            {stressed.length > 0 && (
              <span className="satellite-alert-chip">
                ⚠ {stressed.length} en stress — intervention recommandée
              </span>
            )}
          </div>
        )}

        {/* Parcelle list */}
        <div className="satellite-panel-list">
          {loading && (
            <div className="satellite-panel-loading">
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
              <span className="text-sm text-[var(--text-tertiary)]">Chargement des indices…</span>
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="satellite-panel-empty">
              <Satellite className="w-6 h-6 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-tertiary)] text-center">
                Aucune donnée satellite.<br />
                Appliquez la migration 019 et importez une acquisition.
              </p>
            </div>
          )}

          {rows.map((row) => {
            const rawVal = index === "ndvi" ? (row.indice_ndvi ?? 0) : (row.indice_ndwi ?? 0);
            const level = getLevel(rawVal, index);
            const barPct = Math.max(0, Math.min(100, Math.round(((rawVal + 1) / 2) * 100)));

            return (
              <div key={row.id} className="satellite-parcelle-row">
                <div className="satellite-parcelle-head">
                  <span className="satellite-parcelle-name">{row.parcelle_name || row.parcelle_id}</span>
                  <span className={cn("satellite-parcelle-value", level.color)}>
                    {rawVal.toFixed(3)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="satellite-bar-bg">
                  <div
                    className={cn("satellite-bar-fill", level.bar)}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                <div className="satellite-parcelle-meta">
                  <span className={cn("satellite-status-badge", level.badge)}>
                    {level.label}
                  </span>
                  <span className="satellite-parcelle-date">
                    {new Date(row.date_acquisition).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    {row.source_satellite && ` · ${row.source_satellite}`}
                  </span>
                </div>

                <p className="satellite-action-hint">↳ {level.action}</p>
              </div>
            );
          })}
        </div>

        {/* Expert legend */}
        <div className="satellite-legend">
          <p className="satellite-legend-title">
            {index === "ndvi" ? "NDVI — Normalized Difference Vegetation Index" : "NDWI — Normalized Difference Water Index"}
          </p>
          <div className="satellite-legend-items">
            {(index === "ndvi" ? NDVI_LEVELS : NDWI_LEVELS).slice(0, 4).map((l) => (
              <div key={l.label} className="satellite-legend-row">
                <div className={cn("satellite-legend-dot", l.bar)} />
                <span className="font-medium text-[var(--text-primary)]">{l.label}</span>
                <span className="text-[var(--text-tertiary)]">{l.short}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="satellite-panel-footer">
          <Link href="/satellite" className="satellite-footer-link" onClick={onClose}>
            Analyse complète
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
