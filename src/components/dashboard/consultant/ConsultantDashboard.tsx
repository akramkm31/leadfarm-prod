"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Satellite, Sprout, Layers, FileText, TrendingUp, AlertTriangle,
  CheckCircle2, RefreshCw, ArrowRight, Droplets, Leaf, BarChart3,
  ExternalLink, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageScreen } from "@/components/adaline/PageScreen";
import AgroMapIndexRail from "@/components/dashboard/agronome/AgroMapIndexRail";
import { useParcelles, useTreatments } from "@/hooks/useData";
import {
  averageIndex, getIndexLevel, isStressed, getIndexValue,
} from "@/lib/agronome/satellite-utils";
import { findParcelle, treatmentsForParcelle } from "@/components/map/dashboard-map-utils";
import type { DashboardKPIs } from "@/lib/data-provider";
import type { SatelliteLoadError } from "@/components/dashboard/useDashboardPage";
import type { DonneesSatellite } from "@/lib/mcd/types";
import type { Parcelle, Treatment } from "@/lib/mock-data";
import type { SatelliteIndexKey } from "@/lib/agronome/satellite-utils";

const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), { ssr: false });

type Props = {
  kpis: DashboardKPIs | null;
  loading: boolean;
  onRefresh: () => void;
  satelliteData: DonneesSatellite[];
  satelliteLoading: boolean;
  satelliteError: SatelliteLoadError;
  onLoadSatellite: () => void;
};

function ndviColor(v: number) {
  if (v >= 0.70) return "#16a34a";
  if (v >= 0.55) return "#65a30d";
  if (v >= 0.40) return "#d97706";
  return "#dc2626";
}

