"use client";

import { useEffect, useRef, useState } from "react";

type GpsPoint = {
  lat: number;
  lon: number;
  flow1: number;
  flow2: number;
  speed: number;
  timestamp: string;
};

type TrajectorySegment = {
  points: [number, number][];
  speed: number;
  color: string;
};

type Trajectory = {
  segments: TrajectorySegment[];
  start?: [number, number] | null;
  end?: [number, number] | null;
  startTime?: string;
  endTime?: string;
};

type ParcelleOverlay = {
  id: string;
  name: string;
  boundary: [number, number][];
  color: string;
  cropType: string;
  areaHectares: number;
  children?: ParcelleOverlay[];
};

export default function TractorLiveMap({
  points,
  parcelles,
  trajectory,
  simPosition,
  simTrail,
  className,
}: {
  points: GpsPoint[];
  parcelles?: ParcelleOverlay[];
  trajectory?: Trajectory;
  simPosition?: { lat: number; lon: number; speed: number } | null;
  simTrail?: [number, number][];
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const parcelleLayerRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerRef = useRef<L.LayerGroup | null>(null);
  const simTrailRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstance.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      LRef.current = L;

      const defaultCenter: [number, number] = [34.9870, -0.5361];
      const map = L.map(container, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      const satellite = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      });
      const hybrid = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      });
      const openTopo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
      });

      hybrid.addTo(map);

      parcelleLayerRef.current = L.layerGroup().addTo(map);
      trajectoryLayerRef.current = L.layerGroup().addTo(map);

      L.control.layers(
        { "Satellite": satellite, "Hybrid": hybrid, "Topographique": openTopo },
        { "Parcelles": parcelleLayerRef.current, "Trajet KMZ": trajectoryLayerRef.current },
        { position: "bottomright", collapsed: true }
      ).addTo(map);

      const tractorIcon = L.divIcon({
        className: "",
        html: `<div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(232,168,56,0.9); border: 3px solid white;
          box-shadow: 0 0 16px rgba(232,168,56,0.6), 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      markerRef.current = L.marker(defaultCenter, { icon: tractorIcon }).addTo(map);
      mapInstance.current = map;
      setMapReady(true);
    };

    initMap();
    return () => { cancelled = true; };
  }, []);

  // Draw parcelle boundaries
  useEffect(() => {
    if (!parcelleLayerRef.current || !LRef.current || !parcelles?.length) return;
    const L = LRef.current;
    const layer = parcelleLayerRef.current;
    layer.clearLayers();

    const drawParcelle = (p: ParcelleOverlay, isChild = false) => {
      if (!p.boundary || p.boundary.length === 0) return;

      const polygon = L.polygon(p.boundary as L.LatLngExpression[], {
        color: p.color,
        fillColor: p.color,
        fillOpacity: isChild ? 0.15 : 0.1,
        weight: isChild ? 1.5 : 2.5,
        dashArray: isChild ? "5, 5" : undefined,
      });

      polygon.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <strong style="color: ${p.color}; font-size: 13px;">${p.name}</strong>
          <div style="margin-top: 6px; font-size: 11px; color: #aaa;">
            ${p.areaHectares} ha · ${p.cropType}
          </div>
        </div>
      `);

      layer.addLayer(polygon);

      if (!isChild) {
        const center = polygon.getBounds().getCenter();
        const labelIcon = L.divIcon({
          className: "",
          html: `<div style="
            white-space: nowrap; font-family: system-ui; font-size: 11px; font-weight: 600;
            color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.6);
            pointer-events: none; padding: 2px 6px; border-radius: 4px;
            background: ${p.color}33;
          ">${p.name.split(" — ")[1] || p.name}</div>`,
          iconAnchor: [30, 8],
        });
        layer.addLayer(L.marker(center, { icon: labelIcon, interactive: false }));
      }
    };

    parcelles.forEach((p) => {
      drawParcelle(p);
      p.children?.forEach((child) => drawParcelle(child, true));
    });
  }, [parcelles]);

  // Draw KMZ trajectory (speed-colored segments)
  useEffect(() => {
    if (!mapReady || !trajectoryLayerRef.current || !LRef.current || !trajectory?.segments?.length) return;
    const L = LRef.current;
    const layer = trajectoryLayerRef.current;
    layer.clearLayers();

    const speedLabels: Record<number, string> = { 2: "Lent", 5: "Moyen", 8: "Normal", 12: "Rapide", 18: "Très rapide" };

    // Draw each colored segment — vivid speed colors (slow→green ... vfast→red)
    trajectory.segments.forEach((seg) => {
      if (seg.points.length < 2) return;
      // White outline halo for contrast
      layer.addLayer(L.polyline(seg.points as L.LatLngExpression[], {
        color: "#ffffff", weight: 7, opacity: 0.4, lineCap: "round", lineJoin: "round",
      }));
      const line = L.polyline(seg.points as L.LatLngExpression[], {
        color: seg.color,
        weight: 5,
        opacity: 1,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      });
      line.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px;">
          <b style="color: ${seg.color};">${speedLabels[seg.speed] || seg.speed + " km/h"}</b>
          <div style="color: #999; font-size: 10px; margin-top: 2px;">~${seg.speed} km/h</div>
        </div>
      `);
      layer.addLayer(line);
    });

    // Start marker
    if (trajectory.start) {
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50%;
          background: #22c55e; border: 3px solid white;
          box-shadow: 0 0 12px rgba(34,197,94,0.6);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: white; font-weight: bold;
        ">▶</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = L.marker(trajectory.start as L.LatLngExpression, { icon: startIcon });
      m.bindPopup(`<div style="font-family: system-ui;"><b style="color: #22c55e;">Départ</b><br/><span style="color: #888;">${trajectory.startTime || ""}</span></div>`);
      layer.addLayer(m);
    }

    // End marker
    if (trajectory.end) {
      const endIcon = L.divIcon({
        className: "",
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50%;
          background: #ef4444; border: 3px solid white;
          box-shadow: 0 0 12px rgba(239,68,68,0.6);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: white; font-weight: bold;
        ">■</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = L.marker(trajectory.end as L.LatLngExpression, { icon: endIcon });
      m.bindPopup(`<div style="font-family: system-ui;"><b style="color: #ef4444;">Arrivée</b><br/><span style="color: #888;">${trajectory.endTime || ""}</span></div>`);
      layer.addLayer(m);
    }

    // Fit bounds to trajectory — zoom in closer for realistic driving POV
    const allPts = trajectory.segments.flatMap(s => s.points);
    if (allPts.length > 0) {
      const bounds = L.latLngBounds(allPts as L.LatLngExpression[]);
      mapInstance.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
    }
  }, [trajectory, mapReady]);

  // Update live trajectory when points change
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current || !LRef.current) return;
    if (simPosition) return; // don't override sim marker

    const validPoints = points.filter((p) => p.lat !== 0 && p.lon !== 0);
    if (validPoints.length === 0) return;

    // No history trail — only show current tractor position
    const latest = validPoints[0];
    const latLng = LRef.current.latLng(latest.lat, latest.lon);
    markerRef.current.setLatLng(latLng);

    markerRef.current.bindPopup(
      `<div style="font-family: system-ui; font-size: 12px; line-height: 1.6;">
        <b style="color: #e8a838;">Tracteur</b><br/>
        <span style="color: #888;">Débit 1:</span> <b>${latest.flow1.toFixed(1)}</b> L/min<br/>
        <span style="color: #888;">Débit 2:</span> <b>${latest.flow2.toFixed(1)}</b> L/min<br/>
        <span style="color: #888;">Vitesse:</span> <b>${latest.speed.toFixed(1)}</b> km/h
      </div>`
    );

    // Only auto-pan if no trajectory is loaded (avoid fighting fitBounds)
    if (!trajectory?.segments?.length) {
      mapInstance.current.panTo(latLng, { animate: true, duration: 0.5 });
    }
  }, [points, trajectory, simPosition]);

  // ═══ SIMULATION: animate tractor along trajectory ═══
  const prevSimPosRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!mapReady || !markerRef.current || !LRef.current || !mapInstance.current) return;
    if (!simPosition) {
      prevSimPosRef.current = null;
      return;
    }

    const L = LRef.current;
    const latLng = L.latLng(simPosition.lat, simPosition.lon);
    markerRef.current.setLatLng(latLng);

    prevSimPosRef.current = { lat: simPosition.lat, lon: simPosition.lon };

    // Simple glowing dot — color tinted by speed
    const speedKmh = simPosition.speed;
    const dotColor = speedKmh > 10 ? "#ef4444" : speedKmh > 5 ? "#06b6d4" : "#22c55e";
    const simIcon = L.divIcon({
      className: "",
      html: `<div style="
        width: 22px; height: 22px; border-radius: 50%;
        background: ${dotColor}; border: 3px solid white;
        box-shadow: 0 0 14px ${dotColor}, 0 2px 6px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    markerRef.current.setIcon(simIcon);
    markerRef.current.bindPopup(
      `<div style="font-family: system-ui; font-size: 12px; line-height: 1.6;">
        <b style="color: #22c55e;">Tracteur (Simulation)</b><br/>
        <span style="color: #888;">Vitesse:</span> <b>${simPosition.speed.toFixed(1)}</b> km/h<br/>
        <span style="color: #888;">Mode:</span> <b>Traitement en cours</b>
      </div>`
    );

    // Always follow tractor — smooth pan every tick
    mapInstance.current.panTo(latLng, { animate: true, duration: 0.25, easeLinearity: 0.5 });
  }, [simPosition, mapReady]);

  // Progressive trail — the path the tractor has covered so far
  useEffect(() => {
    if (!mapReady || !LRef.current || !mapInstance.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    if (simTrailRef.current) {
      map.removeLayer(simTrailRef.current);
      simTrailRef.current = null;
    }

    if (simTrail && simTrail.length >= 2) {
      // Semi-transparent green overlay — preserves speed colors underneath
      simTrailRef.current = L.polyline(simTrail as L.LatLngExpression[], {
        color: "#22c55e",
        weight: 9,
        opacity: 0.45,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "1, 8",
      }).addTo(map);
    }
  }, [simTrail, mapReady]);

  return (
    <div ref={mapRef} className={className || "w-full h-full"} style={{ minHeight: 300, borderRadius: 16 }} />
  );
}
