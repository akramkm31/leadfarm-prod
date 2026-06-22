"use client";

import { useMemo } from "react";
import type { DashboardKPIs } from "@/lib/data-provider";
import type { DonneesSatellite } from "@/lib/mcd/types";
import type { MeteoData } from "@/lib/data-provider";
import {
  averageIndex,
  getIndexLevel,
  getIndexValue,
  isStressed,
  sortByStress,
  type SatelliteIndexKey,
} from "@/lib/agronome/satellite-utils";

export type AgroLeadTone = "red" | "amber" | "blue" | "green";

export type AgroLead = {
  tone: AgroLeadTone;
  title: string;
  sub: string;
  href: string;
};

export function useAgronomeDashboardMetrics(
  satelliteData: DonneesSatellite[],
  kpis: DashboardKPIs | null,
  meteo: MeteoData | null,
  index: SatelliteIndexKey = "ndvi"
) {
  const sorted = useMemo(() => sortByStress(satelliteData, index), [satelliteData, index]);
  const avg = useMemo(() => averageIndex(satelliteData, index), [satelliteData, index]);
  const stressed = useMemo(
    () => satelliteData.filter((r) => isStressed(getIndexValue(r, index), index)),
    [satelliteData, index]
  );
  const worst = sorted[0] ?? null;
  const best = sorted.length ? sorted[sorted.length - 1] : null;

  // French phytosanitary regulation: max 19 km/h wind during application
  const canSpray = meteo
    ? meteo.windspeed <= 19 && meteo.precipitation_prob <= 40 && meteo.alerts.every((a) => a.level !== "danger")
    : null;

  const lead = useMemo((): AgroLead => {
    if (stressed.length > 0 && worst) {
      const lvl = getIndexLevel(getIndexValue(worst, index), index);
      return {
        tone: getIndexValue(worst, index) < 0.4 ? "red" : "amber",
        title: `${stressed.length} parcelle${stressed.length > 1 ? "s" : ""} en stress ${index.toUpperCase()}`,
        sub: `${worst.parcelle_name ?? worst.parcelle_id} · ${lvl.label} — ${lvl.action}`,
        href: "/satellite",
      };
    }
    if (canSpray === false) {
      const reason = meteo && meteo.windspeed > 19
        ? `Vent ${meteo.windspeed} km/h > 19 km/h réglementaire`
        : meteo && meteo.precipitation_prob > 40
        ? `Pluie probable ${meteo.precipitation_prob}% — risque lessivage`
        : "Conditions météo défavorables";
      return {
        tone: "amber",
        title: "Fenêtre phyto fermée",
        sub: `${reason} — reporter les traitements.`,
        href: "/meteo",
      };
    }
    if ((kpis?.pendingApproval ?? 0) > 0) {
      return {
        tone: "blue",
        title: `${kpis!.pendingApproval} traitement(s) à valider`,
        sub: "Ordres en attente d'approbation avant exécution terrain.",
        href: "/treatments?status=pending_approval",
      };
    }
    if ((kpis?.parcellesEnDAR ?? 0) > 0) {
      return {
        tone: "amber",
        title: `${kpis!.parcellesEnDAR} parcelle(s) en DAR`,
        sub: "Vérifier compatibilité avant tout nouveau traitement.",
        href: "/treatments",
      };
    }
    return {
      tone: "green",
      title: "Exploitation stable",
      sub: canSpray ? "Fenêtre pulvérisation ouverte — surveillance NDVI J+14." : "Surveiller indices satellite.",
      href: "/satellite",
    };
  }, [stressed, worst, index, canSpray, kpis]);

  return {
    sorted,
    avg,
    stressed,
    worst,
    best,
    stressedCount: stressed.length,
    canSpray,
    lead,
    acquisitionDate: satelliteData[0]?.date_acquisition ?? null,
  };
}
