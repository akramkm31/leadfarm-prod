"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParcelles, useTreatments } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import { Layers, Target } from "lucide-react";
import {
  getProp,
  findParcelle,
  findParcelleByTreatment,
  resolveTreatmentParcelleId,
  treatmentsForParcelle,
  sortTreatmentsByDate,
  collectParcelleBounds,
} from "./dashboard-map-utils";
import { parcelleLabelHtml, parcelleLabelIconAnchor } from "@/lib/map-labels";
import ParcelleOverlay from "./ParcelleOverlay";
import ParcelleQuickNav from "./ParcelleQuickNav";
import DashboardParcelleHistoryPanel from "./DashboardParcelleHistoryPanel";
import WeatherMapOverlay from "./WeatherMapOverlay";
import { buildParcelleHistoryBundle, type ParcelleHistoryBundle } from "@/lib/parcelle-history";
import {
  buildRainGridBounds,
  fetchWeatherMapData,
  type WeatherMapData,
} from "@/lib/weather-map";
import {
  DEFAULT_WEATHER_LAYERS,
  type WeatherLayerState,
} from "@/lib/open-weather-layers";

interface DashboardMapProps {
  activeTreatmentId?: string | null;
  onSelectTreatment?: (id: string | null) => void;
  /** Parcelle à centrer (ex. clic ligne tableau) — prioritaire sur la résolution interne */
  focusParcelleId?: string | null;
  embedded?: boolean;
  weatherMode?: boolean;
  weatherLayers?: WeatherLayerState;
  weatherOpacity?: number;
  onWeatherData?: (data: WeatherMapData | null, loading: boolean) => void;
}

