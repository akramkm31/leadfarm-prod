"use client";

import { useEffect, useRef, useState } from "react";
import { useParcelles, useTreatments } from "@/hooks/useData";
import type { Parcelle, Treatment } from "@/lib/mock-data";
import { Maximize2, Layers, Target } from "lucide-react";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DashboardMap() {
  const { data: parcellesRaw } = useParcelles();
  const { data: treatmentsRaw } = useTreatments();
  const parcelles = (parcellesRaw || []) as Parcelle[];
  const treatments = (treatmentsRaw || []) as Treatment[];
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstance.current) return;

    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      const map = L.map(container, {
        center: [34.9871, -0.5361],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
      }).addTo(map);

      parcelles.forEach((parcelle) => {
        if (parcelle.boundary.length === 0) return;

        const hasActiveTreatment = treatments.some(
          (t) => t.parcelleId === parcelle.id && t.status === "in_progress"
        );

        const polygon = L.polygon(parcelle.boundary as L.LatLngExpression[], {
          color: parcelle.color,
          fillColor: parcelle.color,
          fillOpacity: hasActiveTreatment ? 0.25 : 0.15,
          weight: hasActiveTreatment ? 3 : 2,
          dashArray: parcelle.lastTreatmentDate ? undefined : "5, 5",
        }).addTo(map);

        polygon.bindPopup(`
          <div style="font-family: system-ui; padding: 4px;">
            <strong style="color: ${escapeHtml(String(parcelle.color))}; font-size: 13px;">${escapeHtml(String(parcelle.name))}</strong>
            <div style="margin-top: 6px; font-size: 11px; color: rgba(255,255,255,0.6);">
              ${escapeHtml(String(parcelle.areaHectares))} ha · ${escapeHtml(String(parcelle.cropType))}
            </div>
            <div style="margin-top: 2px; font-size: 10px; color: rgba(255,255,255,0.4);">
              ${escapeHtml(String(parcelle.treatmentCount))} traitements · ${escapeHtml(String(parcelle.soilType))}
            </div>
          </div>
        `);

        if (hasActiveTreatment) {
          const pulseIcon = L.divIcon({
            className: "",
            html: `
              <div style="position:relative;width:20px;height:20px;">
                <div style="position:absolute;inset:0;background:${parcelle.color};border-radius:50%;opacity:0.3;animation:pulse 2s ease-out infinite;"></div>
                <div style="position:absolute;top:5px;left:5px;width:10px;height:10px;background:${parcelle.color};border-radius:50%;border:2px solid white;box-shadow:0 0 8px ${parcelle.color};"></div>
              </div>
              <style>@keyframes pulse{0%{transform:scale(1);opacity:0.3}100%{transform:scale(2.5);opacity:0}}</style>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          L.marker(parcelle.center as L.LatLngExpression, { icon: pulseIcon }).addTo(map);
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

  return (
    <div className="glass-card overflow-hidden relative">
      <div className="flex items-center justify-between p-4 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-white/85">Carte des Parcelles</h3>
          <p className="text-xs text-white/40 mt-0.5">Vue d&apos;ensemble — Tlemcen</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60">
            <Layers className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60">
            <Target className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white/60">
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

      <div ref={mapRef} className="h-[400px] mt-3 rounded-b-2xl" />

      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 p-3 rounded-xl bg-[#1a2e1a]/85 backdrop-blur-xl border border-white/[0.12]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
          <span className="text-[10px] text-white/50">Parcelle traitée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 border-b border-dashed border-white/30" />
          <span className="text-[10px] text-white/50">Non traitée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400/30 border border-amber-400/60 animate-pulse" />
          <span className="text-[10px] text-white/50">Traitement en cours</span>
        </div>
      </div>
    </div>
  );
}