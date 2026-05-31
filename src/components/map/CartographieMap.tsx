"use client";

import { useEffect, useRef, useState } from "react";

interface Parcelle {
  id: number;
  nom_parcelle: string;
  superficie_hectares: number;
  type_sol: string;
  geometrie?: any; // GeoJSON or poly points
}

interface DiseaseDetection {
  id: number;
  maladie_detectee: string;
  confiance_pct: number;
  confirmation_op: "confirme" | "anomalie" | "faux_positif" | "en_attente";
  source: string;
  horodatage: string;
  geolocalisation?: any; // Point geometry
}

interface ActivePlanning {
  id: number;
  id_parcelle: number;
  type_intervention: string;
  statut: string;
}

interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface CartographieMapProps {
  parcelles: Parcelle[];
  detections: DiseaseDetection[];
  activePlannings: ActivePlanning[];
  gpsTracks: GPSPoint[];
  showDetections: boolean;
  showPlannings: boolean;
  showGPSTracks: boolean;
  onSelectParcelle: (parcelle: Parcelle) => void;
  onSelectDetection: (detection: DiseaseDetection) => void;
}

export default function CartographieMap({
  parcelles,
  detections,
  activePlannings,
  gpsTracks,
  showDetections,
  showPlannings,
  showGPSTracks,
  onSelectParcelle,
  onSelectDetection
}: CartographieMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Layers Ref
  const parcellesLayerRef = useRef<any>(null);
  const detectionsLayerRef = useRef<any>(null);
  const planningsLayerRef = useRef<any>(null);
  const tracksLayerRef = useRef<any>(null);

  // 1. Init Leaflet Map
  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstance.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      LRef.current = L;

      // Fix Next.js default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      });

      const defaultCenter: [number, number] = [35.21, -0.64]; // SBA pilot coordinates
      const map = L.map(container, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // Hybrid satellite view
      L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", { maxZoom: 20 }).addTo(map);

      // Layer groups
      parcellesLayerRef.current = L.layerGroup().addTo(map);
      detectionsLayerRef.current = L.layerGroup().addTo(map);
      planningsLayerRef.current = L.layerGroup().addTo(map);
      tracksLayerRef.current = L.layerGroup().addTo(map);

      mapInstance.current = map;
      setMapReady(true);
    };

    initMap();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Render Parcelles polygons
  useEffect(() => {
    if (!mapReady || !parcellesLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const layer = parcellesLayerRef.current;
    layer.clearLayers();

    parcelles.forEach(p => {
      // Mock polygon bounds around SBA coordinates if geometrie is missing
      const bounds = p.geometrie?.coordinates?.[0]
        ? p.geometrie.coordinates[0].map((coord: any) => [coord[1], coord[0]])
        : getRandomPolygonBounds(p.id);

      const poly = L.polygon(bounds, {
        color: "#604630", // Warm taupe for parcels
        fillColor: "#ffffff",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(layer);

      poly.on("click", () => {
        onSelectParcelle(p);
      });

      poly.bindPopup(`<strong>Parcelle: ${p.nom_parcelle}</strong><br/>Superficie: ${p.superficie_hectares} ha`);
    });
  }, [parcelles, mapReady]);

  // 3. Render Detections circles
  useEffect(() => {
    if (!mapReady || !detectionsLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const layer = detectionsLayerRef.current;
    layer.clearLayers();

    if (!showDetections) return;

    detections.forEach(d => {
      const lat = d.geolocalisation?.coordinates?.[1] || (35.21 + (d.id % 7) * 0.002);
      const lng = d.geolocalisation?.coordinates?.[0] || (-0.64 + (d.id % 5) * 0.002);

      let color = "#e8a838"; // orange (en_attente)
      if (d.confirmation_op === "confirme") color = "#EF4444"; // red
      if (d.confirmation_op === "faux_positif") color = "#34c759"; // green

      const radius = 8 + (d.confiance_pct / 10);

      const circle = L.circleMarker([lat, lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: radius,
        weight: 1.5
      }).addTo(layer);

      circle.on("click", () => {
        onSelectDetection(d);
      });

      circle.bindPopup(`<strong>${d.maladie_detectee}</strong><br/>Confiance: ${d.confiance_pct}%<br/>Statut: ${d.confirmation_op}`);
    });
  }, [detections, showDetections, mapReady]);

  // 4. Render Active Plannings (highlights parcelles in amber)
  useEffect(() => {
    if (!mapReady || !planningsLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const layer = planningsLayerRef.current;
    layer.clearLayers();

    if (!showPlannings) return;

    activePlannings.forEach(pl => {
      const parcelle = parcelles.find(p => p.id === pl.id_parcelle);
      if (!parcelle) return;

      const bounds = parcelle.geometrie?.coordinates?.[0]
        ? parcelle.geometrie.coordinates[0].map((coord: any) => [coord[1], coord[0]])
        : getRandomPolygonBounds(parcelle.id);

      L.polygon(bounds, {
        color: "#f59e0b", // Amber glow
        fillColor: "#f59e0b",
        fillOpacity: 0.45,
        weight: 3,
        dashArray: "4,4"
      }).addTo(layer).bindPopup(`<strong>Intervention en cours</strong><br/>${pl.type_intervention}<br/>Statut: ${pl.statut}`);
    });
  }, [activePlannings, parcelles, showPlannings, mapReady]);

  // 5. Render GPS tracks (polylines)
  useEffect(() => {
    if (!mapReady || !tracksLayerRef.current || !LRef.current) return;
    const L = LRef.current;
    const layer = tracksLayerRef.current;
    layer.clearLayers();

    if (!showGPSTracks || gpsTracks.length < 2) return;

    const latlngs = gpsTracks.map(t => [t.lat, t.lng] as [number, number]);
    L.polyline(latlngs, {
      color: "#0071e3", // Premium blue for tracks
      weight: 4,
      opacity: 0.85
    }).addTo(layer);
  }, [gpsTracks, showGPSTracks, mapReady]);

  // Random bounds generator for dummy parcelles during dev fallback
  function getRandomPolygonBounds(id: number): [number, number][] {
    const lat = 35.21 + (id % 4) * 0.003 - 0.005;
    const lng = -0.64 + (id % 3) * 0.003 - 0.005;
    return [
      [lat, lng],
      [lat + 0.0015, lng],
      [lat + 0.0015, lng + 0.0015],
      [lat, lng + 0.0015],
    ];
  }

  return (
    <div ref={mapRef} className="w-full h-full" style={{ minHeight: "550px", borderRadius: "16px" }} />
  );
}
