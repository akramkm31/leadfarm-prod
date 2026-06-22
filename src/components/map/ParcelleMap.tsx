"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Parcelle } from "@/lib/mock-data";
import type { Trajectory } from "@/lib/trajectory-utils";
import { cn } from "@/lib/utils";
import { Maximize2, Layers, Target, MousePointer2, Pencil, ZoomIn, ZoomOut, Hand, LocateFixed } from "lucide-react";
import {
  attachParcelleMapLabel,
  parcelleLabelHtml,
  parcelleLabelIconAnchor,
  parcelleLabelIconSize,
} from "@/lib/map-labels";

export type DrawTool = "polygon" | "rectangle" | "gps";

interface ParcelleMapProps {
  parcelles: Parcelle[];
  onParcelleClick?: (id: string) => void;
  onChildParcelleClick?: (childId: string, parentId: string) => void;
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
  constrainBoundary?: [number, number][];
  /** Trajectory to overlay on the map (treatment GPS trace) */
  trajectory?: Trajectory | null;
  /** Current simulation position (animated tractor marker) */
  simulationPosition?: { lat: number; lon: number; speed: number } | null;
  /** ID of the parcelle to visually highlight */
  highlightParcelleId?: string | null;
  /** Aperçu du nom pendant le dessin (formulaire) */
  previewLabel?: string;
  // NEW PROPS FOR GIS THEATER EXPLORATION
  isTheaterMode?: boolean;
  onTheaterToggle?: () => void;
  onViewportBoundsChange?: (bounds: any) => void;
  geoPins?: any[];
  focusCoordinates?: [number, number] | null;
  /** When a detail drawer opens beside the map, refit size and nudge the view. */
  detailPanelOpen?: boolean;
  detailPanelWidth?: number;
}

