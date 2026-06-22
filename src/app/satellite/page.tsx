"use client";



import dynamic from "next/dynamic";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import AppLayout from "@/components/layout/AppLayout";

import { useParcelles } from "@/hooks/useData";

import type { Parcelle } from "@/lib/mock-data";

import type { DonneesSatellite } from "@/lib/mcd/types";

import type { SatelliteMeta } from "@/lib/satellite/repository";

import type { SatelliteAlertRow } from "@/lib/satellite/alerts";

import {
  fetchSatelliteBundle,
  markSatelliteAlertRead,
  syncSatelliteIngest,
} from "@/lib/satellite/client";

import SatelliteAlertsPanel from "@/components/satellite/SatelliteAlertsPanel";

import {
  averageIndex,
  getIndexValue,
  getIndexLevel,
  getPhenologicalStage,
  estimateWaterDeficit,
  type SatelliteIndexKey,
} from "@/lib/agronome/satellite-utils";

import type { SatelliteVisionAnalysis } from "@/lib/satellite/vision-analysis";
import { etatStyle } from "@/lib/satellite/vision-analysis";

import { cn } from "@/lib/utils";

import {

  Satellite,

  RefreshCcw,

  ShieldCheck,

  AlertTriangle,

  CheckCircle2,

  Loader2,

  Map as MapIcon,

  Sparkles,

  Droplets,

  Leaf,

  Zap,

  Lightbulb,

  FileDown,

  TrendingUp,

  TrendingDown,

  CalendarDays,

  MessageCircle,

} from "lucide-react";



const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), { ssr: false });

function IndexSparkline({ data, index }: { data: DonneesSatellite[]; index: "ndvi" | "ndwi" }) {
  if (data.length < 2) return null;
  const vals = data.map(d => (index === "ndwi" ? (d.indice_ndwi ?? 0) : (d.indice_ndvi ?? 0)));
  const W = 200, H = 36;
  const minV = Math.min(...vals, index === "ndwi" ? -0.2 : 0.1);
  const maxV = Math.max(...vals, index === "ndwi" ? 0.3 : 0.5);
  const range = maxV - minV + 0.001;
  const sx = (i: number) => ((i / (vals.length - 1)) * W).toFixed(1);
  const sy = (v: number) => (H - Math.max(0, Math.min(H, ((v - minV) / range) * H))).toFixed(1);
  const pathD = vals.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ");
  const last = vals[vals.length - 1];
  const color = index === "ndwi"
    ? (last >= 0.1 ? "#3b82f6" : last >= 0 ? "#84cc16" : last >= -0.1 ? "#f59e0b" : "#ef4444")
    : (last >= 0.6 ? "#10b981" : last >= 0.4 ? "#84cc16" : last >= 0.2 ? "#f59e0b" : "#ef4444");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx(vals.length - 1)} cy={sy(last)} r="2.5" fill={color} />
    </svg>
  );
}

