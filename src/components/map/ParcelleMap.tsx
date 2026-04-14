"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParcelles } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import { Maximize2, Layers, Target, MousePointer2, Pencil, ZoomIn, ZoomOut, Hand, LocateFixed } from "lucide-react";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type DrawTool = "polygon" | "rectangle" | "gps";

interface ParcelleMapProps {
  onParcelleClick?: (id: string) => void;
  onCreateSubParcelle?: (parentId: string) => void;
  drawMode?: boolean;
  drawTool?: DrawTool;
  drawnPoints?: [number, number][];
  onMapClick?: (lat: number, lon: number) => void;
  onPointUpdate?: (index: number, lat: number, lon: number) => void;
  onSnapClose?: () => void;
  onPointDelete?: (index: number) => void;
  onStartDraw?: () => void;
  onShapeComplete?: (points: [number, number][]) => void;
  drawColor?: string;
  hideHud?: boolean;
}

export default function ParcelleMap({
  onParcelleClick,
  onCreateSubParcelle,
  drawMode,
  drawTool = "polygon",
  drawnPoints,
  onMapClick,
  onPointUpdate,
  onSnapClose,
  onPointDelete,
  onStartDraw,
  onShapeComplete,
  drawColor = "#10b981",
  hideHud = false,
}: ParcelleMapProps) {
  const { data: parcellesRaw } = useParcelles();
  const parcelles = (parcellesRaw || []) as Parcelle[];
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const onClickRef = useRef(onParcelleClick);
  onClickRef.current = onParcelleClick;
  const onCreateSubRef = useRef(onCreateSubParcelle);
  onCreateSubRef.current = onCreateSubParcelle;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onPointUpdateRef = useRef(onPointUpdate);
  onPointUpdateRef.current = onPointUpdate;
  const onSnapCloseRef = useRef(onSnapClose);
  onSnapCloseRef.current = onSnapClose;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const drawToolRef = useRef(drawTool);
  drawToolRef.current = drawTool;
  const drawnPointsRef = useRef(drawnPoints);
  drawnPointsRef.current = drawnPoints;
  const onShapeCompleteRef = useRef(onShapeComplete);
  onShapeCompleteRef.current = onShapeComplete;
  const drawColorRef = useRef(drawColor);
  drawColorRef.current = drawColor;
  const onPointDeleteRef = useRef(onPointDelete);
  onPointDeleteRef.current = onPointDelete;

  // Drawing layers
  const drawPolyRef = useRef<L.Polygon | null>(null);
  const drawMarkersRef = useRef<L.Marker[]>([]);
  const guideLineRef = useRef<L.Polyline | null>(null);
  const rectPreviewRef = useRef<L.Rectangle | null>(null);
  const rectStartRef = useRef<L.LatLng | null>(null);

  // Track parcelle layers so we can rebuild them when parcelles change
  const parcelleLayersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstance.current) return;

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

      const hybrid = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      });
      const satellite = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      });

      hybrid.addTo(map);
      L.control.layers({ Hybrid: hybrid, Satellite: satellite }, {}, { position: "bottomright", collapsed: true }).addTo(map);

      // Debounce double-click: track last click time to prevent
      // adding duplicate points when user double-clicks to finish
      let lastClickTime = 0;
      let clickTimeout: ReturnType<typeof setTimeout> | null = null;

      map.on("click", (e: any) => {
        if (!drawModeRef.current) return;
        // Only polygon mode uses click-to-place
        if (drawToolRef.current !== "polygon") return;
        const pts = drawnPointsRef.current || [];
        const now = Date.now();

        // Snap-to-close: if clicking near first point and we have 3+ points
        if (pts.length >= 3) {
          const firstPt = pts[0];
          const clickPx = map.latLngToContainerPoint(e.latlng);
          const firstPx = map.latLngToContainerPoint(L.latLng(firstPt[0], firstPt[1]));
          const dist = clickPx.distanceTo(firstPx);
          if (dist < 20) {
            if (clickTimeout) clearTimeout(clickTimeout);
            onSnapCloseRef.current?.();
            return;
          }
        }

        // Debounce: delay adding point to distinguish single vs double click
        if (clickTimeout) clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
        }, 200);

        lastClickTime = now;
      });

      // Double-click to finish — cancel the pending click
      map.on("dblclick", (e: any) => {
        if (!drawModeRef.current) return;
        if (clickTimeout) clearTimeout(clickTimeout);
        const pts = drawnPointsRef.current || [];
        if (pts.length >= 3) {
          onSnapCloseRef.current?.();
        }
      });

      // ═══ RECTANGLE MODE — click-drag to create a rectangle ═══
      map.on("mousedown", (e: any) => {
        if (!drawModeRef.current || drawToolRef.current !== "rectangle") return;
        L.DomEvent.preventDefault(e.originalEvent);
        map.dragging.disable();
        rectStartRef.current = e.latlng;
      });

      map.on("mousemove", (e: any) => {
        if (!drawModeRef.current || drawToolRef.current !== "rectangle" || !rectStartRef.current) return;
        if (rectPreviewRef.current) {
          map.removeLayer(rectPreviewRef.current);
        }
        rectPreviewRef.current = L.rectangle(
          [rectStartRef.current, e.latlng] as L.LatLngBoundsLiteral,
          {
            color: drawColorRef.current,
            fillColor: drawColorRef.current,
            fillOpacity: 0.2,
            weight: 3,
            dashArray: "6, 6",
          }
        ).addTo(map);
      });

      map.on("mouseup", (e: any) => {
        if (!drawModeRef.current || drawToolRef.current !== "rectangle" || !rectStartRef.current) return;

        const start = rectStartRef.current;
        const end = e.latlng;

        // Clean up preview
        if (rectPreviewRef.current) {
          map.removeLayer(rectPreviewRef.current);
          rectPreviewRef.current = null;
        }
        rectStartRef.current = null;
        map.dragging.enable();

        // Ignore tiny accidental drags
        const dist = map.latLngToContainerPoint(start).distanceTo(map.latLngToContainerPoint(end));
        if (dist < 10) return;

        // Build 4-corner polygon (clockwise from NW)
        const north = Math.max(start.lat, end.lat);
        const south = Math.min(start.lat, end.lat);
        const west = Math.min(start.lng, end.lng);
        const east = Math.max(start.lng, end.lng);

        const corners: [number, number][] = [
          [north, west],
          [north, east],
          [south, east],
          [south, west],
        ];

        onShapeCompleteRef.current?.(corners);
        // Auto-open save form
        setTimeout(() => onSnapCloseRef.current?.(), 50);
      });

      // Guide line: follow mouse from last point (polygon mode only)
      map.on("mousemove", (e: any) => {
        if (!drawModeRef.current || !LRef.current) return;
        if (drawToolRef.current !== "polygon") return;
        const pts = drawnPointsRef.current || [];
        if (pts.length === 0) {
          if (guideLineRef.current) {
            map.removeLayer(guideLineRef.current);
            guideLineRef.current = null;
          }
          return;
        }
        const lastPt = pts[pts.length - 1];
        const coords: L.LatLngExpression[] = [[lastPt[0], lastPt[1]], [e.latlng.lat, e.latlng.lng]];

        // Also draw closing line to first point when 3+ points
        if (pts.length >= 3) {
          coords.push([pts[0][0], pts[0][1]]);
        }

        if (guideLineRef.current) {
          guideLineRef.current.setLatLngs(coords);
        } else {
          guideLineRef.current = LRef.current.polyline(coords, {
            color: drawColor,
            weight: 2,
            dashArray: "6, 8",
            opacity: 0.6,
          }).addTo(map);
        }
      });

      mapInstance.current = map;
      setLoaded(true);
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Render/refresh parcelle polygons whenever the data changes
  useEffect(() => {
    if (!loaded) return;
    const L = LRef.current;
    const map = mapInstance.current;
    if (!L || !map) return;

    parcelleLayersRef.current.forEach((layer) => map.removeLayer(layer));
    parcelleLayersRef.current = [];

    parcelles.forEach((parcelle) => {
      if (!parcelle.boundary || parcelle.boundary.length === 0) return;

      const polygon = L.polygon(parcelle.boundary as L.LatLngExpression[], {
        color: parcelle.color,
        fillColor: parcelle.color,
        fillOpacity: 0.2,
        weight: 2.5,
      }).addTo(map);

      const popupContent = document.createElement("div");
      popupContent.style.fontFamily = "system-ui";
      popupContent.style.padding = "4px";
      popupContent.innerHTML = `
        <strong style="color: ${escapeHtml(String(parcelle.color))}; font-size: 13px;">${escapeHtml(String(parcelle.name))}</strong>
        <div style="margin-top: 6px; font-size: 11px; color: rgba(255,255,255,0.6);">
          ${escapeHtml(String(parcelle.areaHectares))} ha · ${escapeHtml(String(parcelle.cropType))}
        </div>
        <div style="margin-top: 2px; font-size: 10px; color: rgba(255,255,255,0.4);">
          ${escapeHtml(String(parcelle.treatmentCount))} traitements · ${escapeHtml(String(parcelle.soilType))}
        </div>
      `;
      const subBtn = document.createElement("button");
      subBtn.textContent = "+ Créer sous-parcelle";
      subBtn.style.cssText = "margin-top:8px;width:100%;padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.4);background:rgba(16,185,129,0.15);color:#34d399;font-size:11px;font-weight:600;cursor:pointer;font-family:system-ui;";
      subBtn.onmouseover = () => { subBtn.style.background = "rgba(16,185,129,0.3)"; };
      subBtn.onmouseout = () => { subBtn.style.background = "rgba(16,185,129,0.15)"; };
      subBtn.onclick = (e) => {
        e.stopPropagation();
        map.closePopup();
        onCreateSubRef.current?.(parcelle.id);
      };
      popupContent.appendChild(subBtn);
      polygon.bindPopup(popupContent);
      polygon.on("click", () => onClickRef.current?.(parcelle.id));
      parcelleLayersRef.current.push(polygon);

      parcelle.children?.forEach((child) => {
        if (!child.boundary || child.boundary.length === 0) return;
        const childPoly = L.polygon(child.boundary as L.LatLngExpression[], {
          color: child.color,
          fillColor: child.color,
          fillOpacity: 0.3,
          weight: 2.5,
          dashArray: "6, 4",
          className: "leaflet-interactive-child",
        }).addTo(map);
        childPoly.setStyle({ className: "leaflet-interactive-child" });
        childPoly.bindPopup(`
          <div style="font-family: system-ui; padding: 4px;">
            <strong style="color: ${escapeHtml(String(child.color))}; font-size: 12px;">${escapeHtml(String(child.name))}</strong>
            <div style="margin-top: 4px; font-size: 10px; color: rgba(255,255,255,0.5);">
              ${escapeHtml(String(child.areaHectares))} ha · ${escapeHtml(String(child.cropType))}
            </div>
          </div>
        `);
        childPoly.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e);
          onClickRef.current?.(child.id);
        });
        // Bring child above parent for click priority
        childPoly.bringToFront();
        parcelleLayersRef.current.push(childPoly);
      });

      const labelIcon = L.divIcon({
        className: "",
        html: `<div style="
          white-space: nowrap; font-family: system-ui; font-size: 11px; font-weight: 600;
          color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5);
          pointer-events: none;
        ">${escapeHtml(String(parcelle.name))}</div>`,
        iconAnchor: [30, 8],
      });
      const label = L.marker(parcelle.center as L.LatLngExpression, { icon: labelIcon, interactive: false }).addTo(map);
      parcelleLayersRef.current.push(label);
    });
  }, [parcelles, loaded]);

  // Update cursor for draw mode
  useEffect(() => {
    const container = mapRef.current;
    if (container) {
      if (!drawMode) {
        container.style.cursor = "";
      } else if (drawTool === "rectangle") {
        container.style.cursor = "nwse-resize";
      } else if (drawTool === "gps") {
        container.style.cursor = "default";
      } else {
        container.style.cursor = "crosshair";
      }
    }
    // Clear guide line when exiting draw mode or switching tool
    if ((!drawMode || drawTool !== "polygon") && guideLineRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(guideLineRef.current);
      guideLineRef.current = null;
    }
  }, [drawMode, drawTool]);

  // Invalidate map size when expanded changes
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.invalidateSize(), 350);
    }
  }, [expanded]);

  // Auto-expand map in draw mode
  useEffect(() => {
    if (drawMode) setExpanded(true);
  }, [drawMode]);

  // Update drawn polygon and markers
  useEffect(() => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Clear old drawing
    if (drawPolyRef.current) {
      map.removeLayer(drawPolyRef.current);
      drawPolyRef.current = null;
    }
    drawMarkersRef.current.forEach((m: L.Marker) => map.removeLayer(m));
    drawMarkersRef.current = [];

    if (!drawnPoints || drawnPoints.length === 0) return;

    // Draw polygon
    if (drawnPoints.length >= 2) {
      drawPolyRef.current = L.polygon(drawnPoints as L.LatLngExpression[], {
        color: drawColor,
        fillColor: drawColor,
        fillOpacity: 0.15,
        weight: 3,
        dashArray: drawnPoints.length < 3 ? "8, 8" : undefined,
      }).addTo(map);
    }

    // Draw vertex markers — draggable, deletable, with snap-close pulse
    drawnPoints.forEach((p: [number, number], i: number) => {
      const isFirst = i === 0;
      const canClose = isFirst && drawnPoints.length >= 3;
      const size = isFirst ? 24 : 20;

      const pulseRing = canClose
        ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${drawColor};opacity:0.6;animation:pulse 1.5s ease-in-out infinite;pointer-events:none;"></div>`
        : "";
      const closeLabel = canClose
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(0,0,0,0.85);color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;font-family:system-ui;pointer-events:none;">Fermer</div>`
        : "";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          position:relative;width:${size}px;height:${size}px;
          border-radius:50%;background:${isFirst ? "#fff" : drawColor};
          border:${isFirst ? `3px solid ${drawColor}` : "2px solid white"};
          box-shadow:0 0 ${isFirst ? 16 : 8}px ${drawColor}${isFirst ? "" : "80"};
          cursor:${canClose ? "pointer" : "grab"};
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:${isFirst ? drawColor : "#fff"};
          font-family:system-ui;
        ">${i + 1}${pulseRing}${closeLabel}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([p[0], p[1]], {
        icon,
        draggable: true,
        interactive: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onPointUpdateRef.current?.(i, pos.lat, pos.lng);
      });

      // Click first marker to snap-close
      if (canClose) {
        marker.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e);
          onSnapCloseRef.current?.();
        });
      }

      // Right-click (contextmenu) to delete individual vertex
      marker.on("contextmenu", (e: any) => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        onPointDeleteRef.current?.(i);
      });

      drawMarkersRef.current.push(marker);
    });

    // Auto zoom-to-fit as polygon grows (with padding)
    if (drawnPoints.length >= 2) {
      const bounds = L.latLngBounds(drawnPoints as L.LatLngExpression[]);
      if (!map.getBounds().contains(bounds)) {
        map.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.3 });
      }
    }
  }, [drawnPoints, drawColor]);

  // Compute live area for display
  const liveArea =
    drawnPoints && drawnPoints.length >= 3
      ? computeDrawArea(drawnPoints)
      : 0;

  return (
    <div className="glass-card overflow-hidden relative">
      <div className="flex items-center justify-between p-4 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-white/85">Carte des Parcelles</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {parcelles.length} parcelles · Tlemcen
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!drawMode && onStartDraw && (
            <button
              onClick={onStartDraw}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-medium"
              title="Dessiner une parcelle"
            >
              <Pencil className="w-3.5 h-3.5" />
              Dessiner
            </button>
          )}
          <button
            onClick={() => {
              const map = mapInstance.current;
              if (map && parcelles.length > 0) {
                const L = LRef.current;
                if (L) {
                  const allBounds = parcelles
                    .filter(p => p.boundary && p.boundary.length > 0)
                    .flatMap(p => p.boundary as [number, number][]);
                  if (allBounds.length > 0) {
                    map.fitBounds(L.latLngBounds(allBounds as L.LatLngExpression[]).pad(0.1));
                  }
                }
              }
            }}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60"
            title="Recentrer sur les parcelles"
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60"
            title={expanded ? "Réduire la carte" : "Agrandir la carte"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a2e1a]/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-xs text-white/30">Chargement de la carte...</span>
          </div>
        </div>
      )}

      {/* Draw mode HUD — on-map floating toolbar */}
      {drawMode && loaded && !hideHud && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-black/80 backdrop-blur-xl rounded-2xl px-5 py-2.5 border border-amber-500/30 shadow-lg shadow-black/30">
          <MousePointer2 className="w-4 h-4 text-amber-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs text-amber-300 font-semibold">
              {drawTool === "rectangle"
                ? "Cliquez-glissez pour dessiner un rectangle"
                : drawTool === "gps"
                  ? `Marchez votre parcelle, tapez « Ajouter ma position » à chaque coin (${drawnPoints?.length || 0} pts)`
                  : !drawnPoints || drawnPoints.length === 0
                    ? "Cliquez pour placer le premier sommet"
                    : drawnPoints.length < 3
                      ? `${drawnPoints.length}/3 points — continuez à cliquer`
                      : "Double-clic ou cliquez le 1er point pour fermer"}
            </span>
            {liveArea > 0 && (
              <span className="text-[10px] text-white/50 font-mono mt-0.5">
                Surface: {liveArea.toFixed(2)} ha · {drawnPoints?.length} sommets
              </span>
            )}
          </div>
          {drawnPoints && drawnPoints.length >= 3 && (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" title="Prêt à fermer" />
          )}
        </div>
      )}

      {/* Custom map controls — zoom, hand, locate */}
      {loaded && (
        <div className="absolute top-14 right-3 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={() => mapInstance.current?.zoomIn()}
            className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all shadow-lg"
            title="Zoom avant"
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => mapInstance.current?.zoomOut()}
            className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all shadow-lg"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <div className="h-px bg-white/10 mx-1" />
          <button
            onClick={() => {
              const map = mapInstance.current;
              if (!map) return;
              map.dragging.enable();
              map.scrollWheelZoom.enable();
            }}
            className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all shadow-lg"
            title="Mode déplacement"
          >
            <Hand className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => {
              const map = mapInstance.current;
              const L = LRef.current;
              if (!map || !L || parcelles.length === 0) return;
              const allBounds = parcelles
                .filter(p => p.boundary && p.boundary.length > 0)
                .flatMap(p => p.boundary as [number, number][]);
              if (allBounds.length > 0) {
                map.fitBounds(L.latLngBounds(allBounds as L.LatLngExpression[]).pad(0.1));
              }
            }}
            className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all shadow-lg"
            title="Recentrer sur les parcelles"
          >
            <LocateFixed className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

      <div
        ref={mapRef}
        className="mt-3 rounded-b-2xl transition-all duration-300"
        style={{ height: expanded ? 700 : 500 }}
      />

      {/* Legend */}
      {parcelles.length > 0 && !drawMode && (
        <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 p-3 rounded-xl bg-[#1a2e1a]/85 backdrop-blur-xl border border-white/[0.12] max-w-[180px]">
          {parcelles.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: p.color + "30", border: `1.5px solid ${p.color}` }} />
              <span className="text-[10px] text-white/50 truncate">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Draw mode shortcut legend */}
      {drawMode && loaded && !hideHud && (
        <div className="absolute bottom-4 left-4 z-[1000] p-3 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 text-[10px] text-white/40 space-y-1">
          <div><kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">clic</kbd> Placer un sommet</div>
          <div><kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">double-clic</kbd> Terminer</div>
          <div><kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 font-mono">glisser</kbd> Déplacer un sommet</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-current" /> Clic sur 1er point = fermer
          </div>
        </div>
      )}
    </div>
  );
}

function computeDrawArea(points: [number, number][]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;
  const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const areaM2 = area * mPerDegLat * mPerDegLon;
  return areaM2 / 10000;
}