export default function ParcelleMap({
  parcelles,
  onParcelleClick,
  onChildParcelleClick,
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
  constrainBoundary,
  trajectory,
  simulationPosition,
  highlightParcelleId,
  previewLabel,
  // NEW PROPS
  isTheaterMode = false,
  onTheaterToggle,
  onViewportBoundsChange,
  geoPins = [],
  focusCoordinates = null,
  detailPanelOpen = false,
  detailPanelWidth = 400,
}: ParcelleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const onClickRef = useRef(onParcelleClick);
  onClickRef.current = onParcelleClick;
  const onChildClickRef = useRef(onChildParcelleClick);
  onChildClickRef.current = onChildParcelleClick;
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

  const onTheaterToggleRef = useRef(onTheaterToggle);
  onTheaterToggleRef.current = onTheaterToggle;
  const onViewportBoundsChangeRef = useRef(onViewportBoundsChange);
  onViewportBoundsChangeRef.current = onViewportBoundsChange;

  const constrainRef = useRef<L.Polygon | null>(null);

  // Drawing layers
  const drawPolyRef = useRef<L.Polygon | null>(null);
  const drawMarkersRef = useRef<L.Marker[]>([]);
  const drawLabelRef = useRef<L.Marker | null>(null);
  const guideLineRef = useRef<L.Polyline | null>(null);
  const rectPreviewRef = useRef<L.Rectangle | null>(null);
  const rectStartRef = useRef<L.LatLng | null>(null);

  // Track parcelle layers so we can rebuild them when parcelles change
  const parcelleLayersRef = useRef<L.Layer[]>([]);

  // Trajectory overlay layers
  const trajectoryLayersRef = useRef<L.Layer[]>([]);
  const simMarkerRef = useRef<L.Marker | null>(null);
  const highlightLayerRef = useRef<L.Layer | null>(null);
  const selectedPopupRef = useRef<L.Popup | null>(null);

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

      map.on("click", (e: any) => {
        map.invalidateSize({ animate: false, pan: false });
        const latlng = e.originalEvent
          ? map.containerPointToLatLng(map.mouseEventToContainerPoint(e.originalEvent))
          : e.latlng;

        if (!drawModeRef.current) {
          onMapClickRef.current?.(latlng.lat, latlng.lng);
          return;
        }
        if (drawToolRef.current !== "polygon") return;
        const pts = drawnPointsRef.current || [];

        if (pts.length >= 3) {
          const firstPt = pts[0];
          const clickPx = map.latLngToContainerPoint(latlng);
          const firstPx = map.latLngToContainerPoint(L.latLng(firstPt[0], firstPt[1]));
          if (clickPx.distanceTo(firstPx) < 20) {
            onSnapCloseRef.current?.();
            return;
          }
        }

        onMapClickRef.current?.(latlng.lat, latlng.lng);
      });

      map.on("dblclick", (e: any) => {
        L.DomEvent.stopPropagation(e);
        if (!drawModeRef.current) return;
        const pts = drawnPointsRef.current || [];
        if (drawToolRef.current === "polygon" && pts.length >= 3) {
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

      map.on("moveend", () => {
        onViewportBoundsChangeRef.current?.(map.getBounds());
      });
      map.on("zoomend", () => {
        onViewportBoundsChangeRef.current?.(map.getBounds());
      });

      // Trigger bounds computation on initial map load pad
      setTimeout(() => {
        if (onViewportBoundsChangeRef.current) {
          onViewportBoundsChangeRef.current(map.getBounds());
        }
      }, 600);

      mapInstance.current = map;
      setLoaded(true);
      const fitMap = () => map.invalidateSize({ animate: false, pan: false });
      requestAnimationFrame(fitMap);
      window.setTimeout(fitMap, 120);
      window.setTimeout(fitMap, 400);
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

      polygon.on("click", (e: any) => {
        L.DomEvent.stopPropagation(e);
        onClickRef.current?.(parcelle.id);
      });
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
        childPoly.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e);
          if (onChildClickRef.current) {
            onChildClickRef.current(child.id, parcelle.id);
          } else {
            onClickRef.current?.(child.id);
          }
        });
        childPoly.on("mouseover", () => {
          childPoly.setStyle({ fillOpacity: 0.5, weight: 3.5 });
        });
        childPoly.on("mouseout", () => {
          childPoly.setStyle({ fillOpacity: 0.3, weight: 2.5 });
        });
        childPoly.bringToFront();
        parcelleLayersRef.current.push(childPoly);
        attachParcelleMapLabel(childPoly, child, true);
      });

      attachParcelleMapLabel(polygon, parcelle, false);
    });
  }, [parcelles, loaded]);

  // Highlight parent boundary when drawing sous-parcelle
  useEffect(() => {
    const map = mapInstance.current;
    const L = LRef.current;
    if (!map || !L) return;

    // Remove previous constraint
    if (constrainRef.current) {
      map.removeLayer(constrainRef.current);
      constrainRef.current = null;
    }

    if (drawMode && constrainBoundary && constrainBoundary.length >= 3) {
      constrainRef.current = L.polygon(constrainBoundary as L.LatLngExpression[], {
        color: "#fbbf24",
        fillColor: "#fbbf24",
        fillOpacity: 0.08,
        weight: 3,
        dashArray: "8, 6",
        interactive: false,
      }).addTo(map);

      // Zoom to parent boundary
      map.fitBounds(constrainRef.current!.getBounds().pad(0.05), { animate: true, duration: 0.3 });
    }
  }, [drawMode, constrainBoundary]);

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

  // Keep Leaflet click coords aligned when layout/size changes (draw mode, expand, drawer)
  useEffect(() => {
    if (!mapInstance.current || !mapRef.current) return;
    const map = mapInstance.current;
    const syncSize = () => map.invalidateSize({ animate: false, pan: false });
    syncSize();
    const t1 = window.setTimeout(syncSize, 80);
    const t2 = window.setTimeout(syncSize, 400);
    const ro = new ResizeObserver(syncSize);
    ro.observe(mapRef.current);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
    };
  }, [expanded, drawMode, loaded]);

  // Polygon/rectangle draw: lock pan so clicks place vertices (hand tool re-enables drag)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !loaded) return;
    if (drawMode && drawTool !== "gps") {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
  }, [drawMode, drawTool, loaded]);

  // Scroll du contenu page → resync coords Leaflet
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const scrollParent = mapRef.current.closest(".lf-content");
    if (!scrollParent) return;
    const onScroll = () => {
      mapInstance.current?.invalidateSize({ animate: false, pan: false });
    };
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, [loaded]);

  const detailPanelOpenRef = useRef(detailPanelOpen);
  useEffect(() => {
    if (!mapInstance.current || !loaded) return;
    const wasOpen = detailPanelOpenRef.current;
    detailPanelOpenRef.current = detailPanelOpen;
    const timer = window.setTimeout(() => {
      const map = mapInstance.current;
      if (!map) return;
      map.invalidateSize();
      if (detailPanelOpen && !wasOpen) {
        map.panBy([-Math.round(detailPanelWidth * 0.22), 0], {
          animate: true,
          duration: 0.38,
        });
      }
    }, 380);
    return () => window.clearTimeout(timer);
  }, [detailPanelOpen, detailPanelWidth, loaded]);

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
    if (drawLabelRef.current) {
      map.removeLayer(drawLabelRef.current);
      drawLabelRef.current = null;
    }

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

    // Aperçu du nom sur le polygone en cours
    if (previewLabel && drawnPoints.length >= 3) {
      const lat =
        drawnPoints.reduce((s, p) => s + p[0], 0) / drawnPoints.length;
      const lng =
        drawnPoints.reduce((s, p) => s + p[1], 0) / drawnPoints.length;
      const labelIcon = L.divIcon({
        className: "parc-map-label-wrap",
        html: parcelleLabelHtml(previewLabel, drawColor),
        iconAnchor: parcelleLabelIconAnchor(),
        iconSize: parcelleLabelIconSize(),
      });
      drawLabelRef.current = L.marker([lat, lng], {
        icon: labelIcon,
        interactive: false,
      }).addTo(map);
    }
  }, [drawnPoints, drawColor, previewLabel]);

  // ═══ TRAJECTORY OVERLAY ═══
  useEffect(() => {
    if (!loaded || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Clear previous trajectory layers
    trajectoryLayersRef.current.forEach((layer) => map.removeLayer(layer));
    trajectoryLayersRef.current = [];

    if (!trajectory?.segments?.length) return;

    // Draw colored polyline segments
    trajectory.segments.forEach((seg) => {
      const line = L.polyline(seg.points as L.LatLngExpression[], {
        color: seg.color,
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      trajectoryLayersRef.current.push(line);
    });

    // Start marker (green pulsing dot)
    if (trajectory.start) {
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="
          position:relative;width:18px;height:18px;border-radius:50%;
          background:#22c55e;border:3px solid #fff;
          box-shadow:0 0 12px rgba(34,197,94,0.7);
        "><div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid #22c55e;opacity:0.5;animation:pulse 2s ease-in-out infinite;"></div></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const startMarker = L.marker(trajectory.start as L.LatLngExpression, { icon: startIcon, interactive: false }).addTo(map);
      trajectoryLayersRef.current.push(startMarker);
    }

    // End marker (red flag dot)
    if (trajectory.end) {
      const endIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#ef4444;border:3px solid #fff;
          box-shadow:0 0 10px rgba(239,68,68,0.6);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const endMarker = L.marker(trajectory.end as L.LatLngExpression, { icon: endIcon, interactive: false }).addTo(map);
      trajectoryLayersRef.current.push(endMarker);
    }

    // Fit map to trajectory bounds
    const allPoints = trajectory.segments.flatMap((s) => s.points);
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints as L.LatLngExpression[]);
      map.fitBounds(bounds.pad(0.15), { animate: true, duration: 0.5 });
    }
  }, [trajectory, loaded]);

  // ═══ SIMULATION TRACTOR MARKER ═══
  useEffect(() => {
    if (!loaded || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    if (!simulationPosition) {
      // Remove sim marker
      if (simMarkerRef.current) {
        map.removeLayer(simMarkerRef.current);
        simMarkerRef.current = null;
      }
      return;
    }

    const tractorIcon = L.divIcon({
      className: "",
      html: `<div style="
        position:relative;width:28px;height:28px;border-radius:50%;
        background:linear-gradient(135deg,#f59e0b,#d97706);
        border:3px solid #fff;
        box-shadow:0 0 18px rgba(245,158,11,0.6),0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
      ">🚜<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #f59e0b;opacity:0.4;animation:pulse 1.5s ease-in-out infinite;"></div></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (!simMarkerRef.current) {
      simMarkerRef.current = L.marker(
        [simulationPosition.lat, simulationPosition.lon],
        { icon: tractorIcon, zIndexOffset: 9999 }
      ).addTo(map);
    } else {
      simMarkerRef.current.setLatLng([simulationPosition.lat, simulationPosition.lon]);
      simMarkerRef.current.setIcon(tractorIcon);
    }

    // Panning optimization: only center/pan the map when the tractor marker
    // approaches the edge of the visible viewport, or is completely outside it.
    // This avoids high-frequency panTo calls (e.g. every 20ms) which lag the browser.
    const latlng = L.latLng(simulationPosition.lat, simulationPosition.lon);
    if (!map.getBounds().contains(latlng)) {
      // Tractor completely out of view, center instantly
      map.setView(latlng, map.getZoom(), { animate: false });
    } else {
      // Pan smoothly only when nearing the padded edge
      const safeBounds = map.getBounds().pad(-0.08);
      if (!safeBounds.contains(latlng)) {
        map.panTo(latlng, { animate: true, duration: 0.25 });
      }
    }
  }, [simulationPosition, loaded]);

  // ═══ HIGHLIGHT PARCELLE & OPEN POPUP ═══
  useEffect(() => {
    if (!loaded || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Remove previous highlight
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    // Clean up previous popup
    if (selectedPopupRef.current) {
      map.closePopup(selectedPopupRef.current);
      selectedPopupRef.current = null;
    }

    if (!highlightParcelleId) return;

    // Find parcelle by id (including children)
    const allParcelles = parcelles.flatMap((p) => [p, ...(p.children || [])]);
    const target = allParcelles.find((p) => p.id === highlightParcelleId);
    if (!target) return;

    if (target.boundary && target.boundary.length > 0) {
      highlightLayerRef.current = L.polygon(target.boundary as L.LatLngExpression[], {
        color: "#f59e0b",
        fillColor: "#f59e0b",
        fillOpacity: 0.15,
        weight: 4,
        dashArray: "8, 5",
        interactive: false,
      }).addTo(map);
    }

    // Open detailed selection popup
    if (target.center) {
      const typeLabel = target.cultureType ? (target.cultureType.charAt(0).toUpperCase() + target.cultureType.slice(1)) : "—";
      const cropLabel = target.cropType || "—";
      const areaLabel = target.areaHectares ? `${target.areaHectares.toFixed(2)} ha` : "—";
      
      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif;width:240px;padding:4px;line-height:1.4;color:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:6px;margin-bottom:8px;">
            <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.65);">
              Détails Sélection
            </span>
            <span style="font-size:8px;font-weight:800;text-transform:uppercase;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#fff;border:1px solid rgba(255,255,255,0.2);">
              Actif
            </span>
          </div>

          <div style="font-size:12.5px;font-weight:700;color:${target.color || "#22c55e"};margin-bottom:6px;">
            ${target.name}
          </div>

          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:10.5px;margin-bottom:8px;color:#e4e4e7;">
            <strong style="color:rgba(255,255,255,0.55);">Culture:</strong>
            <span>${cropLabel} (${typeLabel})</span>
            <strong style="color:rgba(255,255,255,0.55);">Surface:</strong>
            <span style="font-family:monospace;font-weight:600;">${areaLabel}</span>
            <strong style="color:rgba(255,255,255,0.55);">Irrigation:</strong>
            <span>${target.irrigation || "—"}</span>
          </div>

          <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.15);display:flex;justify-content:space-between;align-items:center;">
            <a href="/trace/${encodeURIComponent(target.id)}" style="font-size:10px;font-weight:700;color:${target.color || "#22c55e"};text-decoration:none;display:inline-flex;align-items:center;gap:2px;">
              <span>Traçabilité</span>
              <span>→</span>
            </a>
          </div>
        </div>
      `;
      
      const popupClass = isTheaterMode ? "dark-spatial-popup" : "premium-treatment-popup";
      const popup = L.popup({ maxWidth: 280, className: popupClass, closeButton: false, autoPan: false })
        .setLatLng(target.center as L.LatLngExpression)
        .setContent(popupHtml)
        .openOn(map);
        
      selectedPopupRef.current = popup;
    }
  }, [highlightParcelleId, parcelles, loaded, isTheaterMode]);

  // Render custom geoPins markers on the map
  const geoPinLayersRef = useRef<L.Layer[]>([]);
  useEffect(() => {
    if (!loaded || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Clear previous geo pin layers
    geoPinLayersRef.current.forEach((layer) => map.removeLayer(layer));
    geoPinLayersRef.current = [];

    if (!geoPins || geoPins.length === 0) return;

    geoPins.forEach((pin) => {
      const pinColors = {
        pest: "#f59e0b",
        irrigation: "#06b6d4",
        weed: "#10b981",
        other: "#8b5cf6",
      };
      const pinIcons = {
        pest: "🐛",
        irrigation: "💧",
        weed: "🌾",
        other: "📌",
      };
      const color = pinColors[pin.type as "pest" | "irrigation" | "weed" | "other"] || "#8b5cf6";
      const emoji = pinIcons[pin.type as "pest" | "irrigation" | "weed" | "other"] || "📌";

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="
          position:relative;width:26px;height:26px;border-radius:50%;
          background:${color};border:2.5px solid #fff;
          box-shadow:0 0 12px ${color}80, 0 3px 6px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;cursor:pointer;
        ">${emoji}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon }).addTo(map);

      const typeLabels = {
        pest: "Alerte Ravageur / Peste",
        irrigation: "Problème d'Irrigation",
        weed: "Présence de Mauvaises Herbes",
        other: "Note d'Observation",
      };

      const popupHtml = `
        <div style="padding:6px;min-width:160px;font-family:system-ui;color:#fff;">
          <h4 style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;">${typeLabels[pin.type as "pest" | "irrigation" | "weed" | "other"]}</h4>
          <p style="margin:0 0 6px 0;font-size:11px;line-height:1.4;color:#e4e4e7;">${pin.note}</p>
          <span style="font-size:9px;color:#a1a1aa;">Signalé le ${new Date(pin.createdAt).toLocaleDateString("fr-FR")}</span>
        </div>
      `;
      marker.bindPopup(popupHtml, {
        className: "lf-custom-popup",
        closeButton: false,
      });

      geoPinLayersRef.current.push(marker);
    });
  }, [geoPins, loaded]);

  // Zoom to / center on custom focusCoordinates
  useEffect(() => {
    if (!loaded || !mapInstance.current || !focusCoordinates) return;
    mapInstance.current.setView(focusCoordinates as L.LatLngExpression, 17, { animate: true, duration: 0.65 });
  }, [focusCoordinates, loaded]);

  // Compute live area for display
  const liveArea =
    drawnPoints && drawnPoints.length >= 3
      ? computeDrawArea(drawnPoints)
      : 0;

  return (
    <div className="glass-card lf-map-card overflow-hidden relative flex flex-col flex-1 min-h-0 h-full">
      <div className="flex items-center justify-between p-4 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Carte des Parcelles</h3>
          <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">
            {parcelles.length} parcelles · Tlemcen
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!drawMode && onStartDraw && (
            <button
              onClick={onStartDraw}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/25 transition-all text-xs font-medium"
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
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-[var(--color-adaline-ink)]/30 hover:text-[var(--color-adaline-ink)]/60"
            title="Recentrer sur les parcelles"
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-[var(--color-adaline-ink)]/30 hover:text-[var(--color-adaline-ink)]/60"
            title={expanded ? "Réduire la carte" : "Agrandir la carte"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {onTheaterToggle && (
            <button
              onClick={onTheaterToggle}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-emerald-500 hover:text-emerald-700"
              title="Mode Exploration Immersive (Plein Écran / Double-Clic)"
            >
              <Maximize2 className="w-4 h-4 animate-pulse" />
            </button>
          )}
        </div>
      </div>

      <div className={cn("lf-map-stage", expanded && "lf-map-stage--expanded")}>
        <div ref={mapRef} className="lf-map-stage-inner" />

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f8ec]/90 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-valley-green)]/30 border-t-[var(--color-valley-green)] rounded-full animate-spin" />
              <span className="text-xs text-[var(--color-adaline-ink)]/50">Chargement de la carte...</span>
            </div>
          </div>
        )}

        {drawMode && loaded && !hideHud && (
          <div className="lf-map-hud absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 rounded-2xl px-5 py-2.5">
            <MousePointer2 className="w-4 h-4 text-[var(--color-valley-green)] shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs text-[var(--color-adaline-ink)] font-semibold">
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
              <span className="text-[10px] text-[var(--color-adaline-ink)]/55 font-mono mt-0.5">
                Surface: {liveArea.toFixed(2)} ha · {drawnPoints?.length} sommets
              </span>
            )}
          </div>
          {drawnPoints && drawnPoints.length >= 3 && (
            <div className="w-2 h-2 rounded-full bg-[var(--color-valley-green)] animate-pulse ml-1" title="Prêt à fermer" />
          )}
        </div>
      )}

      {loaded && (
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={() => mapInstance.current?.zoomIn()}
            className="lf-map-control-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            title="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstance.current?.zoomOut()}
            className="lf-map-control-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-[var(--color-stone-moss)] mx-1" />
          <button
            onClick={() => {
              const map = mapInstance.current;
              if (!map) return;
              map.dragging.enable();
              map.scrollWheelZoom.enable();
            }}
            className="lf-map-control-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            title="Mode déplacement"
          >
            <Hand className="w-4 h-4" />
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
            className="lf-map-control-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            title="Recentrer sur les parcelles"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Legend */}
      {parcelles.length > 0 && !drawMode && (
        <div className="lf-map-hud absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 p-3 rounded-xl max-w-[180px]">
          {parcelles.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: p.color + "30", border: `1.5px solid ${p.color}` }} />
              <span className="text-[10px] text-[var(--color-adaline-ink)]/75 truncate">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Draw mode shortcut legend */}
      {drawMode && loaded && !hideHud && (
        <div className="lf-map-hud absolute bottom-4 left-4 z-[1000] p-3 rounded-xl text-[10px] text-[var(--color-adaline-ink)]/70 space-y-1">
          <div><kbd className="lf-map-kbd">clic</kbd> Placer un sommet</div>
          <div><kbd className="lf-map-kbd">double-clic</kbd> Terminer</div>
          <div><kbd className="lf-map-kbd">glisser</kbd> Déplacer un sommet</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-[var(--color-valley-green)]" /> Clic sur ① = fermer
          </div>
        </div>
      )}
      </div>
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
