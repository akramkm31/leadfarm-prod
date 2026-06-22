"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParcelles, useTreatments, useStockLevels } from "@/hooks/useData";
import type { Parcelle, StockLevel } from "@/lib/mock-data";
import { summarizeParcelleStock } from "@/lib/parcelle-stock";
import { Layers, Target } from "lucide-react";
import {
  getProp,
  findParcelle,
  findParcelleByTreatment,
  resolveTreatmentParcelleId,
  treatmentsForParcelle,
  sortTreatmentsByDate,
  collectParcelleBounds,
  collectParcelleBoundsFiltered,
} from "./dashboard-map-utils";
import {
  attachParcelleMapLabel,
  bindPolygonClipToImageOverlay,
  parcelleLabelHtml,
  parcelleLabelIconAnchor,
  parcelleLabelIconSize,
  parcelleLabelPosition,
  parcelleSatellitePopupHtml,
  polygonCentroid,
  polygonLatLngBounds,
  shouldShowParcelleMapLabel,
  shouldUseCompactSatelliteLabels,
} from "@/lib/map-labels";
import {
  getIndexValue,
  getIndexLevel,
  buildSatelliteLookup,
  buildDirectSatelliteLookup,
  hasSatelliteIndexValue,
  getNdwiMapColor,
  getSatelliteMapColor,
  NDVI_MAP_LEGEND,
  ndviLegendColor,
  type SatelliteIndexKey,
} from "@/lib/agronome/satellite-utils";
import type { DonneesSatellite } from "@/lib/mcd/types";
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
  selectedParcelleId?: string | null;
  onSelectedParcelleIdChange?: (id: string | null) => void;
  historyPanelExternal?: boolean;
  detailPanelOpen?: boolean;
  detailPanelWidth?: number;
  embedded?: boolean;
  weatherMode?: boolean;
  weatherLayers?: WeatherLayerState;
  weatherOpacity?: number;
  onWeatherData?: (data: WeatherMapData | null, loading: boolean) => void;
  /** Affiche stock + produits sous le nom de chaque parcelle (vue magasinier) */
  stockLabels?: boolean;
  /** Colore les parcelles selon NDVI/NDWI (vue agronome) */
  satelliteMode?: boolean;
  satelliteData?: DonneesSatellite[];
  satelliteIndex?: SatelliteIndexKey;
  /** N'affiche et ne colore que les parcelles ayant un indice synchronisé */
  satelliteIndexedOnly?: boolean;
  /** Vue /satellite : popup riche, légende, badges alerte, couleurs fines */
  satelliteEnhanced?: boolean;
  /** Indices strictement par parcelle_id depuis l’API (pas d’alignement catalogue) */
  satelliteDirectApi?: boolean;
  /** Aperçu NDVI Sentinel par parcelle id */
  satellitePreviewByParcelleId?: Record<string, string>;
  /** Opacité overlay NDVI (0–1) */
  satellitePreviewOpacity?: number;
  hideQuickNav?: boolean;
}