export default function ConsultantDashboard({
  kpis, loading, onRefresh, satelliteData, satelliteLoading, satelliteError, onLoadSatellite,
}: Props) {
  const { data: parcellesRaw } = useParcelles();
  const { data: treatmentsRaw } = useTreatments();
  const parcelles = (parcellesRaw ?? []) as Parcelle[];
  const treatments = (treatmentsRaw ?? []) as Treatment[];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [satelliteIndex, setSatelliteIndex] = useState<SatelliteIndexKey>("ndvi");
  const [previewOpacity, setPreviewOpacity] = useState(0.72);

  const analysis = useMemo(() => {
    if (!satelliteData.length) return null;
    const avg = averageIndex(satelliteData, "ndvi");
    const avgNdwi = averageIndex(satelliteData, "ndwi");
    const level = avg !== null ? getIndexLevel(avg, "ndvi") : null;
    const stressed = satelliteData.filter(r => isStressed(r.indice_ndvi ?? 0, "ndvi"));
    const sorted = [...satelliteData].sort((a, b) => (a.indice_ndvi ?? 0) - (b.indice_ndvi ?? 0));
    const acqDate = satelliteData[0]?.date_acquisition ?? null;
    const indexedCount = satelliteData.filter(r => r.indice_ndvi != null).length;
    return { avg, avgNdwi, level, stressed, sorted, total: satelliteData.length, acqDate, indexedCount };
  }, [satelliteData]);

  const selectedRow = useMemo(
    () => (selectedId ? satelliteData.find(r => r.parcelle_id === selectedId) : null),
    [selectedId, satelliteData],
  );
  const selectedParcelle = useMemo(
    () => (selectedId ? findParcelle(parcelles, selectedId) : null),
    [selectedId, parcelles],
  );
  const selectedTreatments = useMemo((): Treatment[] => {
    if (!selectedParcelle) return [];
    return (treatmentsForParcelle(treatments as unknown as Record<string, unknown>[], selectedParcelle)
      .slice(0, 5) as unknown) as Treatment[];
  }, [selectedParcelle, treatments]);

  const totalHa = useMemo(
    () => parcelles.filter(p => !p.parentId).reduce((s, p) => s + (p.areaHectares ?? 0), 0),
    [parcelles],
  );

  const handleParcellePick = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const hasSatellite = Boolean(analysis?.indexedCount);

  return (
    <PageScreen className="cons-full-dashboard">
      <div className="cons-fd-inner">
        {/* Header */}
        <div className="cons-fd-header-row">
          <div>
            <h1 className="cons-fd-title">Analyse stratégique · Consultant</h1>
            <p className="cons-fd-date">{dateStr}</p>
          </div>
          <div className="cons-fd-header-actions">
            <button type="button" className="agro-action-btn" onClick={onRefresh}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Actualiser
            </button>
            {[
              { href: "/satellite", icon: Satellite, label: "Satellite" },
              { href: "/parcelles", icon: Layers, label: "Parcelles" },
              { href: "/reports", icon: FileText, label: "Rapports" },
              { href: "/protocoles", icon: Sprout, label: "Protocoles" },
              { href: "/resultats", icon: BarChart3, label: "Résultats" },
            ].map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.label} href={a.href} className="agro-action-btn">
                  <Icon className="w-3.5 h-3.5" />{a.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* KPI strip */}
        <div className="cons-fd-kpis">
          {[
            {
              label: "NDVI moyen", value: analysis?.avg?.toFixed(3) ?? "—",
              icon: Leaf, tone: analysis?.stressed.length ? "warn" : "ok",
              href: "/satellite",
            },
            {
              label: "Parcelles indexées", value: analysis?.indexedCount ?? 0,
              icon: Satellite, tone: hasSatellite ? null : "warn", href: "/satellite",
            },
            {
              label: "En stress", value: analysis?.stressed.length ?? kpis?.stressedParcels ?? 0,
              icon: AlertTriangle, tone: (analysis?.stressed.length ?? 0) > 0 ? "alert" : null,
              href: "/satellite",
            },
            {
              label: "Surface totale", value: totalHa.toFixed(1), unit: "ha",
              icon: Layers, tone: null, href: "/parcelles",
            },
            {
              label: "Traitements/mois", value: kpis?.traitementsMois ?? "—",
              icon: TrendingUp, tone: null, href: "/treatments",
            },
            {
              label: "NDWI moyen", value: analysis?.avgNdwi?.toFixed(3) ?? "—",
              icon: Droplets, tone: null, href: "/satellite",
            },
          ].map(c => {
            const Icon = c.icon;
            return (
              <Link key={c.label} href={c.href}>
                <div className={cn(
                  "cons-fd-kpi",
                  c.tone === "alert" && "cons-fd-kpi--alert",
                  c.tone === "warn" && "cons-fd-kpi--warn",
                  c.tone === "ok" && "cons-fd-kpi--ok",
                )}>
                  <span className="cons-fd-kpi-label"><Icon className="w-3.5 h-3.5" />{c.label}</span>
                  <span className="cons-fd-kpi-val">
                    {c.value}{c.unit && <span className="cons-fd-kpi-unit"> {c.unit}</span>}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 3-column body */}
        <div className="cons-fd-body">
          {/* Left — vigour ranking & alerts */}
          <div className="cons-fd-col">
            <section className="cons-fd-panel cons-fd-panel--grow">
              <header className="cons-fd-panel-hd">
                <span className="agro-label-chip">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Vigour parcelles
                </span>
                {analysis && analysis.stressed.length > 0 && (
                  <span className="cons-fd-badge">{analysis.stressed.length}</span>
                )}
              </header>

              {!hasSatellite ? (
                <div className="cons-fd-no-data cons-fd-no-data--compact">
                  <Satellite className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p className="cons-fd-no-data-title">Indices non chargés</p>
                  <p className="cons-fd-no-data-sub">Sentinel-2 L2A · NDVI / NDWI</p>
                  {satelliteError === "forbidden" && (
                    <p className="cons-fd-no-data-sub text-amber-600">Accès satellite refusé</p>
                  )}
                  <button
                    type="button"
                    className="agro-action-btn mt-2"
                    onClick={onLoadSatellite}
                    disabled={satelliteLoading}
                  >
                    {satelliteLoading ? "Chargement…" : "Charger satellite"}
                  </button>
                </div>
              ) : analysis!.stressed.length === 0 ? (
                <div className="cons-fd-ok">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  <div>
                    <p className="cons-fd-ok-title">Végétation satisfaisante</p>
                    <p className="cons-fd-ok-sub">Aucune parcelle en stress détectée</p>
                  </div>
                </div>
              ) : null}

              {hasSatellite && (
                <ul className="cons-fd-parcel-list">
                  {analysis!.sorted.map(row => {
                    const ndvi = row.indice_ndvi ?? 0;
                    const lvl = getIndexLevel(ndvi, "ndvi");
                    const stressed = isStressed(ndvi, "ndvi");
                    const active = selectedId === row.parcelle_id;
                    return (
                      <li key={row.parcelle_id}>
                        <button
                          type="button"
                          className={cn(
                            "cons-fd-parcel-item",
                            stressed && "cons-fd-parcel-item--stress",
                            active && "cons-fd-parcel-item--active",
                          )}
                          onClick={() => handleParcellePick(row.parcelle_id)}
                        >
                          <span
                            className="cons-fd-parcel-dot"
                            style={{ background: ndviColor(ndvi) }}
                          />
                          <span className="cons-fd-parcel-name">
                            {row.parcelle_name ?? row.parcelle_id}
                          </span>
                          <span className="cons-fd-parcel-ndvi" style={{ color: ndviColor(ndvi) }}>
                            {ndvi.toFixed(3)}
                          </span>
                          <span className="cons-fd-parcel-lvl">{lvl.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {analysis?.acqDate && (
                <p className="cons-fd-acq-foot">
                  Sentinel-2 · {new Date(analysis.acqDate).toLocaleDateString("fr-FR")}
                </p>
              )}
            </section>
          </div>

          {/* Center — map */}
          <div className="cons-fd-map-wrap">
            {hasSatellite && (
              <div className="cons-fd-map-tools">
                <AgroMapIndexRail
                  index={satelliteIndex}
                  onIndexChange={setSatelliteIndex}
                  parcelleCount={analysis?.indexedCount ?? 0}
                />
                <div className="cons-fd-opacity">
                  <label htmlFor="cons-opacity">Opacité</label>
                  <input
                    id="cons-opacity"
                    type="range"
                    min={0.3}
                    max={1}
                    step={0.05}
                    value={previewOpacity}
                    onChange={e => setPreviewOpacity(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            <DashboardMap
              embedded
              hideQuickNav
              historyPanelExternal
              satelliteMode={hasSatellite}
              satelliteEnhanced={hasSatellite}
              satelliteDirectApi
              satelliteData={satelliteData}
              satelliteIndex={satelliteIndex}
              satelliteIndexedOnly={false}
              satellitePreviewOpacity={previewOpacity}
              selectedParcelleId={selectedId}
              onSelectedParcelleIdChange={setSelectedId}
              focusParcelleId={selectedId}
            />
            {!hasSatellite && !satelliteLoading && (
              <div className="cons-fd-map-empty">
                <MapPin className="w-8 h-8 opacity-40" />
                <p>Carte parcelles · chargez les indices satellite</p>
                <button type="button" className="agro-action-btn" onClick={onLoadSatellite}>
                  <Satellite className="w-4 h-4" />Charger NDVI
                </button>
              </div>
            )}
          </div>

          {/* Right — detail / summary */}
          <div className="cons-fd-col">
            {selectedRow && selectedParcelle ? (
              <section className="cons-fd-panel cons-fd-panel--grow">
                <header className="cons-fd-panel-hd">
                  <span className="agro-label-chip">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedParcelle.name}
                  </span>
                  <button
                    type="button"
                    className="cons-fd-link-sm"
                    onClick={() => setSelectedId(null)}
                  >
                    Fermer
                  </button>
                </header>

                <div className="cons-fd-detail-grid">
                  {(["ndvi", "ndwi"] as const).map(key => {
                    const val = getIndexValue(selectedRow, key);
                    const lvl = val != null ? getIndexLevel(val, key) : null;
                    return (
                      <div key={key} className="cons-fd-detail-card">
                        <span className="cons-fd-detail-key">{key.toUpperCase()}</span>
                        <span
                          className="cons-fd-detail-val"
                          style={{ color: val != null ? ndviColor(val) : undefined }}
                        >
                          {val?.toFixed(3) ?? "—"}
                        </span>
                        <span className="cons-fd-detail-lvl">{lvl?.label ?? "Non indexé"}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedRow.indice_ndvi != null && (
                  <div className={cn(
                    "cons-fd-reco",
                    (selectedRow.indice_ndvi ?? 0) < 0.4 ? "cons-fd-reco--red" : "cons-fd-reco--amber",
                  )}>
                    <Sprout className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="cons-fd-reco-name">Recommandation</p>
                      <p className="cons-fd-reco-action">
                        {getIndexLevel(selectedRow.indice_ndvi, "ndvi").action}
                      </p>
                    </div>
                  </div>
                )}

                <div className="cons-fd-detail-meta">
                  {selectedParcelle.areaHectares != null && (
                    <span>{selectedParcelle.areaHectares.toFixed(2)} ha</span>
                  )}
                  {selectedParcelle.cropType && <span>{selectedParcelle.cropType}</span>}
                </div>

                <div className="cons-fd-detail-links">
                  <Link href={`/satellite?parcelle=${selectedId}`} className="cons-fd-detail-link">
                    <ExternalLink className="w-3 h-3" />Vue satellite
                  </Link>
                  <Link href="/parcelles" className="cons-fd-detail-link">
                    <Layers className="w-3 h-3" />Fiche parcelle
                  </Link>
                </div>

                <header className="cons-fd-panel-hd cons-fd-panel-hd--sub">
                  <span className="agro-label-chip">Traitements récents</span>
                  <Link href="/treatments" className="cons-fd-link-sm">Tout →</Link>
                </header>
                {selectedTreatments.length === 0 ? (
                  <p className="cons-fd-empty">Aucun traitement enregistré</p>
                ) : (
                  <div className="cons-fd-trt-list">
                    {selectedTreatments.map(t => (
                      <div key={String(t.id)} className="cons-fd-trt">
                        <TrendingUp className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="cons-fd-trt-name">
                          {t.products[0]?.productName ?? t.type ?? "—"}
                        </span>
                        <span className="cons-fd-trt-date">
                          {(t.completedDate ?? t.plannedDate)?.slice(0, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                <section className="cons-fd-panel">
                  <header className="cons-fd-panel-hd">
                    <span className="agro-label-chip">
                      <Satellite className="w-3.5 h-3.5" />
                      Synthèse vigour
                    </span>
                  </header>
                  {analysis ? (
                    <>
                      <p className="cons-fd-summary-lead">
                        {analysis.stressed.length > 0
                          ? `${analysis.stressed.length} parcelle${analysis.stressed.length > 1 ? "s" : ""} nécessitent une attention`
                          : "Couvert végétal homogène sur l'exploitation"}
                      </p>
                      <div className="cons-fd-stat-grid">
                        {[
                          { n: analysis.avg?.toFixed(3) ?? "—", l: "NDVI moy." },
                          { n: analysis.stressed.length, l: "Stress", warn: analysis.stressed.length > 0 },
                          { n: analysis.indexedCount, l: "Indexées" },
                          { n: kpis?.traitementsMois ?? "—", l: "Trt./mois" },
                        ].map(s => (
                          <div key={s.l} className="cons-fd-stat">
                            <span className={cn("cons-fd-stat-n", s.warn && "text-amber-600")}>{s.n}</span>
                            <span className="cons-fd-stat-l">{s.l}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="cons-fd-empty">Sélectionnez une parcelle sur la carte ou chargez le satellite</p>
                  )}
                </section>

                <section className="cons-fd-panel cons-fd-panel--grow">
                  <header className="cons-fd-panel-hd">
                    <span className="agro-label-chip">Actions rapides</span>
                  </header>
                  <ul className="cons-fd-actions">
                    {[
                      {
                        tone: "amber" as const,
                        icon: Satellite,
                        title: "Analyse satellite complète",
                        sub: "Historique, alertes, export",
                        href: "/satellite",
                      },
                      {
                        tone: "amber" as const,
                        icon: FileText,
                        title: "Rapports conseil",
                        sub: "Synthèses et recommandations",
                        href: "/reports",
                      },
                      {
                        tone: "red" as const,
                        icon: Sprout,
                        title: "Protocoles cultural",
                        sub: "Plans et bonnes pratiques",
                        href: "/protocoles",
                      },
                    ].map((a, i) => {
                      const Icon = a.icon;
                      return (
                        <li key={i}>
                          <Link href={a.href} className={cn("cons-fd-action", `cons-fd-action--${a.tone}`)}>
                            <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div className="cons-fd-action-body">
                              <span className="cons-fd-action-title">{a.title}</span>
                              <span className="cons-fd-action-sub">{a.sub}</span>
                            </div>
                            <ArrowRight className="w-3 h-3 shrink-0 opacity-50 ml-auto" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </PageScreen>
  );
}
