"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchDashboardKPIs, type DashboardKPIs } from "@/lib/data-provider";
import { useTreatments, useParcelles } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import {
  findParcelle,
  resolveTreatmentParcelleId,
  treatmentsForParcelle,
} from "@/components/map/dashboard-map-utils";
import {
  buildParcelleHistoryBundle,
  type ParcelleHistoryBundle,
} from "@/lib/parcelle-history";
import type { WeatherMapData } from "@/lib/weather-map";
import {
  DEFAULT_WEATHER_LAYERS,
  type WeatherLayerState,
} from "@/lib/open-weather-layers";
import type { DonneesSatellite } from "@/lib/mcd/types";
import { alignSatelliteToParcelles } from "@/lib/agronome/satellite-utils";
import { SUPABASE_CONFIGURED } from "@/hooks/useData";

export type DashboardPanel = "treatments" | "meteo" | "satellite" | null;
export type SatelliteIndex = "ndvi" | "ndwi";
export type SatelliteLoadError = "empty" | "fetch" | "forbidden" | null;

const REFRESH_MS = 60_000;
export const DASH_DRAWER_WIDTH = 400;

export function useDashboardPage() {
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("access") === "denied";
  const [showAccessBanner, setShowAccessBanner] = useState(accessDenied);

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpiError, setKpiError] = useState(false);
  const [activeTreatmentId, setActiveTreatmentId] = useState<string | null>(null);
  const [focusParcelleId, setFocusParcelleId] = useState<string | null>(null);
  const [mapSelectedParcelleId, setMapSelectedParcelleId] = useState<string | null>(null);
  const [historyBundle, setHistoryBundle] = useState<ParcelleHistoryBundle | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openPanel, setOpenPanel] = useState<DashboardPanel>(null);
  const [weatherData, setWeatherData] = useState<WeatherMapData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherLayers, setWeatherLayers] = useState<WeatherLayerState>(DEFAULT_WEATHER_LAYERS);
  const [weatherOpacity, setWeatherOpacity] = useState(0.65);
  const [satelliteData, setSatelliteData] = useState<DonneesSatellite[]>([]);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [satelliteError, setSatelliteError] = useState<SatelliteLoadError>(null);
  const [satelliteIndex, setSatelliteIndex] = useState<SatelliteIndex>("ndvi");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: treatmentsRaw } = useTreatments();
  const { data: parcellesRaw } = useParcelles();
  const treatments = (treatmentsRaw || []) as unknown as Record<string, unknown>[];
  const parcelles = (parcellesRaw || []) as Parcelle[];

  const closeParcelleDrawer = useCallback(() => {
    setMapSelectedParcelleId(null);
    setFocusParcelleId(null);
    setActiveTreatmentId(null);
    setHistoryBundle(null);
  }, []);

  const handleMapParcelleSelect = useCallback((id: string | null) => {
    setMapSelectedParcelleId(id);
    if (id) {
      setActiveTreatmentId(null);
      setFocusParcelleId(null);
      setOpenPanel(null);
    }
  }, []);

  const handleTreatmentRowSelect = useCallback(
    (t: Record<string, unknown>) => {
      const id = String(t.id);
      const next = activeTreatmentId === id ? null : id;
      setActiveTreatmentId(next);
      setFocusParcelleId(next ? resolveTreatmentParcelleId(parcelles, t) : null);
      setMapSelectedParcelleId(null);
      if (next) setOpenPanel(null);
    },
    [activeTreatmentId, parcelles]
  );

  const weatherMode = openPanel === "meteo";

  const handleWeatherData = useCallback((data: WeatherMapData | null, wLoading: boolean) => {
    setWeatherData(data);
    setWeatherLoading(wLoading);
  }, []);

  const toggleWeatherMode = useCallback(() => {
    setOpenPanel((prev) => {
      if (prev === "meteo") return null;
      setActiveTreatmentId(null);
      setFocusParcelleId(null);
      setMapSelectedParcelleId(null);
      return "meteo";
    });
  }, []);

  const loadSatellite = useCallback(async () => {
    setSatelliteLoading(true);
    setSatelliteError(null);
    try {
      if (!SUPABASE_CONFIGURED) {
        setSatelliteData([]);
        setSatelliteError("empty");
        return;
      }
      const res = await fetch("/api/v1/satellite-data", { credentials: "include" });
      if (res.status === 403) {
        setSatelliteData([]);
        setSatelliteError("forbidden");
        return;
      }
      if (!res.ok) {
        setSatelliteData([]);
        setSatelliteError("fetch");
        return;
      }
      const j = await res.json();
      const rows = Array.isArray(j) ? j : (j.data || []);
      setSatelliteData(rows);
      if (!rows.length) setSatelliteError("empty");
    } catch {
      setSatelliteData([]);
      setSatelliteError("fetch");
    } finally {
      setSatelliteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openPanel === "satellite" && satelliteData.length === 0 && !satelliteLoading) {
      void loadSatellite();
    }
  }, [openPanel, satelliteData.length, satelliteLoading, loadSatellite]);

  const toggleSatellitePanel = useCallback(() => {
    setOpenPanel((prev) => {
      if (prev === "satellite") return null;
      setActiveTreatmentId(null);
      setFocusParcelleId(null);
      setMapSelectedParcelleId(null);
      return "satellite";
    });
  }, []);

  const toggleTreatmentsPanel = useCallback(() => {
    setOpenPanel((prev) => {
      const next = prev === "treatments" ? null : "treatments";
      if (next === "treatments") {
        setActiveTreatmentId(null);
        setFocusParcelleId(null);
        setMapSelectedParcelleId(null);
      }
      return next;
    });
  }, []);

  const effectiveParcelleId = mapSelectedParcelleId ?? focusParcelleId;
  const satelliteForMap = useMemo(
    () => alignSatelliteToParcelles(parcelles, satelliteData),
    [parcelles, satelliteData]
  );
  const hasSatelliteIndices = satelliteForMap.length > 0;
  const drawerOpen =
    Boolean(effectiveParcelleId) && openPanel !== "treatments" && openPanel !== "meteo";
  const drawerParcelle = useMemo(
    () => (effectiveParcelleId ? findParcelle(parcelles, effectiveParcelleId) : null),
    [effectiveParcelleId, parcelles]
  );

  useEffect(() => {
    if (!effectiveParcelleId || !drawerParcelle) {
      setHistoryBundle(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/v1/parcelles/${encodeURIComponent(effectiveParcelleId)}/historique`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success && j.data) {
          const d = j.data as ParcelleHistoryBundle;
          setHistoryBundle({
            parcelleId: d.parcelleId,
            stats: d.stats,
            timeline: d.timeline,
            treatments: d.treatments,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryBundle(
            buildParcelleHistoryBundle(
              drawerParcelle,
              treatmentsForParcelle(treatments, drawerParcelle)
            )
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveParcelleId, drawerParcelle, treatments]);

  const handleMapTreatmentSelect = useCallback(
    (id: string | null) => {
      setActiveTreatmentId(id);
      if (!id) {
        setFocusParcelleId(null);
        return;
      }
      const t = treatments.find((x) => String(x.id) === String(id));
      setFocusParcelleId(t ? resolveTreatmentParcelleId(parcelles, t) : null);
    },
    [treatments, parcelles]
  );

  const loadKpis = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardKPIs();
      setKpis(data);
      setKpiError(false);
    } catch {
      setKpiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
    intervalRef.current = setInterval(loadKpis, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadKpis]);

  return {
    showAccessBanner,
    setShowAccessBanner,
    kpis,
    loading,
    kpiError,
    loadKpis,
    treatments,
    parcelles,
    activeTreatmentId,
    focusParcelleId,
    mapSelectedParcelleId,
    historyBundle,
    historyLoading,
    openPanel,
    setOpenPanel,
    weatherData,
    weatherLoading,
    weatherLayers,
    setWeatherLayers,
    weatherOpacity,
    setWeatherOpacity,
    weatherMode,
    drawerOpen,
    drawerParcelle,
    closeParcelleDrawer,
    handleMapParcelleSelect,
    handleTreatmentRowSelect,
    handleMapTreatmentSelect,
    handleWeatherData,
    toggleWeatherMode,
    toggleTreatmentsPanel,
    satelliteData,
    satelliteForMap,
    satelliteLoading,
    satelliteError,
    hasSatelliteIndices,
    satelliteIndex,
    setSatelliteIndex,
    loadSatellite,
    toggleSatellitePanel,
  };
}