export default function DashboardMap({
  activeTreatmentId,
  onSelectTreatment,
  focusParcelleId = null,
  selectedParcelleId: selectedParcelleIdProp,
  onSelectedParcelleIdChange,
  historyPanelExternal = false,
  detailPanelOpen = false,
  detailPanelWidth = 400,
  embedded = false,
  weatherMode = false,
  weatherLayers = DEFAULT_WEATHER_LAYERS,
  weatherOpacity = 0.65,
  onWeatherData,
  stockLabels = false,
  satelliteMode = false,
  satelliteData = [],
  satelliteIndex = "ndvi",
  satelliteIndexedOnly = false,
  satelliteEnhanced = false,
  satelliteDirectApi = false,
  satellitePreviewByParcelleId = {},
  satellitePreviewOpacity = 0.72,
  hideQuickNav = false,
}: DashboardMapProps) {
  const { data: parcellesRaw } = useParcelles();
  const { data: treatmentsRaw } = useTreatments();
  const { data: stockRaw } = useStockLevels();
  const parcelles = (parcellesRaw || []) as Parcelle[];
  const treatments = (treatmentsRaw || []) as unknown as Record<string, unknown>[];
  const stockLevels = (stockRaw || []) as StockLevel[];

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const overlayClipCleanupsRef = useRef<(() => void)[]>([]);
  const detailLayersRef = useRef<L.Layer[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sentinelTileLayerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [selectedParcelleIdInternal, setSelectedParcelleIdInternal] = useState<string | null>(null);
  const selectedParcelleIdControlled = selectedParcelleIdProp !== undefined;
  const selectedParcelleId = selectedParcelleIdControlled
    ? selectedParcelleIdProp ?? null
    : selectedParcelleIdInternal;
  const setSelectedParcelleId = useCallback(
    (id: string | null) => {
      if (onSelectedParcelleIdChange) onSelectedParcelleIdChange(id);
      if (!selectedParcelleIdControlled) setSelectedParcelleIdInternal(id);
    },
    [onSelectedParcelleIdChange, selectedParcelleIdControlled]
  );
  const [historyBundle, setHistoryBundle] = useState<ParcelleHistoryBundle | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherMapData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const onSelectTreatmentRef = useRef(onSelectTreatment);
  onSelectTreatmentRef.current = onSelectTreatment;
  const skipClearParcelleRef = useRef(false);

  const closeParcellePanel = useCallback(() => {
    setSelectedParcelleId(null);
    if (!historyPanelExternal) setHistoryBundle(null);
    onSelectTreatmentRef.current?.(null);
  }, [historyPanelExternal, setSelectedParcelleId]);

  const handleMapBackgroundClickRef = useRef<() => void>(() => {});
  handleMapBackgroundClickRef.current = () => {
    closeParcellePanel();
  };

  const focusParcelleById = useCallback(
    (parcelleId: string) => {
      skipClearParcelleRef.current = true;
      onSelectTreatmentRef.current?.(null);
      setSelectedParcelleId(parcelleId);
    },
    [setSelectedParcelleId]
  );

  const clearParcelleFocus = useCallback(() => {
    setSelectedParcelleId(null);
    onSelectTreatmentRef.current?.(null);
  }, [setSelectedParcelleId]);

  const handleParcelleClick = useCallback(
    (parcelleId: string) => {
      if (embedded) {
        focusParcelleById(parcelleId);
        return;
      }
      const next = selectedParcelleId === parcelleId ? null : parcelleId;
      if (next) {
        skipClearParcelleRef.current = true;
        onSelectTreatmentRef.current?.(null);
      }
      setSelectedParcelleId(next);
    },
    [embedded, focusParcelleById, selectedParcelleId, setSelectedParcelleId]
  );

  // Désélection traitement (liste) → fermer aussi la parcelle sur la carte
  useEffect(() => {
    if (activeTreatmentId !== null) return;
    if (skipClearParcelleRef.current) {
      skipClearParcelleRef.current = false;
      return;
    }
    setSelectedParcelleId(null);
  }, [activeTreatmentId, setSelectedParcelleId]);

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

      let points: [number, number][];
      if (satelliteMode && satelliteIndexedOnly) {
        const lookup =
          satelliteDirectApi || satelliteEnhanced
            ? buildDirectSatelliteLookup(satelliteData)
            : buildSatelliteLookup(parcelles, satelliteData);
        points = collectParcelleBoundsFiltered(parcelles, (id) =>
          satelliteDirectApi || satelliteEnhanced
            ? lookup.has(id)
            : hasSatelliteIndexValue(lookup.get(id), satelliteIndex)
        );
      } else {
        points = collectParcelleBounds(parcelles);
      }
      if (points.length === 0) return;

      const L = LRef.current;
      const map = mapInstance.current;
      map.fitBounds(L.latLngBounds(points).pad(0.02), {
        padding: embedded ? [4, 4] : [24, 24],
        maxZoom: embedded ? 18 : 17,
        animate,
      });
    },
    [
      loaded,
      parcelles,
      embedded,
      satelliteMode,
      satelliteIndexedOnly,
      satelliteEnhanced,
      satelliteDirectApi,
      satelliteData,
      satelliteIndex,
    ]
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

    overlayClipCleanupsRef.current.forEach((fn) => fn());
    overlayClipCleanupsRef.current = [];
    layersRef.current.forEach((layer) => map.removeLayer(layer));
    layersRef.current = [];

    const useDirectApi = satelliteDirectApi || satelliteEnhanced;
    const satelliteMap = satelliteMode
      ? useDirectApi
        ? buildDirectSatelliteLookup(satelliteData)
        : buildSatelliteLookup(parcelles, satelliteData)
      : new Map();
    const compactSatelliteLabels =
      satelliteMode && shouldUseCompactSatelliteLabels(satelliteMap.size || parcelles.filter((p) => !p.parentId).length);

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

    const addMarkerLabel = (center: L.LatLngExpression, name: string, color: string) => {
      const icon = L.divIcon({
        className: "parc-map-label-wrap",
        html: parcelleLabelHtml(String(name), color),
        iconAnchor: parcelleLabelIconAnchor(),
        iconSize: parcelleLabelIconSize(),
      });
      const m = L.marker(center, { icon, interactive: false }).addTo(map);
      layersRef.current.push(m);
    };

    const drawParcelle = (p: Parcelle, isChild = false) => {
      const sat = satelliteMode ? satelliteMap.get(p.id) : undefined;
      const hasIndex = useDirectApi
        ? !!sat
        : !!sat &&
          (hasSatelliteIndexValue(sat, satelliteIndex) ||
            hasSatelliteIndexValue(sat, "ndvi") ||
            hasSatelliteIndexValue(sat, "ndwi"));

      if (satelliteMode && satelliteIndexedOnly && !hasIndex) {
        if (satelliteEnhanced && !isChild && p.boundary && p.boundary.length > 0) {
          const missing = L.polygon(p.boundary as L.LatLngExpression[], {
            color: "#94a3b8",
            weight: 2,
            dashArray: "8,6",
            fillColor: "#e2e8f0",
            fillOpacity: 0.45,
          }).addTo(map);
          missing.bindPopup(
            `<div class="lf-sat-popup"><b>${p.name}</b><br><span style="color:#64748b">Non indexé — Sync Sentinel-2</span></div>`,
            { maxWidth: 240, className: "lf-sat-popup-leaflet" }
          );
          missing.on("click", (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            handleParcelleClickRef.current(p.id);
          });
          layersRef.current.push(missing);
        }
        p.children?.forEach((child) => drawParcelle(child, true));
        return;
      }

      const selected = isSelected(p.id);
      const hasTreatment = treatments.some(
        (t) =>
          (getProp(t, "parcelleId", "parcelle_id") === p.id ||
            getProp(t, "sousParcelleId", "sous_parcelle_id") === p.id) &&
          getProp(t, "status", "status") === "in_progress"
      );

      let strokeColor = selected ? "#f59e0b" : p.color;
      let fillColor = p.color;
      let fillOpacity = selected ? 0.38 : isChild ? 0.28 : hasTreatment ? 0.25 : 0.15;

      const applySatelliteStyle = satelliteMode && hasIndex && (satelliteIndexedOnly || !isChild);
      const parcellePreviewUrl = satellitePreviewByParcelleId[p.id];
      const hasPreviewAsset = !!parcellePreviewUrl && !!sat?.date_acquisition;
      const showPreviewOverlay =
        satelliteEnhanced && applySatelliteStyle && hasPreviewAsset;

      if (stockLabels && !isChild) {
        const s = summarizeParcelleStock(p, treatments as never[], stockLevels);
        const state = s.productCount === 0 ? "empty" : s.alertCount > 0 ? "warn" : "ok";
        strokeColor = selected ? "#f59e0b" : state === "empty" ? "#64748B" : state === "warn" ? "#F59E0B" : "#22C55E";
        fillColor = strokeColor;
        fillOpacity = selected ? 0.38 : 0.22;
      } else if (applySatelliteStyle && sat) {
        if (satelliteEnhanced) {
          const ndvi = getIndexValue(sat, "ndvi");
          fillColor = ndviLegendColor(ndvi);
          fillOpacity = hasPreviewAsset ? 0.28 : selected ? 0.58 : 0.44;
          strokeColor = selected ? "#f59e0b" : "#ffffff";
        } else {
          const mapColorIndex = satelliteIndex;
          const idxVal = hasSatelliteIndexValue(sat, mapColorIndex)
            ? getIndexValue(sat, mapColorIndex)
            : null;
          const color =
            idxVal != null ? getIndexLevel(idxVal, satelliteIndex).bar : p.color;
          strokeColor = selected ? "#f59e0b" : color;
          fillColor = color;
          fillOpacity = selected ? 0.48 : 0.35;
        }
      }

      if (p.boundary && p.boundary.length > 0) {
        let haloLayer: L.Polygon | null = null;
        if (satelliteEnhanced && applySatelliteStyle) {
          haloLayer = L.polygon(p.boundary as L.LatLngExpression[], {
            color: selected ? "#f59e0b" : "#0f172a",
            weight: selected ? 5 : 4,
            fillOpacity: 0,
            interactive: false,
          }).addTo(map);
          if (haloLayer) layersRef.current.push(haloLayer);
        }

        const poly = L.polygon(p.boundary as L.LatLngExpression[], {
          color: strokeColor,
          fillColor,
          fillOpacity,
          weight: selected ? 3.5 : satelliteEnhanced && applySatelliteStyle ? 2.5 : isChild ? 2 : hasTreatment ? 3 : 2.5,
          dashArray: isChild ? "6,4" : stockLabels || applySatelliteStyle ? undefined : p.lastTreatmentDate ? undefined : "5,5",
        }).addTo(map);
        if (satelliteEnhanced && applySatelliteStyle) {
          poly.on("click", (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            poly.openPopup(e.latlng);
            handleParcelleClickRef.current(p.id);
          });
        } else {
          addClickable(poly, p.id);
        }
        layersRef.current.push(poly);

        if (showPreviewOverlay && p.boundary?.length) {
          const bounds = polygonLatLngBounds(p.boundary as [number, number][]);
          if (bounds) {
            const imgOverlay = L.imageOverlay(parcellePreviewUrl, bounds, {
              opacity: satellitePreviewOpacity,
              interactive: false,
              className: "lf-sat-ndvi-overlay",
            }).addTo(map);
            const bindClip = () => {
              const el = imgOverlay.getElement() as HTMLImageElement | undefined;
              if (!el || el.naturalWidth === 0) return;
              const cleanup = bindPolygonClipToImageOverlay(
                map,
                p.boundary as [number, number][],
                bounds,
                el
              );
              overlayClipCleanupsRef.current.push(cleanup);
            };
            imgOverlay.on("load", bindClip);
            const imgEl = imgOverlay.getElement() as HTMLImageElement | undefined;
            if (imgEl?.complete) bindClip();
            layersRef.current.push(imgOverlay);
            poly.bringToFront();
            haloLayer?.bringToFront();
            poly.bringToFront();
          }
        }

        if (satelliteEnhanced && applySatelliteStyle && sat) {
          poly.bindPopup(parcelleSatellitePopupHtml(p, sat), {
            maxWidth: 280,
            className: "lf-sat-popup-leaflet",
          });
        } else if (stockLabels) {
          // Magasinier: label only top-level parcelles, stock aggregated over sub-parcelles
          if (!isChild) {
            const s = summarizeParcelleStock(p, treatments as never[], stockLevels);
            attachParcelleMapLabel(poly, p, isChild, { productCount: s.productCount, alertCount: s.alertCount }, true);
          }
        } else if (applySatelliteStyle && sat && !satelliteEnhanced) {
          attachParcelleMapLabel(poly, p, isChild, undefined, true, { row: sat, index: satelliteIndex }, compactSatelliteLabels);
        } else if (!satelliteIndexedOnly && !satelliteEnhanced) {
          attachParcelleMapLabel(poly, p, isChild);
        }
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

      if (shouldShowParcelleMapLabel(p, isChild) && !p.boundary?.length) {
        const labelPos = parcelleLabelPosition(p);
        if (labelPos) addMarkerLabel(labelPos as L.LatLngExpression, p.name, p.color);
      }

      p.children?.forEach((child) => drawParcelle(child, true));
    };

    parcelles.forEach((p) => drawParcelle(p));

    if (!resolvedFocusId) {
      fitAllParcellesRef.current(false);
    }
  }, [
    parcelles,
    treatments,
    loaded,
    selectedParcelleId,
    activeTreatmentId,
    focusParcelleId,
    resolvedFocusId,
    stockLabels,
    stockLevels,
    satelliteMode,
    satelliteData,
    satelliteIndex,
    satelliteIndexedOnly,
    satelliteEnhanced,
    satelliteDirectApi,
    satellitePreviewByParcelleId,
    satellitePreviewOpacity,
  ]);

  useEffect(() => {
    if (!loaded || !satelliteEnhanced || !satelliteMode) return;
    const L = LRef.current;
    const map = mapInstance.current;
    if (!L || !map) return;

    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "lf-sat-ndvi-legend-control");
      L.DomEvent.disableClickPropagation(div);
      const rows = NDVI_MAP_LEGEND.map(
        (item) =>
          `<div class="lf-sat-ndvi-legend-row">
            <span class="lf-sat-ndvi-legend-swatch" style="background:${item.color}"></span>
            <span>${item.label}</span>
            <span class="lf-sat-ndvi-legend-range">${item.range}</span>
          </div>`
      ).join("");
      div.innerHTML = `<b class="lf-sat-ndvi-legend-heading">NDVI</b>${rows}`;
      return div;
    };
    legend.addTo(map);
    return () => {
      legend.remove();
    };
  }, [loaded, satelliteEnhanced, satelliteMode]);

  // Sentinel Hub WMS tile layer (NDVI / NDWI raster overlay via Process API)
  useEffect(() => {
    const L = LRef.current;
    const map = mapInstance.current;
    if (!L || !map || !loaded) return;

    if (sentinelTileLayerRef.current) {
      map.removeLayer(sentinelTileLayerRef.current);
      sentinelTileLayerRef.current = null;
    }
    if (!satelliteMode) return;

    const tileUrl = `/api/v1/satellite-data/tile/{z}/{x}/{y}?index=${satelliteIndex}&days=30`;
    const layer = L.tileLayer(tileUrl, {
      opacity: satellitePreviewOpacity,
      minZoom: 10,
      maxNativeZoom: 15,
      maxZoom: 18,
      tileSize: 256,
      attribution: "Sentinel-2 L2A · ESA Copernicus",
    });
    layer.addTo(map);
    sentinelTileLayerRef.current = layer;

    return () => {
      if (sentinelTileLayerRef.current) {
        map.removeLayer(sentinelTileLayerRef.current);
        sentinelTileLayerRef.current = null;
      }
    };
  }, [loaded, satelliteMode, satelliteIndex]);

  // Update tile opacity without re-fetching tiles
  useEffect(() => {
    sentinelTileLayerRef.current?.setOpacity(satellitePreviewOpacity);
  }, [satellitePreviewOpacity]);

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

    if (satelliteEnhanced) {
      if (focusParcelle.boundary?.length) {
        const highlight = L.polygon(focusParcelle.boundary as L.LatLngExpression[], {
          color: "#f59e0b",
          fillOpacity: 0,
          weight: 3,
          dashArray: "6,4",
          interactive: false,
        }).addTo(map);
        detailLayersRef.current.push(highlight);
      }
      return;
    }

    if (focusParcelle.boundary?.length) {
      const highlight = L.polygon(focusParcelle.boundary as L.LatLngExpression[], {
        color: "#f59e0b",
        fillColor: focusParcelle.color,
        fillOpacity: 0.28,
        weight: 4,
        dashArray: "4,4",
        interactive: false,
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
        interactive: false,
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
  }, [activeTreatmentId, focusParcelle, treatments, loaded, satelliteEnhanced]);

  // Computed data for React overlay
  const overlayParcelle = focusParcelle;

  const overlayTreatments = useMemo(() =>
    overlayParcelle ? sortTreatmentsByDate(treatmentsForParcelle(treatments, overlayParcelle)) : [],
    [overlayParcelle, treatments]
  );

  useEffect(() => {
    if (!embedded || !detailPanelOpen || !loaded || !mapInstance.current) return;
    const map = mapInstance.current;
    const t = window.setTimeout(() => map.invalidateSize(), 380);
    return () => window.clearTimeout(t);
  }, [embedded, detailPanelOpen, loaded]);

  const detailPanelOpenRef = useRef(detailPanelOpen);
  useEffect(() => {
    if (!embedded || !loaded || !mapInstance.current) return;
    const map = mapInstance.current;
    const wasOpen = detailPanelOpenRef.current;
    detailPanelOpenRef.current = detailPanelOpen;
    const t = window.setTimeout(() => {
      map.invalidateSize();
      if (detailPanelOpen && !wasOpen) {
        map.panBy([-Math.round(detailPanelWidth * 0.22), 0], { animate: true, duration: 0.38 });
      }
    }, 380);
    return () => window.clearTimeout(t);
  }, [embedded, detailPanelOpen, detailPanelWidth, loaded]);

  // Historique complet (dashboard modal — drawer géré par la page)
  useEffect(() => {
    if (historyPanelExternal) return;
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
  }, [historyPanelExternal, resolvedFocusId, overlayParcelle, treatments]);

  const onWeatherDataRef = useRef(onWeatherData);
  onWeatherDataRef.current = onWeatherData;
  const parcellesRef = useRef(parcelles);
  parcellesRef.current = parcelles;

  useEffect(() => {
    if (!weatherMode) {
      setWeatherData(null);
      setWeatherLoading(false);
      onWeatherDataRef.current?.(null, false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setWeatherLoading(true);
      onWeatherDataRef.current?.(null, true);
      try {
        const bounds = buildRainGridBounds(collectParcelleBounds(parcellesRef.current));
        const data = await fetchWeatherMapData(bounds);
        if (cancelled) return;
        setWeatherData(data);
        onWeatherDataRef.current?.(data, false);
      } catch {
        if (cancelled) return;
        setWeatherData(null);
        onWeatherDataRef.current?.(null, false);
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      setWeatherLoading(false);
      onWeatherDataRef.current?.(null, false);
    };
  }, [weatherMode]);

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

      {parcelles.length > 0 && !hideQuickNav && (
        <ParcelleQuickNav
          parcelles={parcelles}
          selectedId={chipSelectedId}
          onSelect={focusParcelleById}
          onClear={clearParcelleFocus}
          variant="light"
          hint={embedded ? "Sélection → panneau latéral" : "Clic parcelle → historique complet"}
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

      {overlayParcelle && embedded && !weatherMode && !historyPanelExternal && !satelliteEnhanced && (
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
