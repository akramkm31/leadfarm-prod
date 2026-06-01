"use client";

import { useEffect, useRef, useState } from "react";
import type { Parcelle } from "@/lib/mock-data";
import {
  buildRainGridBounds,
  rainZoneHtml,
  windArrowHtml,
  type WeatherMapData,
} from "@/lib/weather-map";
import {
  OWM_LAYERS,
  owmTileUrl,
  type OwmLayerId,
  type WeatherLayerState,
} from "@/lib/open-weather-layers";
import { collectParcelleBounds } from "./dashboard-map-utils";

type OwmStatus = "loading" | "ok" | "missing" | "invalid" | "tile_error";

interface WeatherMapOverlayProps {
  active: boolean;
  map: L.Map | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
  parcelles: Parcelle[];
  weather: WeatherMapData | null;
  layers: WeatherLayerState;
  opacity: number;
}

export default function WeatherMapOverlay({
  active,
  map,
  L,
  parcelles,
  weather,
  layers,
  opacity,
}: WeatherMapOverlayProps) {
  const tileLayersRef = useRef<Map<string, L.TileLayer>>(new Map());
  const fallbackLayersRef = useRef<L.Layer[]>([]);
  const [owmStatus, setOwmStatus] = useState<OwmStatus>("loading");
  const [owmError, setOwmError] = useState<string | null>(null);
  const tileErrorsRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setOwmStatus("loading");
      setOwmError(null);
      tileErrorsRef.current = 0;
      return;
    }

    let cancelled = false;
    fetch("/api/weather/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.configured) {
          setOwmStatus("missing");
          setOwmError(null);
          return;
        }
        if (!j.valid) {
          setOwmStatus("invalid");
          setOwmError(typeof j.error === "string" ? j.error : "Clé API invalide");
          return;
        }
        setOwmStatus("ok");
        setOwmError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setOwmStatus("invalid");
          setOwmError("Impossible de vérifier la clé API");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!map || !L) return;

    const clearTiles = () => {
      tileLayersRef.current.forEach((layer) => map.removeLayer(layer));
      tileLayersRef.current.clear();
    };

    const clearFallback = () => {
      fallbackLayersRef.current.forEach((layer) => map.removeLayer(layer));
      fallbackLayersRef.current = [];
    };

    const clearAll = () => {
      clearTiles();
      clearFallback();
    };

    if (!active) {
      clearAll();
      return;
    }

    const useOwm = owmStatus === "ok";
    const useFallback =
      owmStatus === "missing" || owmStatus === "invalid" || owmStatus === "tile_error";

    if (owmStatus === "loading") {
      clearAll();
      return clearAll;
    }

    if (!map.getPane("weatherOwmPane")) {
      map.createPane("weatherOwmPane");
      const pane = map.getPane("weatherOwmPane");
      if (pane) pane.style.zIndex = "450";
    }
    if (!map.getPane("weatherFallbackPane")) {
      map.createPane("weatherFallbackPane");
      const pane = map.getPane("weatherFallbackPane");
      if (pane) pane.style.zIndex = "451";
    }

    clearFallback();
    if (useFallback && weather) {
      const bounds = buildRainGridBounds(collectParcelleBounds(parcelles));
      const latSpan = bounds.north - bounds.south;
      const lngSpan = bounds.east - bounds.west;
      const windRows = 5;
      const windCols = 5;

      for (let r = 0; r < windRows; r++) {
        for (let c = 0; c < windCols; c++) {
          const lat = bounds.south + (latSpan * (r + 0.5)) / windRows;
          const lng = bounds.west + (lngSpan * (c + 0.5)) / windCols;
          const cell = weather.rainCells.find(
            (cell) =>
              Math.abs(cell.lat - lat) < cell.halfLat &&
              Math.abs(cell.lng - lng) < cell.halfLng
          );
          const cellWind = cell
            ? { speed: weather.windspeed, direction: weather.winddirection }
            : { speed: weather.windspeed, direction: weather.winddirection };

          if (layers.wind) {
            const icon = L.divIcon({
              className: "weather-wind-icon",
              html: windArrowHtml(cellWind.speed, cellWind.direction, 72),
              iconSize: [72, 72],
              iconAnchor: [36, 36],
            });
            const marker = L.marker([lat, lng], {
              icon,
              interactive: false,
              pane: "weatherFallbackPane",
            }).addTo(map);
            fallbackLayersRef.current.push(marker);
          }
        }
      }

      if (layers.precipitation) {
        for (const cell of weather.rainCells) {
          const corners: L.LatLngExpression[] = [
            [cell.lat - cell.halfLat, cell.lng - cell.halfLng],
            [cell.lat - cell.halfLat, cell.lng + cell.halfLng],
            [cell.lat + cell.halfLat, cell.lng + cell.halfLng],
            [cell.lat + cell.halfLat, cell.lng - cell.halfLng],
          ];
          const fillOpacity = Math.min(0.6, 0.15 + cell.precipProb / 150);
          const poly = L.polygon(corners, {
            color: "#0284c7",
            weight: 1,
            opacity: 0.4,
            fillColor: "#0ea5e9",
            fillOpacity,
            interactive: false,
            pane: "weatherFallbackPane",
          }).addTo(map);
          fallbackLayersRef.current.push(poly);

          if (cell.precipProb >= 10) {
            const rainIcon = L.divIcon({
              className: "weather-rain-icon",
              html: rainZoneHtml(cell.precipProb),
              iconSize: [80, 80],
              iconAnchor: [40, 40],
            });
            const rainMarker = L.marker([cell.lat, cell.lng], {
              icon: rainIcon,
              interactive: false,
              pane: "weatherFallbackPane",
            }).addTo(map);
            fallbackLayersRef.current.push(rainMarker);
          }
        }
      }
    }

    clearTiles();
    if (useOwm) {
      tileErrorsRef.current = 0;
      const activeIds = new Set(
        OWM_LAYERS.filter((l) => layers[l.id]).map((l) => l.id)
      );

      for (const cfg of OWM_LAYERS) {
        if (!activeIds.has(cfg.id)) continue;

        const tile = L.tileLayer(owmTileUrl(cfg.tile), {
          maxZoom: 19,
          minZoom: 4,
          opacity: Math.max(0.35, opacity),
          pane: "weatherOwmPane",
          className: "weather-owm-tiles",
          errorTileUrl:
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        });

        tile.on("tileerror", () => {
          tileErrorsRef.current += 1;
          if (tileErrorsRef.current >= 3) {
            setOwmStatus((prev) => (prev === "ok" ? "tile_error" : prev));
            setOwmError("Tuiles OpenWeatherMap indisponibles");
          }
        });

        tile.addTo(map);
        tileLayersRef.current.set(cfg.id, tile);
      }

      map.invalidateSize();
    }

    return clearAll;
  }, [active, layers, opacity, map, L, owmStatus, weather, parcelles]);

  useEffect(() => {
    tileLayersRef.current.forEach((layer) => layer.setOpacity(Math.max(0.35, opacity)));
  }, [opacity]);

  if (!active) return null;

  if (owmStatus !== "missing" && owmStatus !== "invalid" && owmStatus !== "tile_error") {
    return null;
  }

  return (
    <div className="weather-map-owm-warn">
      {owmStatus === "missing" && (
        <>Couches live indisponibles — ajoutez <code>OPENWEATHERMAP_API_KEY</code> dans <code>.env.local</code></>
      )}
      {owmStatus === "invalid" && (
        <>Clé OpenWeatherMap invalide{owmError ? ` : ${owmError}` : ""}. Visualisation Open-Meteo active.</>
      )}
      {owmStatus === "tile_error" && (
        <>Tuiles OpenWeatherMap indisponibles. Visualisation Open-Meteo active.</>
      )}
    </div>
  );
}
