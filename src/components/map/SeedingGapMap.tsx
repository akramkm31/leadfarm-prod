"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import { Pencil, Check, Upload, X, Trash2, RotateCcw, Info, AlertTriangle, CheckCircle2, Download, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeGaps } from "@/lib/seeding-gap-analysis";
import type { AnalysisResult } from "@/lib/seeding-gap-analysis";

type LatLng = [number, number];
type DrawnParcel = { id: string; name: string; points: LatLng[]; healthPct: number | null; areaHa: number | null };

function healthColor(pct: number | null) {
  return pct === null ? "#94a3b8" : pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
}

const KHELIFA: LatLng = [34.9875, -0.533];
const STORAGE_KEY = "lf_seeding_parcels_v1";

function generateTestPattern(): File {
  const W = 640, H = 420;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Soil background
  ctx.fillStyle = "#c8a96e";
  ctx.fillRect(0, 0, W, H);

  // Add subtle noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.floor((i * 7919) % W);
    const y = Math.floor((i * 6271) % H);
    const v = 180 + ((i * 31) % 40);
    ctx.fillStyle = `rgba(${v},${v - 20},${v - 50},0.15)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Crop rows — dark green bands, spacing ~28px, skip some to create gaps
  const SPACING = 28;
  const SKIP = new Set([3, 7, 14]); // row indices that are "missing"
  let idx = 0;
  for (let x = 14; x < W - 10; x += SPACING) {
    if (!SKIP.has(idx)) {
      const g = 110 + (idx % 3) * 12;
      ctx.fillStyle = `rgba(20,${g},30,0.82)`;
      ctx.fillRect(x - 3, 0, 7, H);
    }
    idx++;
  }

  const dataUrl = canvas.toDataURL("image/png");
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)![1];
  const bytes = atob(b64);
  const u8 = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) u8[i] = bytes.charCodeAt(i);
  return new File([u8], "test_motif_semis.png", { type: mime });
}

export default function SeedingGapMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewMarkersRef = useRef<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parcels, setParcels] = useState<DrawnParcel[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [ptsCount, setPtsCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const drawModeRef = useRef(false);
  const currentPtsRef = useRef<LatLng[]>([]);
  const parcelsRef = useRef<DrawnParcel[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);
  const lastLayerClickRef = useRef(0);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { parcelsRef.current = parcels; }, [parcels]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setParcels(JSON.parse(s)); } catch { /* ignore */ }
    hasLoadedRef.current = true;
  }, []);
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parcels)); } catch { /* ignore */ }
  }, [parcels]);

  const addParcelLayer = useCallback((parcel: DrawnParcel) => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const col = healthColor(parcel.healthPct);
    const poly = L.polygon(parcel.points, { color: col, weight: 2, fillColor: col, fillOpacity: 0.15 }).addTo(mapRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    poly.on("click", (e: any) => { lastLayerClickRef.current = Date.now(); e.originalEvent?.stopPropagation(); setSelectedId(parcel.id); setResult(null); setAnalysisError(null); });
    poly.bindTooltip(parcel.name, { permanent: false, direction: "center" });
    layersRef.current.set(parcel.id, poly);
  }, []);

  const closePoly = useCallback(() => {
    const pts = currentPtsRef.current;
    if (pts.length < 3) return;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i][1] * pts[j][0] - pts[j][1] * pts[i][0];
    }
    const id = `p-${Date.now()}`;
    const parcel: DrawnParcel = {
      id, name: `Parcelle ${parcelsRef.current.length + 1}`, points: [...pts], healthPct: null,
      areaHa: Math.abs(area) * 0.5 * 111320 * 111320 * Math.cos(pts[0][0] * Math.PI / 180) / 10000,
    };
    previewLineRef.current?.remove(); previewLineRef.current = null;
    previewMarkersRef.current.forEach((m) => m.remove()); previewMarkersRef.current = [];
    currentPtsRef.current = []; setPtsCount(0);
    setDrawMode(false); drawModeRef.current = false;
    setParcels((prev) => [...prev, parcel]);
    setSelectedId(id); setResult(null); setAnalysisError(null);
  }, []);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let mounted = true;
    import("leaflet").then(({ default: L }) => {
      if (!mounted || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current!, { center: KHELIFA, zoom: 16, zoomControl: false });
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "© Esri", maxZoom: 20,
      }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        if (!drawModeRef.current) {
          // Deselect only for genuine map-background clicks (not bubbled from a parcel)
          if (selectedIdRef.current && Date.now() - lastLayerClickRef.current > 100) {
            setSelectedId(null); setResult(null); setAnalysisError(null);
          }
          return;
        }
        const pt: LatLng = [e.latlng.lat, e.latlng.lng];
        currentPtsRef.current = [...currentPtsRef.current, pt];
        setPtsCount(currentPtsRef.current.length);
        if (previewLineRef.current) previewLineRef.current.setLatLngs(currentPtsRef.current);
        else previewLineRef.current = L.polyline(currentPtsRef.current, { color: "#22c55e", weight: 2, dashArray: "6,4" }).addTo(map);
        const m = L.circleMarker(e.latlng, { radius: 5, fillColor: "#22c55e", fillOpacity: 1, color: "#fff", weight: 1.5 }).addTo(map);
        previewMarkersRef.current.push(m);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("dblclick", (e: any) => {
        e.originalEvent.preventDefault();
        if (drawModeRef.current && currentPtsRef.current.length >= 3) closePoly();
      });
      mapRef.current = map;
      setMapReady(true);
    });
    return () => { mounted = false; mapRef.current?.remove(); mapRef.current = null; LRef.current = null; setMapReady(false); };
  }, [addParcelLayer, closePoly]);

  useEffect(() => {
    if (!mapReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newLayers: any[] = [];
    parcels.forEach((p) => {
      if (!layersRef.current.has(p.id)) {
        addParcelLayer(p);
        const layer = layersRef.current.get(p.id);
        if (layer) newLayers.push(layer);
      } else {
        // Sync color whenever healthPct changes (handles async analysis result)
        const layer = layersRef.current.get(p.id)!;
        const col = healthColor(p.healthPct);
        layer.setStyle({ color: col, fillColor: col });
      }
    });
    if (newLayers.length && mapRef.current && LRef.current) {
      try {
        const group = LRef.current.featureGroup(newLayers);
        mapRef.current.fitBounds(group.getBounds(), { padding: [60, 60] });
      } catch { /* ignore */ }
    }
  }, [parcels, mapReady, addParcelLayer]);

  const toggleDraw = useCallback(() => {
    if (drawModeRef.current) {
      previewLineRef.current?.remove(); previewLineRef.current = null;
      previewMarkersRef.current.forEach((m) => m.remove()); previewMarkersRef.current = [];
      currentPtsRef.current = []; setPtsCount(0);
    }
    const next = !drawModeRef.current;
    setDrawMode(next); drawModeRef.current = next;
  }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedIdRef.current) return;
    setAnalyzing(true); setAnalysisError(null); setResult(null);
    analyzeGaps(file)
      .then((res) => {
        setResult(res);
        const id = selectedIdRef.current!;
        setParcels((prev) => prev.map((p) => p.id === id ? { ...p, healthPct: res.healthPct } : p));
      })
      .catch((err: Error) => setAnalysisError(err.message))
      .finally(() => { setAnalyzing(false); if (fileInputRef.current) fileInputRef.current.value = ""; });
  }

  function quickDemo() {
    const id = `p-demo-${Date.now()}`;
    const demoPts: LatLng[] = [
      [34.987, -0.534],
      [34.987, -0.532],
      [34.989, -0.532],
      [34.989, -0.534],
    ];
    let demoArea = 0;
    for (let i = 0; i < demoPts.length; i++) {
      const j = (i + 1) % demoPts.length;
      demoArea += demoPts[i][1] * demoPts[j][0] - demoPts[j][1] * demoPts[i][0];
    }
    const areaHa = Math.abs(demoArea) * 0.5 * 111320 * 111320 * Math.cos(demoPts[0][0] * Math.PI / 180) / 10000;
    const parcel: DrawnParcel = { id, name: "Parcelle démo", points: demoPts, healthPct: null, areaHa };
    setParcels((prev) => [...prev, parcel]);
    setSelectedId(id);
    setResult(null);
    setAnalysisError(null);
    setAnalyzing(true);
    analyzeGaps(generateTestPattern())
      .then((res) => {
        setResult(res);
        setParcels((prev) => prev.map((p) => p.id === id ? { ...p, healthPct: res.healthPct } : p));
      })
      .catch((err: Error) => setAnalysisError(err.message))
      .finally(() => setAnalyzing(false));
  }

  function handleTestPattern() {
    if (!selectedIdRef.current) return;
    setAnalyzing(true); setAnalysisError(null); setResult(null);
    const id = selectedIdRef.current;
    analyzeGaps(generateTestPattern())
      .then((res) => {
        setResult(res);
        setParcels((prev) => prev.map((p) => p.id === id ? { ...p, healthPct: res.healthPct } : p));
      })
      .catch((err: Error) => setAnalysisError(err.message))
      .finally(() => setAnalyzing(false));
  }

  function deleteParcel(id: string) {
    layersRef.current.get(id)?.remove(); layersRef.current.delete(id);
    setParcels((prev) => {
      const next = prev.filter((x) => x.id !== id);
      // Auto-select the nearest remaining parcel
      const nextSel = next.find((p) => p.id !== id) ?? null;
      setSelectedId(nextSel?.id ?? null);
      return next;
    });
    setResult(null); setAnalysisError(null);
  }

  const sel = parcels.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Draw toolbar */}
      <div className="absolute top-3 left-3 z-[500] flex flex-col gap-2">
        <button
          onClick={toggleDraw}
          className={cn("hud-panel p-2.5 flex items-center gap-2 text-xs font-bold transition-all", drawMode && "bg-[var(--color-valley-green)]/20 border-emerald-500/40 text-[var(--color-valley-green)]")}
        >
          <Pencil className="w-3.5 h-3.5" />
          {drawMode ? (ptsCount >= 3 ? "Dbl-clic pour fermer" : `${ptsCount} point${ptsCount !== 1 ? "s" : ""}`) : "Dessiner parcelle"}
        </button>
        {parcels.length === 0 && !drawMode && (
          <button
            onClick={quickDemo}
            className="hud-panel p-2.5 flex items-center gap-2 text-xs font-bold text-[var(--color-valley-green)] border-emerald-500/30 hover:bg-[var(--color-valley-green)]/15"
          >
            <Zap className="w-3.5 h-3.5" /> Démo rapide
          </button>
        )}
        {drawMode && ptsCount >= 3 && (
          <button onClick={closePoly} className="hud-panel p-2 text-xs font-bold text-emerald-400 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" /> Fermer la parcelle
          </button>
        )}
        {parcels.length > 0 && !drawMode && (
          <button
            onClick={() => { if (!confirm(`Supprimer ${parcels.length} parcelle(s) ?`)) return; parcels.forEach((p) => { layersRef.current.get(p.id)?.remove(); layersRef.current.delete(p.id); }); setParcels([]); setSelectedId(null); setResult(null); setAnalysisError(null); }}
            className="hud-panel p-2 text-xs text-red-400 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Effacer tout
          </button>
        )}
      </div>

      {/* Empty state hint */}
      {parcels.length === 0 && !drawMode && (
        <div className="absolute inset-0 flex items-center justify-center z-[400] pointer-events-none">
          <div className="hud-panel px-5 py-4 text-center max-w-xs">
            <Info className="w-6 h-6 text-[var(--color-valley-green)] mx-auto mb-2" />
            <p className="text-xs font-bold text-[var(--color-adaline-ink)]/80">Dessinez vos parcelles</p>
            <p className="text-[10px] text-[var(--color-adaline-ink)]/45 mt-1">
              Cliquez « Dessiner parcelle », tracez le contour sur la carte satellite, puis double-cliquez pour fermer.
            </p>
          </div>
        </div>
      )}

      {/* Analysis side panel */}
      {sel && (
        <div className="absolute top-3 right-3 bottom-3 z-[500] w-72">
          <div className="hud-panel h-full flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="p-3 border-b border-[var(--color-stone-moss)] flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs font-bold text-[var(--color-adaline-ink)]/90">{sel.name}</p>
                <p className="text-[10px] text-[var(--color-mist-gray)]">
                  {sel.areaHa ? `${sel.areaHa.toFixed(2)} ha` : "Surface inconnue"}
                  {sel.healthPct !== null && (
                    <span className={cn("ml-1 font-bold", sel.healthPct >= 80 ? "text-emerald-400" : sel.healthPct >= 60 ? "text-amber-400" : "text-red-400")}>
                      · {sel.healthPct.toFixed(1)}%
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => deleteParcel(sel.id)} className="p-1 hover:bg-red-500/10 rounded text-red-400" title="Supprimer la parcelle">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setSelectedId(null); setResult(null); setAnalysisError(null); }} className="p-1 hover:bg-[var(--color-stone-moss)] rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Multi-parcel switcher */}
            {parcels.length > 1 && (
              <div className="px-3 py-2 border-b border-[var(--color-stone-moss)] shrink-0">
                <p className="text-[9px] uppercase tracking-widest text-[var(--color-adaline-ink)]/30 mb-1.5">Toutes les parcelles</p>
                <div className="flex flex-col gap-0.5">
                  {parcels.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedId(p.id); setResult(null); setAnalysisError(null); }}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all",
                        p.id === selectedId
                          ? "bg-[var(--color-valley-green)]/15 border border-emerald-500/20"
                          : "hover:bg-black/20 border border-transparent"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: healthColor(p.healthPct) }} />
                      <span className="flex-1 text-[10px] font-medium text-[var(--color-adaline-ink)]/80 truncate">{p.name}</span>
                      {p.healthPct !== null
                        ? <span className={cn("text-[9px] font-bold shrink-0", p.healthPct >= 80 ? "text-emerald-400" : p.healthPct >= 60 ? "text-amber-400" : "text-red-400")}>{p.healthPct.toFixed(0)}%</span>
                        : <span className="text-[9px] text-[var(--color-adaline-ink)]/30 shrink-0">—</span>
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {/* Upload zone (shown before result) */}
              {!result && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                    className="w-full border border-dashed border-[var(--color-valley-green)]/40 rounded-xl p-6 text-center hover:bg-[var(--color-valley-green)]/5 transition-all disabled:opacity-40"
                  >
                    {analyzing ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-[var(--color-valley-green)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-[var(--color-valley-green)]">Analyse en cours...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-[var(--color-valley-green)]/60 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-[var(--color-adaline-ink)]/70">Charger image drone</p>
                        <p className="text-[10px] text-[var(--color-mist-gray)]">JPG · PNG · WEBP</p>
                      </>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <button
                    onClick={handleTestPattern}
                    disabled={analyzing}
                    className="w-full py-2 rounded-lg border border-[var(--color-stone-moss)] text-[10px] text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-valley-green)] hover:border-emerald-500/40 transition-all disabled:opacity-40"
                  >
                    Tester sans image (motif synthétique)
                  </button>
                  {analysisError && (
                    <div className="flex gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400">{analysisError}</p>
                    </div>
                  )}
                </>
              )}

              {/* Analysis results */}
              {result && (
                <>
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border",
                    result.healthPct >= 80 ? "bg-emerald-500/10 border-emerald-500/30"
                    : result.healthPct >= 60 ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-red-500/10 border-red-500/30"
                  )}>
                    {result.healthPct >= 80
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
                    <div className="flex-1">
                      <p className={cn("text-xl font-black leading-none", result.healthPct >= 80 ? "text-emerald-400" : result.healthPct >= 60 ? "text-amber-400" : "text-red-400")}>
                        {result.healthPct.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-[var(--color-mist-gray)]">Couverture semis</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--color-adaline-ink)]/60">{result.confidence}%</p>
                      <p className="text-[9px] text-[var(--color-adaline-ink)]/30">confiance</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {([["Rangs", result.nbDetected], ["Manquants", result.nbMissing], ["Lacunes", result.gaps.length]] as [string, number][]).map(([label, val]) => (
                      <div key={label} className="bg-black/30 rounded-lg p-2 border border-white/[0.06]">
                        <p className="text-lg font-black font-mono text-[var(--color-adaline-ink)]/80">{val}</p>
                        <p className="text-[9px] text-[var(--color-adaline-ink)]/40 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>

                  <img src={result.annotatedUrl} alt="Résultat annoté" className="w-full rounded-xl border border-[var(--color-stone-moss)]" />

                  <div className="flex gap-2">
                    <a
                      href={result.annotatedUrl}
                      download="analyse_semis.png"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] border border-emerald-500/30 text-xs font-bold hover:bg-[var(--color-valley-green)]/30"
                    >
                      <Download className="w-3.5 h-3.5" /> Exporter
                    </a>
                    <button
                      onClick={() => { setResult(null); setAnalysisError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="px-3 py-2 rounded-lg border border-[var(--color-stone-moss)] text-xs text-[var(--color-adaline-ink)]/60 hover:bg-[var(--color-stone-moss)]"
                    >
                      Refaire
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
