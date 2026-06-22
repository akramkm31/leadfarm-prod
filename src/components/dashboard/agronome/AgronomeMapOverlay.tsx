"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Satellite, History, Layers, Wind, Thermometer, Droplets,
  AlertTriangle, CheckCircle2, Loader2, MapPin, ClipboardList,
  CloudRain, Sprout, Sun, Cloud, CloudFog, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMeteo, type MeteoData, type DashboardKPIs } from "@/lib/data-provider";
import type { Parcelle } from "@/lib/mock-data";
import type { DonneesSatellite } from "@/lib/mcd/types";
import type { SatelliteIndex } from "@/components/dashboard/useDashboardPage";
import { getExploitationCentroid } from "@/lib/agronome/geo-utils";
import { useAgronomeDashboardMetrics } from "./useAgronomeDashboardMetrics";
import AgroLegend from "./AgroLegend";
import AgroMapIndexRail from "./AgroMapIndexRail";

type Props = {
  parcelles: Parcelle[];
  satelliteData: DonneesSatellite[];
  satelliteLoading: boolean;
  satelliteIndex: SatelliteIndex;
  onSatelliteIndexChange: (index: SatelliteIndex) => void;
  kpis: DashboardKPIs | null;
  onOpenSatellite: () => void;
  onOpenTreatments: () => void;
  onOpenMeteo?: () => void;
};

function WeatherCodeIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} aria-hidden />;
  if (code <= 3) return <Cloud className={className} aria-hidden />;
  if (code === 45 || code === 48) return <CloudFog className={className} aria-hidden />;
  if (code >= 95) return <Zap className={className} aria-hidden />;
  if (code >= 51) return <CloudRain className={className} aria-hidden />;
  return <Cloud className={className} aria-hidden />;
}

