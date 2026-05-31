"use client";

import { useEffect, useRef, useState } from "react";
import { getFlowColor } from "@/lib/trajectory-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type LivePosition = {
  lat: number;
  lon: number;
  speed?: number;
  hdop?: number;
  sats?: number;
};

type TractorLiveMapProps = {
  points: GpsPoint[];
  parcelles?: ParcelleOverlay[];
  trajectory?: Trajectory;
  simPosition?: { lat: number; lon: number; speed: number } | null;
  simTrail?: [number, number][];
  livePosition?: LivePosition | null;
  /** Traignée réelle (dernières positions GPS valides) */
  realTrail?: { lat: number; lon: number; flow: number }[];
  /** Trajectoires historiques à afficher en arrière-plan */
  historyTrajectories?: Trajectory[];
  className?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TractorLiveMap({
  parcelles,
  trajectory,
  simPosition,
  simTrail,
  livePosition,
  realTrail,
  historyTrajectories,
  className,
}: TractorLiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const simMarkerRef = useRef<any>(null);
  const liveMarkerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const parcelleLayerRef = useRef<any>(null);
  const trajectoryLayerRef = useRef<any>(null);
  const simTrailRef = useRef<any>(null);
  const realTrailRef = useRef<any>(null);
  const historyLayersRef = useRef<Record<string, any>>({});
  const [mapReady, setMapReady] = useState(false);

  // ─── Map initialisation ──────────────────────────────────────────────────

  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstance.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      LRef.current = L;

      // Fix for Leaflet marker icons in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      const defaultCenter: [number, number] = [34.987, -0.5361];
      const map = L.map(container, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", { maxZoom: 20 }).addTo(map);

      parcelleLayerRef.current = L.layerGroup().addTo(map);
      trajectoryLayerRef.current = L.layerGroup().addTo(map);

      // Markers
      simMarkerRef.current = L.marker(defaultCenter, { opacity: 0 }).addTo(map);
      liveMarkerRef.current = L.marker(defaultCenter, { opacity: 0 }).addTo(map);

      mapInstance.current = map;
      setMapReady(true);
    };

    initMap();
    return () => { cancelled = true; };
  }, []);

  // ─── Parcelle boundaries ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !parcelleLayerRef.current || !LRef.current || !parcelles?.length) return;
    const L = LRef.current;
    const layer = parcelleLayerRef.current;
    layer.clearLayers();

    parcelles.forEach(p => {
        if (!p.boundary?.length) return;
        const poly = L.polygon(p.boundary, { color: p.color, fillOpacity: 0.1, weight: 2 }).addTo(layer);
        poly.bindPopup(`<strong>${p.name}</strong>`);
        p.children?.forEach(c => {
            L.polygon(c.boundary, { color: c.color, fillOpacity: 0.1, weight: 1, dashArray: "5,5" }).addTo(layer);
        });
    });
  }, [parcelles, mapReady]);

  // ─── Trajectory ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !trajectoryLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const layer = trajectoryLayerRef.current;
    layer.clearLayers();

    if (!trajectory?.segments?.length) return;

    trajectory.segments.forEach(seg => {
      L.polyline(seg.points, { color: seg.color, weight: 5, opacity: 0.8 }).addTo(layer);
    });

    if (trajectory.start) L.marker(trajectory.start).addTo(layer).bindPopup("Départ");
    if (trajectory.end) L.marker(trajectory.end).addTo(layer).bindPopup("Fin");
  }, [trajectory, mapReady]);

  // ─── History Trajectories (Ghost layers) ───────────────────────────

  useEffect(() => {
    if (!mapReady || !mapInstance.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    // Remove layers that are no longer in the list
    Object.keys(historyLayersRef.current).forEach(id => {
        if (!historyTrajectories?.find((_, idx) => `hist-${idx}` === id)) {
            map.removeLayer(historyLayersRef.current[id]);
            delete historyLayersRef.current[id];
        }
    });

    // Add/Update current history trajectories
    historyTrajectories?.forEach((traj, idx) => {
        const id = `hist-${idx}`;
        if (!historyLayersRef.current[id]) {
            const group = L.layerGroup().addTo(map);
            traj.segments.forEach(seg => {
                L.polyline(seg.points, { 
                    color: "#ffffff", 
                    weight: 3, 
                    opacity: 0.15,
                    dashArray: "10, 10" 
                }).addTo(group);
            });
            historyLayersRef.current[id] = group;
        }
    });
  }, [historyTrajectories, mapReady]);

  // ─── Simulation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !simMarkerRef.current || !LRef.current || !simPosition) {
        if (simMarkerRef.current) simMarkerRef.current.setOpacity(0);
        return;
    }
    const L = LRef.current;
    simMarkerRef.current.setOpacity(1);
    simMarkerRef.current.setLatLng([simPosition.lat, simPosition.lon]);
    
    const icon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    simMarkerRef.current.setIcon(icon);
    mapInstance.current.panTo([simPosition.lat, simPosition.lon]);
  }, [simPosition, mapReady]);

  // ─── Real GPS ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !liveMarkerRef.current || !LRef.current || !livePosition) {
        if (liveMarkerRef.current) liveMarkerRef.current.setOpacity(0);
        return;
    }
    const L = LRef.current;
    liveMarkerRef.current.setOpacity(1);
    liveMarkerRef.current.setLatLng([livePosition.lat, livePosition.lon]);
    
    const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 15px #3b82f6"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    liveMarkerRef.current.setIcon(icon);
    if (!simPosition) mapInstance.current.panTo([livePosition.lat, livePosition.lon]);
  }, [livePosition, simPosition, mapReady]);

  // ─── Trails ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !LRef.current || !mapInstance.current) return;
    const L = LRef.current;
    const map = mapInstance.current;

    if (simTrailRef.current) map.removeLayer(simTrailRef.current);
    if (simTrail && simTrail.length > 1) {
        simTrailRef.current = L.polyline(simTrail, { color: "#22c55e", weight: 8, opacity: 0.3, dashArray: "5,5" }).addTo(map);
    }

    if (realTrailRef.current) map.removeLayer(realTrailRef.current);
    if (realTrail && realTrail.length > 1) {
        const group = L.layerGroup().addTo(map);
        for (let i = 0; i < realTrail.length - 1; i++) {
            const p1 = realTrail[i];
            const p2 = realTrail[i + 1];
            L.polyline([[p1.lat, p1.lon], [p2.lat, p2.lon]], { 
                color: getFlowColor(p2.flow), 
                weight: 5, 
                opacity: 0.9 
            }).addTo(group);
        }
        realTrailRef.current = group;
    }
  }, [simTrail, realTrail, mapReady]);

  return <div ref={mapRef} className={className || "w-full h-full"} style={{ minHeight: 400, borderRadius: 16 }} />;
}