export default function DashboardMap({
  activeTreatmentId,
  onSelectTreatment,
  focusParcelleId = null,
  embedded = false,
  weatherMode = false,
  weatherLayers = DEFAULT_WEATHER_LAYERS,
  weatherOpacity = 0.65,
  onWeatherData,
}: DashboardMapProps) {
  const { data: parcellesRaw } = useParcelles();
  const { data: treatmentsRaw } = useTreatments();
  const parcelles = (parcellesRaw || []) as Parcelle[];
  const treatments = (treatmentsRaw || []) as unknown as Record<string, unknown>[];

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const detailLayersRef = useRef<L.Layer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [selectedParcelleId, setSelectedParcelleId] = useState<string | null>(null);
  const [historyBundle, setHistoryBundle] = useState<ParcelleHistoryBundle | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherMapData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const onSelectTreatmentRef = useRef(onSelectTreatment);
  onSelectTreatmentRef.current = onSelectTreatment;
  const skipClearParcelleRef = useRef(false);

  const closeParcellePanel = useCallback(() => {
    setSelectedParcelleId(null);
    setHistoryBundle(null);
    onSelectTreatmentRef.current?.(null);
  }, []);

  const handleMapBackgroundClickRef = useRef<() => void>(() => {});
  handleMapBackgroundClickRef.current = () => {
    closeParcellePanel();
  };

  const focusParcelleById = useCallback((parcelleId: string) => {
    skipClearParcelleRef.current = true;
    onSelectTreatmentRef.current?.(null);
    setSelectedParcelleId(parcelleId);
  }, []);

  const clearParcelleFocus = useCallback(() => {
    setSelectedParcelleId(null);
    onSelectTreatmentRef.current?.(null);
  }, []);

  const handleParcelleClick = useCallback(
    (parcelleId: string) => {
      if (embedded) {
        focusParcelleById(parcelleId);
        return;
      }
      setSelectedParcelleId((prev) => {
        const next = prev === parcelleId ? null : parcelleId;
        if (next) {
          skipClearParcelleRef.current = true;
          onSelectTreatmentRef.current?.(null);
        }
        return next;
      });
    },
    [embedded, focusParcelleById]
  );

  // Désélection traitement (liste) → fermer aussi la parcelle sur la carte
  useEffect(() => {
    if (activeTreatmentId !== null) return;
    if (skipClearParcelleRef.current) {
      skipClearParcelleRef.current = false;
      return;
    }
    setSelectedParcelleId(null);
  }, [activeTreatmentId]);

  const handleParcelleClickRef = useRef(handleParcelleClick);
  handleParcelleClickRef.current = handleParcelleClick;

  const resolvedFocusId = useMemo(() => {
    if (focusParcelleId) return focusParcelleId;
    if (selectedParcelleId) return selectedParcelleId;
    if (!activeTreatmentId) return null;
    const trt = treatments.find((t) => String(t.id) === String(activeTreatmentId));
    return trt ? resolveTreatmentParcelleId(parcelles, trt) : null;
  }, [focusParcelleId, selectedParcelleId, activeTreatmentId, treatments, parcelles]);

  const resolvedFocusIdRef = useRef(resolvedFocusId);
  resolvedFocusIdRef.current = resolvedFocusId;

  const fitAllParcelles = useCallback(
    (animate = false) => {
      if (!loaded || !mapInstance.current || !LRef.current) return;
      if (resolvedFocusIdRef.current) return;

      const points = collectParcelleBounds(parcelles);
      if (points.length === 0) return;

      const L = LRef.current;
      const map = mapInstance.current;
      map.fitBounds(L.latLngBounds(points).pad(0.02), {
        padding: embedded ? [4, 4] : [24, 24],
        maxZoom: embedded ? 18 : 17,
        animate,
      });
    },
    [loaded, parcelles, embedded]
  );

  const fitAllParcellesRef = useRef(fitAllParcelles);
  fitAllParcellesRef.current = fitAllParcelles;

  // Init map once (re-mounts cleanly on layout toggles)
  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      LRef.current = L;

      const map = L.map(container, {
        center: [34.9871, -0.5361],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      }).addTo(map);



      map.on("click", () => {
        handleMapBackgroundClickRef.current?.();
      });

      mapInstance.current = map;
      setLeafletMap(map);
      setLoaded(true);
    };

    initMap();

    return () => {
      cancelled = true;
      setLoaded(false);
      setLeafletMap(null);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Handle auto-resizing
  useEffect(() => {
    if (!loaded || !mapRef.current || !mapInstance.current) return;
    const map = mapInstance.current;
    const refit = () => {
      map.invalidateSize();
      requestAnimationFrame(() => fitAllParcellesRef.current(false));
    };

    const ro = new ResizeObserver(refit);
    ro.observe(mapRef.current);
    refit();

    const timer = setTimeout(refit, 200);
    const timer2 = setTimeout(refit, 500);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [loaded, embedded, parcelles.length]);

  // Render parcelle polygons
  useEffect(() => {
    if (!loaded) return;
    const L = LRef.current;
    const map = mapInstance.current;
    if (!L || !map) return;

    layersRef.current.forEach((layer) => map.removeLayer(layer));
    layersRef.current = [];

    const isSelected = (id: string) =>
      resolvedFocusId === id ||
      selectedParcelleId === id ||
      (!!activeTreatmentId &&
        treatments.some((t) => {
          if (String(t.id) !== String(activeTreatmentId)) return false;
          return resolveTreatmentParcelleId(parcelles, t) === id;
        }));

    const addClickable = (layer: L.Layer, id: string) => {
      layer.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        handleParcelleClickRef.current(id);
      });
    };

    const addLabel = (center: L.LatLngExpression, name: string, color: string) => {
      const icon = L.divIcon({
        className: "",
        html: parcelleLabelHtml(String(name), color),
        iconAnchor: parcelleLabelIconAnchor(),
      });
      const m = L.marker(center, { icon, interactive: false }).addTo(map);
      layersRef.current.push(m);
    };

    const drawParcelle = (p: Parcelle, isChild = false) => {
      const selected = isSelected(p.id);
      const hasTreatment = treatments.some(
        (t) =>
          (getProp(t, "parcelleId", "parcelle_id") === p.id ||
            getProp(t, "sousParcelleId", "sous_parcelle_id") === p.id) &&
          getProp(t, "status", "status") === "in_progress"
      );

      if (p.boundary && p.boundary.length > 0) {
        const poly = L.polygon(p.boundary as L.LatLngExpression[], {
          color: selected ? "#f59e0b" : p.color,
          fillColor: p.color,
          fillOpacity: selected ? 0.38 : isChild ? 0.28 : hasTreatment ? 0.25 : 0.15,
          weight: selected ? 3.5 : isChild ? 2 : hasTreatment ? 3 : 2,
          dashArray: isChild ? "6,4" : p.lastTreatmentDate ? undefined : "5,5",
        }).addTo(map);
        addClickable(poly, p.id);
        layersRef.current.push(poly);
        if (isChild) poly.bringToFront();
      } else if (p.center) {
        // No boundary → draw a clickable circle marker so it's still reachable
        const circle = L.circleMarker(p.center as L.LatLngExpression, {
          radius: 14,
          color: selected ? "#f59e0b" : p.color,
          fillColor: p.color,
          fillOpacity: selected ? 0.6 : 0.35,
          weight: selected ? 3 : 2,
          dashArray: p.lastTreatmentDate ? undefined : "4,3",
        }).addTo(map);
        addClickable(circle, p.id);
        layersRef.current.push(circle);
      }

      // Pulse indicator for active treatments
      if (hasTreatment && p.center) {
        const pulseIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:20px;height:20px;pointer-events:none;">
            <div style="position:absolute;inset:0;background:${p.color};border-radius:50%;opacity:0.3;animation:pulse 2s ease-out infinite;"></div>
            <div style="position:absolute;top:5px;left:5px;width:10px;height:10px;background:${p.color};border-radius:50%;border:2px solid white;box-shadow:0 0 8px ${p.color};"></div>
          </div><style>@keyframes pulse{0%{transform:scale(1);opacity:0.3}100%{transform:scale(2.5);opacity:0}}</style>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        layersRef.current.push(L.marker(p.center as L.LatLngExpression, { icon: pulseIcon, interactive: false }).addTo(map));
      }

      if (p.center) addLabel(p.center as L.LatLngExpression, p.name, p.color);

      p.children?.forEach((child) => drawParcelle(child, true));
    };

    parcelles.forEach((p) => drawParcelle(p));

    if (!resolvedFocusId) {
      fitAllParcellesRef.current(false);
    }
  }, [parcelles, treatments, loaded, selectedParcelleId, activeTreatmentId, focusParcelleId, resolvedFocusId]);

  // Sync parcelle selection when a treatment is picked from the list
  useEffect(() => {
    if (focusParcelleId) {
      setSelectedParcelleId(focusParcelleId);
      return;
    }
    if (!activeTreatmentId) return;
    const trt = treatments.find((t) => String(t.id) === String(activeTreatmentId));
    if (!trt) return;
    const parcelle = findParcelleByTreatment(parcelles, trt);
    if (parcelle) setSelectedParcelleId(parcelle.id);
  }, [activeTreatmentId, focusParcelleId, treatments, parcelles]);

  const chipSelectedId = resolvedFocusId;

  const focusParcelle = useMemo(() => {
    if (!resolvedFocusId) return null;
    return findParcelle(parcelles, resolvedFocusId);
  }, [resolvedFocusId, parcelles]);

  // Highlight selected parcelle on map (no Leaflet popup — React overlay handles display)
  useEffect(() => {
    if (!loaded) return;
    const L = LRef.current;
    const map = mapInstance.current;
    if (!L || !map) return;

    detailLayersRef.current.forEach((layer) => map.removeLayer(layer));
    detailLayersRef.current = [];

    if (!focusParcelle) return;

    if (focusParcelle.boundary?.length) {
      const highlight = L.polygon(focusParcelle.boundary as L.LatLngExpression[], {
        color: "#f59e0b",
        fillColor: focusParcelle.color,
        fillOpacity: 0.28,
        weight: 4,
        dashArray: "4,4",
      }).addTo(map);
      detailLayersRef.current.push(highlight);
      map.fitBounds(L.latLngBounds(focusParcelle.boundary).pad(0.25), { animate: true, duration: 0.5 });
    } else if (focusParcelle.center) {
      const center = focusParcelle.center as L.LatLngExpression;
      const ring = L.circleMarker(center, {
        radius: 22,
        color: "#f59e0b",
        fillColor: focusParcelle.color,
        fillOpacity: 0.35,
        weight: 3,
      }).addTo(map);
      detailLayersRef.current.push(ring);
      map.setView(center, Math.max(map.getZoom(), 16), { animate: true, duration: 0.5 });
    }

    if (activeTreatmentId) {
      const trt = treatments.find((t) => String(t.id) === String(activeTreatmentId));
      const gpsTrack = trt ? getProp(trt, "gpsTrack", "gps_track") : null;
      if (Array.isArray(gpsTrack) && gpsTrack.length > 0) {
        const line = L.polyline(gpsTrack as L.LatLngExpression[], {
          color: "#2d6b3f", weight: 3, opacity: 0.75, dashArray: "6,4",
        }).addTo(map);
        detailLayersRef.current.push(line);
      }
    }

    return () => {
      detailLayersRef.current.forEach((layer) => map.removeLayer(layer));
      detailLayersRef.current = [];
    };
  }, [activeTreatmentId, focusParcelle, treatments, loaded]);

  // Computed data for React overlay
  const overlayParcelle = focusParcelle;

  const overlayTreatments = useMemo(() =>
    overlayParcelle ? sortTreatmentsByDate(treatmentsForParcelle(treatments, overlayParcelle)) : [],
    [overlayParcelle, treatments]
  );

  // Historique complet (dashboard)
  useEffect(() => {
    if (!resolvedFocusId) {
      setHistoryBundle(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/v1/parcelles/${encodeURIComponent(resolvedFocusId)}/historique`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success && j.data) {
          const d = j.data as ParcelleHistoryBundle & { parcelle?: Parcelle };
          setHistoryBundle({
            parcelleId: d.parcelleId,
            stats: d.stats,
            timeline: d.timeline,
            treatments: d.treatments,
          });
        }
      })
      .catch(() => {
        if (!cancelled && overlayParcelle) {
          setHistoryBundle(
            buildParcelleHistoryBundle(overlayParcelle, treatmentsForParcelle(treatments, overlayParcelle))
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedFocusId, overlayParcelle, treatments]);

  useEffect(() => {
    if (!weatherMode) {
      setWeatherData(null);
      setWeatherLoading(false);
      onWeatherData?.(null, false);
      return;
    }
    let cancelled = false;
    setWeatherLoading(true);
    onWeatherData?.(null, true);
    const bounds = buildRainGridBounds(collectParcelleBounds(parcelles));
    fetchWeatherMapData(bounds).then((data) => {
      if (cancelled) return;
      setWeatherData(data);
      setWeatherLoading(false);
      onWeatherData?.(data, false);
    });
    return () => {
      cancelled = true;
    };
  }, [weatherMode, parcelles, onWeatherData]);

  // GIS HUD Actions
  const handleCenterMap = () => {
    if (!loaded || !mapInstance.current || !LRef.current) return;
    const points = collectParcelleBounds(parcelles);
    if (points.length > 0) {
      fitAllParcelles(true);
      return;
    }
    mapInstance.current.setView([34.9871, -0.5361], 14);
  };

  return (
    <div className={embedded ? "dashboard-map-embedded relative h-full w-full min-h-0 overflow-hidden bg-[#f5f8ec]" : "glass-card overflow-hidden relative"}>
      {!embedded && (
        <div className="flex items-center justify-between p-4 pb-0">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Carte des Parcelles</h3>
            <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">
              Cliquez sur une zone colorée pour voir l&apos;historique
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="p-1.5 rounded-lg hover:bg-[#f1f5e6]" aria-label="Couches">
              <Layers className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleCenterMap} className="p-1.5 rounded-lg hover:bg-[#f1f5e6]" aria-label="Centrer">
              <Target className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {embedded && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-1">
          <button
            type="button"
            onClick={handleCenterMap}
            className="p-1.5 rounded-lg bg-[rgba(251,253,246,.92)] border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)] hover:bg-[#f1f5e6] shadow-sm flex items-center justify-center"
            title="Recadrer sur les parcelles"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {parcelles.length > 0 && !embedded && (
        <ParcelleQuickNav
          parcelles={parcelles}
          selectedId={chipSelectedId}
          onSelect={focusParcelleById}
          onClear={clearParcelleFocus}
          variant="light"
          hint="Clic parcelle → historique complet"
        />
      )}

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f5f8ec]/90 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-valley-green)]/30 border-t-[var(--color-amber-seed)] rounded-full animate-spin" />
            <span className="text-xs text-[var(--color-mist-gray)]">Chargement de la carte…</span>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        className={embedded ? "absolute inset-0 w-full h-full z-0" : "h-[400px] mt-3 rounded-b-2xl"}
      />

      {!embedded && (
        <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1 p-2 rounded-lg bg-[rgba(251,253,246,.92)] border border-[var(--color-stone-moss)] text-[10px]">
          <div className="flex items-center gap-2 text-[var(--color-adaline-ink)]">
            <div className="w-3 h-3 rounded bg-[var(--color-forest-dew)] border border-[var(--color-valley-green)]" />
            <span>Traitée</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-adaline-ink)]">
            <div className="w-3 h-0.5 border-b border-dashed border-[var(--color-mist-gray)]" />
            <span>Non traitée</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-adaline-ink)]">
            <div className="w-3 h-3 rounded-full border-2 border-[var(--color-amber-seed)] animate-pulse" />
            <span>Sélection</span>
          </div>
        </div>
      )}

      {weatherMode && loaded && (
        <WeatherMapOverlay
          active={weatherMode}
          map={leafletMap}
          L={LRef.current}
          parcelles={parcelles}
          weather={weatherData}
          layers={weatherLayers}
          opacity={weatherOpacity}
        />
      )}

      {overlayParcelle && embedded && !weatherMode && (
        <DashboardParcelleHistoryPanel
          parcelle={overlayParcelle}
          history={historyBundle}
          loading={historyLoading}
          onClose={closeParcellePanel}
        />
      )}
      {overlayParcelle && !embedded && (
        <ParcelleOverlay
          parcelle={overlayParcelle}
          treatments={overlayTreatments}
          onClose={closeParcellePanel}
        />
      )}
    </div>
  );
}