export default function AgronomeMapOverlay({
  parcelles,
  satelliteData,
  satelliteLoading,
  satelliteIndex,
  onSatelliteIndexChange,
  kpis,
  onOpenSatellite,
  onOpenTreatments,
  onOpenMeteo,
}: Props) {
  const [meteo, setMeteo] = useState<MeteoData | null>(null);
  const [meteoLoading, setMeteoLoading] = useState(true);

  const centroid = useMemo(() => getExploitationCentroid(parcelles), [parcelles]);
  const dense = parcelles.filter((p) => !p.parentId).length >= 6;

  useEffect(() => {
    if (!centroid) {
      setMeteoLoading(false);
      return;
    }
    setMeteoLoading(true);
    fetchMeteo(centroid.lat, centroid.lng).then((d) => {
      setMeteo(d);
      setMeteoLoading(false);
    });
  }, [centroid?.lat, centroid?.lng]);

  const metrics = useAgronomeDashboardMetrics(satelliteData, kpis, meteo, satelliteIndex);
  const hasData = satelliteData.length > 0;

  return (
    <div className={cn("agro-dash-overlay", dense && "agro-dash-overlay--dense")} aria-label="Tableau de bord agronome">
      {hasData && (
        <AgroMapIndexRail
          index={satelliteIndex}
          onIndexChange={onSatelliteIndexChange}
          parcelleCount={metrics.sorted.length}
        />
      )}

      <div className={cn("agro-glass agro-dash-tl agro-weather", dense && "agro-weather--dense")}>
        <div className="agro-card-head">
          <span className="agro-label-chip">Météo</span>
          {!meteoLoading && metrics.canSpray !== null && (
            <span className={cn("agro-spray-badge", metrics.canSpray ? "is-ok" : "is-warn")}>
              {metrics.canSpray ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {metrics.canSpray ? "OK phyto" : "Déconseillé"}
            </span>
          )}
        </div>

        {meteoLoading ? (
          <div className="agro-loading"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : meteo ? (
          <>
            <div className="agro-weather-main">
              <WeatherCodeIcon code={meteo.weathercode} className="w-5 h-5 text-void shrink-0" />
              <div className="agro-weather-copy">
                <p className="agro-temp">{meteo.temperature}°C</p>
                <p className="agro-sublabel">
                  {meteo.windspeed} km/h · {meteo.precipitation_prob}% pluie
                  {!dense && meteo.humidity != null && <> · {meteo.humidity}% hum.</>}
                </p>
              </div>
            </div>
            {!dense && (
              <div className="agro-weather-stats">
                <div className="agro-stat">
                  <Wind className="w-3.5 h-3.5" />
                  <span>{meteo.windspeed} km/h</span>
                </div>
                <div className="agro-stat">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{meteo.precipitation_prob}% pluie</span>
                </div>
                <div className="agro-stat">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>{meteo.temperature}°C</span>
                </div>
              </div>
            )}
            {onOpenMeteo && !dense && (
              <button type="button" className="agro-weather-link" onClick={onOpenMeteo}>
                <CloudRain className="w-3 h-3" />
                Prévisions
              </button>
            )}
          </>
        ) : (
          <p className="agro-sublabel">Météo indisponible</p>
        )}
      </div>

      {kpis && (kpis.pendingApproval > 0 || kpis.parcellesEnDAR > 0 || metrics.stressedCount > 0) && (
        <div className="agro-dash-kpi">
          {kpis.pendingApproval > 0 && (
            <Link href="/treatments?status=pending_approval" className="agro-kpi-chip">
              <ClipboardList className="w-3 h-3" />
              {kpis.pendingApproval} validation
            </Link>
          )}
          {kpis.parcellesEnDAR > 0 && (
            <Link href="/treatments" className="agro-kpi-chip agro-kpi-chip--warn">
              <AlertTriangle className="w-3 h-3" />
              {kpis.parcellesEnDAR} DAR
            </Link>
          )}
          {metrics.stressedCount > 0 && (
            <button type="button" className="agro-kpi-chip agro-kpi-chip--warn" onClick={onOpenSatellite}>
              <Sprout className="w-3 h-3" />
              {metrics.stressedCount} stress {satelliteIndex.toUpperCase()}
            </button>
          )}
        </div>
      )}

      {hasData && (
        <div className="agro-dash-legend">
          <AgroLegend
            index={satelliteIndex}
            avgValue={metrics.avg}
            stressedCount={metrics.stressedCount}
            parcelleCount={metrics.sorted.length}
            acquisitionDate={metrics.acquisitionDate}
          />
        </div>
      )}

      <div className="agro-dash-br">
        <div className="agro-action-group">
          <button type="button" className="agro-action-btn agro-action-btn--icon" onClick={onOpenSatellite} title="Analyse satellite">
            <Satellite className="w-4 h-4" />
            {!dense && <span>Analyse</span>}
          </button>
          <button type="button" className="agro-action-btn agro-action-btn--icon" onClick={onOpenTreatments} title="Planifier traitement">
            <History className="w-4 h-4" />
            {!dense && <span>Traitement</span>}
          </button>
          <Link href="/parcelles" className="agro-action-btn agro-action-btn--icon" title="Parcelles">
            <Layers className="w-4 h-4" />
            {!dense && <span>Parcelles</span>}
          </Link>
        </div>
      </div>

      <footer className="agro-dash-footer">
        <div className="agro-footer-left">
          <span className="agro-footer-item">
            <Satellite className="w-3.5 h-3.5" />
            Sentinel-2 · <strong>{metrics.acquisitionDate ? new Date(metrics.acquisitionDate).toLocaleDateString("fr-FR") : "—"}</strong>
          </span>
          {centroid && !dense && (
            <span className="agro-footer-item">
              <MapPin className="w-3.5 h-3.5" />
              <span className="agro-mono">
                {centroid.lat.toFixed(4)} N · {Math.abs(centroid.lng).toFixed(4)} W
              </span>
            </span>
          )}
          {kpis && !dense && (
            <span className="agro-footer-item">
              {kpis.traitementsMois} traitement{kpis.traitementsMois !== 1 ? "s" : ""} ce mois
              {kpis.surfaceMois > 0 && <> · {kpis.surfaceMois.toFixed(1)} ha</>}
            </span>
          )}
        </div>
        <div className="agro-footer-right">
          <span className={cn("agro-health-chip", metrics.stressedCount > 0 && "agro-health-chip--warn")}>
            {metrics.stressedCount > 0 ? `${metrics.stressedCount} stress` : "Nominal"}
          </span>
        </div>
      </footer>
    </div>
  );
}