export default function SatellitePage() {

  const { data: parcellesRaw, loading: parcellesLoading } = useParcelles();

  const parcelles = (parcellesRaw || []) as Parcelle[];



  const [meta, setMeta] = useState<SatelliteMeta | null>(null);

  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [satelliteIndex, setSatelliteIndex] = useState<SatelliteIndexKey>("ndvi");

  const [alerts, setAlerts] = useState<SatelliteAlertRow[]>([]);
  const [apiIndices, setApiIndices] = useState<DonneesSatellite[]>([]);
  const [previewByParcelleId, setPreviewByParcelleId] = useState<Record<string, string>>({});
  const [selectedMapParcelleId, setSelectedMapParcelleId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<SatelliteVisionAnalysis | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchSatelliteBundle();
      setMeta(bundle.meta);
      setApiIndices(bundle.indices);
      setAlerts(bundle.alerts);
      setPreviewByParcelleId(bundle.previews);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les données satellite");
      setApiIndices([]);
      setAlerts([]);
      setPreviewByParcelleId({});
    } finally {
      setLoading(false);
    }
  }, []);

  const mapIndexedParcelleIds = useMemo(
    () => apiIndices.map((r) => r.parcelle_id).filter(Boolean).join(","),
    [apiIndices]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedMapParcelleId((prev) => {
      const ids = mapIndexedParcelleIds ? mapIndexedParcelleIds.split(",") : [];
      if (!ids.length) return null;
      if (prev && ids.includes(prev)) return prev;
      return ids[0];
    });
  }, [mapIndexedParcelleIds]);

  const handleMapParcelleSelect = useCallback((id: string | null) => {
    if (!id) return;
    setSelectedMapParcelleId(id);
    setVisionResult(null);
    setVisionError(null);
  }, []);

  const selectedSat = useMemo(
    () => apiIndices.find((r) => r.parcelle_id === selectedMapParcelleId) ?? null,
    [apiIndices, selectedMapParcelleId]
  );

  const selectedParcelle = useMemo(
    () =>
      parcelles.find((p) => p.id === selectedMapParcelleId) ??
      parcelles.flatMap((p) => (p.children ?? []) as Parcelle[]).find((c) => c.id === selectedMapParcelleId) ??
      null,
    [parcelles, selectedMapParcelleId]
  );

  useEffect(() => {
    if (!selectedMapParcelleId) return;
    const previewUrl = previewByParcelleId[selectedMapParcelleId];
    if (!previewUrl) return;

    let cancelled = false;
    setAnalyzing(true);
    setVisionResult(null);
    setVisionError(null);

    fetch(previewUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("Aperçu Sentinel-2 non disponible — synchronisez d'abord"))))
      .then((blob) => {
        if (cancelled) return;
        const form = new FormData();
        form.append("image", new File([blob], "ndvi.png", { type: blob.type || "image/png" }));
        if (selectedParcelle?.cultureType) form.append("cultureType", selectedParcelle.cultureType);
        const stg = getPhenologicalStage(selectedParcelle?.cultureType, new Date().getMonth() + 1);
        if (stg) form.append("phenoStage", stg);
        return fetch("/api/v1/satellite-data/analyze", { method: "POST", credentials: "include", body: form });
      })
      .then(async (r) => {
        if (!r) return null;
        const text = await r.text();
        if (!text.trim()) throw new Error("Erreur serveur (réponse vide)");
        return JSON.parse(text) as { success?: boolean; data?: SatelliteVisionAnalysis; error?: string };
      })
      .then((json) => {
        if (cancelled || !json) return;
        if (json.data) setVisionResult(json.data);
        else if (json.error) setVisionError(json.error);
      })
      .catch((e) => { if (!cancelled) setVisionError(e instanceof Error ? e.message : "Analyse impossible"); })
      .finally(() => { if (!cancelled) setAnalyzing(false); });

    return () => { cancelled = true; };
  }, [selectedMapParcelleId, previewByParcelleId]);

  const [history, setHistory] = useState<DonneesSatellite[]>([]);

  useEffect(() => {
    if (!selectedMapParcelleId) { setHistory([]); return; }
    let cancelled = false;
    fetch(`/api/v1/satellite-data/history?parcelleId=${encodeURIComponent(selectedMapParcelleId)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { data?: DonneesSatellite[] }) => { if (!cancelled) setHistory(d.data ?? []); })
      .catch(() => { if (!cancelled) setHistory([]); });
    return () => { cancelled = true; };
  }, [selectedMapParcelleId]);

  const trend = useMemo(() => {
    if (history.length < 2) return null;
    const getVal = (r: DonneesSatellite) => satelliteIndex === "ndwi" ? r.indice_ndwi : r.indice_ndvi;
    const prev = getVal(history[history.length - 2]);
    const curr = getVal(history[history.length - 1]);
    if (prev == null || curr == null) return null;
    return curr - prev;
  }, [history, satelliteIndex]);

  const phenoStage = useMemo(() => {
    if (!selectedParcelle) return null;
    return getPhenologicalStage(selectedParcelle.cultureType, new Date().getMonth() + 1);
  }, [selectedParcelle]);

  const waterDeficit = useMemo(() => estimateWaterDeficit(selectedSat?.indice_ndwi), [selectedSat]);

  const handleExportPdf = useCallback(() => {
    if (!selectedParcelle || !selectedSat) return;
    const ndvi = getIndexValue(selectedSat, "ndvi");
    const ndwi = getIndexValue(selectedSat, "ndwi");
    const level = getIndexLevel(ndvi, "ndvi");
    const histRows = history
      .map(h => `<tr><td>${h.date_acquisition.slice(0, 10)}</td><td>${(h.indice_ndvi ?? 0).toFixed(3)}</td><td>${(h.indice_ndwi ?? 0).toFixed(3)}</td></tr>`)
      .join("");
    const trendHtml = trend != null
      ? `<div class="card"><div class="lbl">Tendance NDVI</div><div class="val" style="color:${trend >= 0 ? "#10b981" : "#ef4444"}">${trend >= 0 ? "+" : ""}${trend.toFixed(3)}</div></div>`
      : "";
    const deficitHtml = waterDeficit != null
      ? `<div class="card"><div class="lbl">Déficit hydrique estimé</div><div class="val" style="color:#dc2626">${waterDeficit === 0 ? "Aucun" : `${waterDeficit} mm`}</div></div>`
      : "";
    const aiHtml = visionResult
      ? `<div class="note">${visionResult.note_fr ?? ""}</div><div class="action">⚡ ${visionResult.action_fr ?? ""}</div>`
      : "";
    const tableHtml = histRows
      ? `<h3 style="font-size:14px;margin-top:24px">Historique NDVI</h3><table><thead><tr><th>Date</th><th>NDVI</th><th>NDWI</th></tr></thead><tbody>${histRows}</tbody></table>`
      : "";
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Rapport — ${selectedParcelle.name}</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1a1a1a;font-size:14px}
h1{color:#2d6a4f;font-size:22px;margin-bottom:4px}.sub{color:#666;font-size:12px;margin-bottom:20px}
.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:bold;background:${level.bg};color:${level.color};margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
.card{border:1px solid #e5e7eb;border-radius:10px;padding:14px}
.card .lbl{font-size:10px;text-transform:uppercase;color:#888;font-weight:bold}
.card .val{font-size:22px;font-weight:900;font-family:monospace;margin-top:4px}
.note{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-style:italic;margin:12px 0}
.action{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:8px 0}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
th{text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;font-size:10px;text-transform:uppercase;color:#888}
td{padding:7px 8px;border-bottom:1px solid #f3f4f6}
.footer{margin-top:32px;font-size:11px;color:#999;border-top:1px solid #e5e7eb;padding-top:12px}
@media print{body{margin:20px}}
</style></head><body>
<h1>Rapport Satellite · ${selectedParcelle.name}</h1>
<div class="sub">Sentinel-2 · ${selectedSat.date_acquisition.slice(0, 10)}${phenoStage ? ` · Stade : ${phenoStage}` : ""}${selectedParcelle.cultureType ? ` · ${selectedParcelle.cultureType}` : ""} · ${new Date().toLocaleDateString("fr-FR")}</div>
<span class="badge">${level.label}</span>
<div class="grid">
<div class="card"><div class="lbl">NDVI</div><div class="val" style="color:${level.color}">${ndvi.toFixed(3)}</div></div>
<div class="card"><div class="lbl">NDWI</div><div class="val">${ndwi.toFixed(3)}</div></div>
${deficitHtml}${trendHtml}
</div>
${aiHtml}${tableHtml}
<div class="footer">LeadFarm · Données Copernicus Sentinel-2 L2A</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [selectedParcelle, selectedSat, history, phenoStage, waterDeficit, trend, visionResult]);

  const flatParcelleCount = parcelles.reduce(

    (n, p) => n + 1 + (p.children?.length ?? 0),

    0

  );



  const [satellitePreviewOpacity, setSatellitePreviewOpacity] = useState(0.72);
  const avgNdvi = averageIndex(apiIndices, "ndvi");
  const stressedCount = apiIndices.filter((r) => getIndexValue(r, "ndvi") < 0.55).length;
  const indexedCount = apiIndices.length;

  const pageLoading = loading || parcellesLoading;



  const handleSync = async () => {

    setSyncing(true);

    setSyncMessage(null);

    setError(null);

    try {

      const result = await syncSatelliteIngest({ days: 90 });

      setSyncMessage(result.message || "Synchronisation terminée");

      await load();

    } catch (e) {

      setError(e instanceof Error ? e.message : "Synchronisation échouée");

    } finally {

      setSyncing(false);

    }

  };



  const handleMarkAlertRead = async (id: string) => {
    await markSatelliteAlertRead(id);
    await load();
  };



  return (

    <AppLayout>

      <div className="max-w-[1400px] mx-auto py-8 px-4">

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-[var(--green-010)] border border-[var(--green-020)] flex items-center justify-center">

              <Satellite className="w-7 h-7 text-[var(--interactive-green)]" />

            </div>

            <div>

              <h1 className="text-3xl font-black text-[var(--text-primary)]">Imagerie Satellite</h1>

              <p className="text-sm text-[var(--text-tertiary)] mt-0.5 font-medium">

                Sentinel-2 · NDVI · NDWI · SAVI

              </p>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {meta && (

              <div

                className={cn(

                  "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",

                  meta.parcellesSynced > 0

                    ? "bg-[var(--green-010)] border-[var(--green-020)] text-[var(--leaf-green)]"

                    : meta.ready

                      ? "bg-blue-50 border-blue-200 text-blue-700"

                      : "bg-amber-50 border-amber-200 text-amber-700"

                )}

              >

                {meta.parcellesSynced > 0 ? (

                  <CheckCircle2 className="w-3.5 h-3.5" />

                ) : (

                  <AlertTriangle className="w-3.5 h-3.5" />

                )}

                {meta.totalParcelles > 0

                  ? `${meta.parcellesSynced}/${meta.totalParcelles} synchronisée(s)`

                  : meta.ready

                    ? "Prêt à synchroniser"

                    : meta.cdseConfigured

                      ? "Contour parcelle requis"

                      : "CDSE non configuré"}

              </div>

            )}

            {!pageLoading && (
              <SatelliteAlertsPanel alerts={alerts} onMarkRead={(id) => void handleMarkAlertRead(id)} />
            )}

            <button

              type="button"

              onClick={() => void handleSync()}

              disabled={syncing || pageLoading || (meta != null && !meta.ready)}

              title={

                meta && !meta.ready

                  ? meta.message

                  : "Récupérer NDVI/NDWI depuis Copernicus Sentinel-2 L2A"

              }

              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-white text-sm font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"

            >

              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}

              Sync Sentinel-2

            </button>

          </div>

        </div>



        {meta?.message && !error && (

          <div

            className={cn(

              "mb-4 px-4 py-3 rounded-2xl border text-sm",

              meta.ready && meta.parcellesSynced === 0

                ? "border-blue-200 bg-blue-50 text-blue-800"

                : "border-[var(--black-008)] bg-[var(--black-004)] text-[var(--text-secondary)]"

            )}

          >

            {meta.message}

          </div>

        )}

        {syncMessage && (

          <p className="text-sm text-[var(--leaf-green)] mb-4 flex items-center gap-2">

            <ShieldCheck className="w-4 h-4" />

            {syncMessage}

          </p>

        )}

        {error && (

          <div className="mb-4 p-4 rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2">

            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />

            <span>{error}</span>

          </div>

        )}



        {!pageLoading && indexedCount > 0 && (

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">

            <StatCard label="Parcelles indexées" value={String(indexedCount)} />

            <StatCard label="NDVI moyen" value={avgNdvi != null ? avgNdvi.toFixed(2) : "—"} accent />

            <StatCard label="En stress" value={String(stressedCount)} warn={stressedCount > 0} />

            <StatCard

              label="Exploitation"

              value={`${indexedCount}/${flatParcelleCount || meta?.totalParcelles || indexedCount}`}

            />

          </div>

        )}



        {!pageLoading && flatParcelleCount > 0 && (
          <section className="mb-8">
            {/* toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-[var(--interactive-green)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Carte satellite</h2>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {flatParcelleCount} parcelle{flatParcelleCount > 1 ? "s" : ""} · {indexedCount} indexée{indexedCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] font-medium">
                  Opacité NDVI
                  <input
                    type="range" min={0} max={100}
                    value={Math.round(satellitePreviewOpacity * 100)}
                    onChange={(e) => setSatellitePreviewOpacity(Number(e.target.value) / 100)}
                    className="w-24 accent-[var(--interactive-green)]"
                  />
                  <span className="tabular-nums w-8 text-right">{Math.round(satellitePreviewOpacity * 100)}%</span>
                </label>
                <div className="flex items-center gap-1 p-1 rounded-full border border-[var(--black-008)] bg-[var(--surface-pure)]">
                  {(["ndvi", "ndwi"] as const).map((key) => (
                    <button key={key} type="button" onClick={() => setSatelliteIndex(key)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                        satelliteIndex === key ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >{key}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* parcelle selector strip */}
            {(parcelles.length > 0 || indexedCount > 0) && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-thin scrollbar-thumb-[var(--black-008)]">
                {parcelles.flatMap((p) => {
                  const items = [p, ...((p.children ?? []) as typeof parcelles)];
                  return items.map((item) => {
                    const sat = apiIndices.find((r) => r.parcelle_id === item.id);
                    const ndvi = sat ? getIndexValue(sat, "ndvi") : null;
                    const level = ndvi != null ? getIndexLevel(ndvi, "ndvi") : null;
                    const isSelected = selectedMapParcelleId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMapParcelleSelect(item.id)}
                        className={cn(
                          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all",
                          isSelected
                            ? "bg-[var(--text-primary)] text-white border-transparent shadow"
                            : "bg-[var(--surface-pure)] border-[var(--black-008)] text-[var(--text-secondary)] hover:border-[var(--black-016)]"
                        )}
                      >
                        {level && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: level.bar }}
                          />
                        )}
                        <span className="truncate max-w-[120px]">{item.name}</span>
                        {ndvi != null && (
                          <span
                            className="font-mono text-[10px] shrink-0"
                            style={{ color: isSelected ? "rgba(255,255,255,0.8)" : level?.color }}
                          >
                            {ndvi.toFixed(2)}
                          </span>
                        )}
                        {!sat && (
                          <span className="text-[9px] text-[var(--text-tertiary)] shrink-0">—</span>
                        )}
                      </button>
                    );
                  });
                })}
              </div>
            )}

            {/* map + side panel */}
            <div className="flex gap-4 items-start">
              {/* map */}
              <div className={cn("transition-all duration-300 min-w-0", selectedMapParcelleId ? "flex-[3]" : "flex-1")}>
                <div className="h-[min(70vh,580px)] rounded-[32px] border border-[var(--black-008)] overflow-hidden shadow-sm bg-[#f5f8ec]">
                  <DashboardMap
                    embedded hideQuickNav historyPanelExternal
                    satelliteMode satelliteEnhanced satelliteDirectApi
                    satelliteData={apiIndices}
                    satelliteIndex={satelliteIndex}
                    satellitePreviewByParcelleId={previewByParcelleId}
                    satellitePreviewOpacity={satellitePreviewOpacity}
                    selectedParcelleId={selectedMapParcelleId}
                    onSelectedParcelleIdChange={handleMapParcelleSelect}
                  />
                </div>
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)] px-1">
                  Cliquez une parcelle pour l'analyse IA · aperçu NDVI sur les parcelles indexées
                </p>
              </div>

              {/* AI side panel */}
              {selectedMapParcelleId && (
                <div className="flex-[2] min-w-0 h-[min(70vh,580px)] overflow-y-auto rounded-[28px] border border-[var(--black-008)] bg-[var(--surface-pure)]">

                  {/* sticky header */}
                  <div className="sticky top-0 z-10 border-b border-[var(--black-008)] bg-[var(--surface-pure)]">
                    <div className="flex items-start justify-between gap-2 px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-xl bg-[var(--green-010)] border border-[var(--green-020)] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--interactive-green)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {selectedParcelle?.name ?? selectedMapParcelleId}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                            {selectedSat
                              ? `Sentinel-2 · ${selectedSat.date_acquisition.slice(0, 10)} · ${satelliteIndex.toUpperCase()} ${getIndexValue(selectedSat, satelliteIndex).toFixed(2)}`
                              : "Aucun indice synchronisé"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {trend != null && (
                          <div className={cn(
                            "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black",
                            trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          )}>
                            {trend >= 0
                              ? <TrendingUp className="w-3 h-3" />
                              : <TrendingDown className="w-3 h-3" />}
                            {trend >= 0 ? "+" : ""}{trend.toFixed(3)}
                          </div>
                        )}
                        {selectedSat && (
                          <button type="button" onClick={handleExportPdf} title="Exporter rapport PDF"
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--black-008)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {visionResult && !analyzing && (
                          <button
                            type="button"
                            title="Expliquer en langage simple"
                            onClick={() => {
                              const parcelName = selectedParcelle?.name ?? selectedMapParcelleId ?? "la parcelle";
                              const zones = visionResult.zones?.length
                                ? visionResult.zones.map(z => `${z.label} (${z.etat}, NDVI ${z.ndvi.toFixed(2)}${z.anomalie ? ` — ${z.anomalie}` : ""})`).join(", ")
                                : "non disponibles";
                              const msg =
                                `[Satellite · ${parcelName}] ` +
                                `NDVI ${visionResult.ndvi.toFixed(2)}, NDWI ${visionResult.ndwi.toFixed(2)}, ` +
                                `couverture ${visionResult.couverture_vegetale_pct}%, ` +
                                `stress hydrique ${visionResult.stress_hydrique}, nutritionnel ${visionResult.stress_nutritionnel}` +
                                `${visionResult.alerte ? `, alerte : ${visionResult.alerte}` : ""}.\n\n` +
                                `Réponds en 2-3 points maximum. Chaque point : une phrase courte avec emoji, ` +
                                `d'abord ce que ça veut dire concrètement sur le terrain (comme si tu parlais à un agriculteur qui ne connaît pas les chiffres), ` +
                                `puis en une demi-phrase ce qu'il faut faire ou surveiller. ` +
                                `Zéro jargon technique. Zéro mention de NDVI/NDWI/indices. Langue : français naturel et direct.`;
                              window.dispatchEvent(new CustomEvent("assistant:inject", { detail: { message: msg } }));
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--black-008)] text-[var(--interactive-green)] hover:text-[var(--interactive-green)] transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {analyzing && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-tertiary)]" />}
                        {visionResult && !analyzing && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                            style={{ background: etatStyle(visionResult.etat_global).bg, color: etatStyle(visionResult.etat_global).color }}>
                            {visionResult.etat_global}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* always-visible DB summary */}
                  {selectedSat && (
                    <div className="px-4 py-3 border-b border-[var(--black-008)] space-y-2.5">
                      {phenoStage && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3 h-3 text-[var(--interactive-green)] shrink-0" />
                          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Stade</span>
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{phenoStage}</span>
                        </div>
                      )}
                      {waterDeficit != null && (
                        <div className="flex items-center gap-2">
                          <Droplets className={cn("w-3 h-3 shrink-0", satelliteIndex === "ndwi" ? "text-blue-600" : "text-blue-500")} />
                          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                            {satelliteIndex === "ndwi" ? `NDWI ${selectedSat ? getIndexValue(selectedSat, "ndwi").toFixed(2) : ""}` : "Déficit hydrique"}
                          </span>
                          <span className={cn("text-[11px] font-black font-mono",
                            waterDeficit === 0 ? "text-emerald-600" : waterDeficit < 30 ? "text-amber-600" : "text-red-600")}>
                            {waterDeficit === 0 ? "Aucun" : `~${waterDeficit} mm`}
                          </span>
                        </div>
                      )}
                      {history.length >= 2 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                              {satelliteIndex.toUpperCase()} historique ({history.length} acquisitions)
                            </span>
                            <span className="text-[9px] text-[var(--text-tertiary)]">
                              {history[0]?.date_acquisition.slice(0, 7)} → {history[history.length - 1]?.date_acquisition.slice(0, 7)}
                            </span>
                          </div>
                          <IndexSparkline data={history} index={satelliteIndex} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* no preview */}
                  {!previewByParcelleId[selectedMapParcelleId] && !analyzing && !visionResult && (
                    <div className="px-4 py-6 text-center">
                      <Satellite className="w-8 h-8 mx-auto mb-3 text-[var(--text-tertiary)] opacity-30" />
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Aucun aperçu Sentinel-2 disponible.<br />Synchronisez pour activer l'analyse IA.
                      </p>
                    </div>
                  )}

                  {/* error */}
                  {visionError && !analyzing && (
                    <div className="mx-4 my-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{visionError}
                    </div>
                  )}

                  {/* skeleton */}
                  {analyzing && (
                    <div className="px-4 py-4 space-y-3 animate-pulse">
                      <div className="grid grid-cols-5 gap-1.5">
                        {["NDVI","NDWI","EVI","SAVI","NDRE"].map((l) => (
                          <div key={l} className="rounded-xl border border-[var(--black-008)] p-2.5 text-center space-y-1.5">
                            <div className="h-1.5 rounded bg-[var(--black-008)] w-6 mx-auto" />
                            <div className="h-3 rounded bg-[var(--black-008)] w-8 mx-auto" />
                          </div>
                        ))}
                      </div>
                      <div className="h-12 rounded-xl bg-[var(--black-008)]" />
                      <div className="h-12 rounded-xl bg-[var(--black-008)]" />
                    </div>
                  )}

                  {/* AI results */}
                  {visionResult && !analyzing && (
                    <div className="px-4 py-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--interactive-green)]"
                            style={{ width: `${visionResult.couverture_vegetale_pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] shrink-0">
                          {visionResult.couverture_vegetale_pct}% couverture
                        </span>
                      </div>

                      {visionResult.alerte && (
                        <div className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{visionResult.alerte}
                        </div>
                      )}

                      <div className="grid grid-cols-5 gap-1.5">
                        {([
                          ["NDVI", visionResult.ndvi, <Leaf key="l" className="w-2.5 h-2.5" />],
                          ["NDWI", visionResult.ndwi, <Droplets key="d" className="w-2.5 h-2.5" />],
                          ["EVI",  visionResult.evi,  <Leaf key="e" className="w-2.5 h-2.5" />],
                          ["SAVI", visionResult.savi, <Leaf key="s" className="w-2.5 h-2.5" />],
                          ["NDRE", visionResult.ndre, <Zap key="z" className="w-2.5 h-2.5" />],
                        ] as [string, number, React.ReactNode][]).map(([label, val, icon]) => {
                          const c = val >= 0.6 ? "#10b981" : val >= 0.4 ? "#84cc16" : val >= 0.2 ? "#f59e0b" : "#ef4444";
                          return (
                            <div key={label} className="rounded-xl border border-[var(--black-008)] bg-[var(--black-004)] p-2 text-center">
                              <div className="flex items-center justify-center gap-0.5 mb-0.5" style={{ color: c }}>{icon}</div>
                              <p className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">{label}</p>
                              <p className="text-sm font-black font-mono leading-none" style={{ color: c }}>{val.toFixed(2)}</p>
                              <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, ((val+1)/2)*100))}%`, background: c }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
                          <Droplets className="w-3 h-3 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-blue-700 uppercase">Hydrique</p>
                            <p className="text-xs font-semibold text-blue-900 truncate">{visionResult.stress_hydrique}</p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2">
                          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-amber-700 uppercase">Nutritionnel</p>
                            <p className="text-xs font-semibold text-amber-900 truncate">{visionResult.stress_nutritionnel}</p>
                          </div>
                        </div>
                      </div>

                      {visionResult.zones?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Zones</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {visionResult.zones.map((z) => {
                              const zs = etatStyle(z.etat);
                              const zc = z.ndvi >= 0.6 ? "#10b981" : z.ndvi >= 0.4 ? "#84cc16" : z.ndvi >= 0.2 ? "#f59e0b" : "#ef4444";
                              return (
                                <div key={z.label} className="p-2.5 rounded-xl border border-[var(--black-008)] bg-[var(--black-004)]">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[10px] font-bold truncate">{z.label}</span>
                                    <span className="text-[8px] font-black px-1 py-0.5 rounded-full shrink-0" style={{ background: zs.bg, color: zs.color }}>{z.etat}</span>
                                  </div>
                                  <p className="text-[10px] font-mono font-bold" style={{ color: zc }}>NDVI {z.ndvi.toFixed(2)}</p>
                                  {z.anomalie && <p className="text-[9px] text-amber-700 mt-0.5 truncate">{z.anomalie}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}


                    </div>
                  )}

                  {/* parcelle ranking */}
                  {apiIndices.length > 1 && (
                    <div className="border-t border-[var(--black-008)] px-4 py-3 space-y-1">
                      <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Classement par stress</p>
                      {[...apiIndices]
                        .sort((a, b) => getIndexValue(a, "ndvi") - getIndexValue(b, "ndvi"))
                        .map((row, i) => {
                          const ndvi = getIndexValue(row, "ndvi");
                          const level = getIndexLevel(ndvi, "ndvi");
                          const isSelected = row.parcelle_id === selectedMapParcelleId;
                          const pName = row.parcelle_name
                            ?? parcelles.find(p => p.id === row.parcelle_id)?.name
                            ?? (parcelles.flatMap(p => (p.children ?? []) as Parcelle[]).find(c => c.id === row.parcelle_id)?.name)
                            ?? row.parcelle_id;
                          return (
                            <button key={row.parcelle_id} type="button"
                              onClick={() => handleMapParcelleSelect(row.parcelle_id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all",
                                isSelected ? "bg-[var(--black-008)]" : "hover:bg-[var(--black-004)]"
                              )}>
                              <span className="text-[9px] font-bold text-[var(--text-tertiary)] w-3 shrink-0">{i + 1}</span>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: level.bar }} />
                              <span className="text-[11px] font-semibold truncate flex-1">{pName}</span>
                              <span className="text-[10px] font-mono shrink-0" style={{ color: level.color }}>{ndvi.toFixed(2)}</span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}



        {pageLoading && (

          <div className="flex items-center gap-3 py-12 text-[var(--text-tertiary)]">

            <Loader2 className="w-5 h-5 animate-spin" />

            <span className="text-sm">Chargement…</span>

          </div>

        )}



        {!pageLoading && flatParcelleCount === 0 && indexedCount === 0 && (

          <div className="rounded-[32px] border border-[var(--black-008)] bg-[var(--surface-pure)] p-10">

            <div className="text-center mb-8">

              <Satellite className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4 opacity-40" />

              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Configuration Sentinel-2</h2>

              <p className="text-sm text-[var(--text-tertiary)] max-w-lg mx-auto">

                {meta?.message || "Aucune parcelle enregistrée."}

              </p>

            </div>

            <div className="text-center">

              <button

                type="button"

                onClick={() => void handleSync()}

                disabled={syncing || !meta?.ready}

                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-bold disabled:opacity-40"

              >

                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}

                Sync Sentinel-2

              </button>

            </div>

          </div>

        )}



        {!pageLoading && flatParcelleCount > 0 && indexedCount === 0 && (

          <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-8 text-center">

            <p className="text-sm text-blue-900 font-medium mb-4">

              {flatParcelleCount} parcelle(s) — aucun indice synchronisé.

            </p>

            <button

              type="button"

              onClick={() => void handleSync()}

              disabled={syncing || !meta?.ready}

              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-bold disabled:opacity-40"

            >

              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}

              Sync Sentinel-2

            </button>

          </div>

        )}

      </div>

    </AppLayout>

  );

}



function StatCard({

  label,

  value,

  accent,

  warn,

}: {

  label: string;

  value: string;

  accent?: boolean;

  warn?: boolean;

}) {

  return (

    <div className="p-4 rounded-2xl border border-[var(--black-008)] bg-[var(--surface-pure)]">

      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</p>

      <p

        className={cn(

          "text-xl font-black",

          warn ? "text-amber-600" : accent ? "text-[var(--interactive-green)]" : "text-[var(--text-primary)]"

        )}

      >

        {value}

      </p>

    </div>

  );

}


