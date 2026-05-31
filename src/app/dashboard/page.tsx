"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import MeteoWidget from "@/components/dashboard/MeteoWidget";
import DashboardHeroAside from "@/components/dashboard/DashboardHeroAside";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import FeatureGate from "@/components/auth/FeatureGate";
import {
  PageScreen,
  PageHero,
  KpiCard,
  DashCard,
  AdalineButton,
  StatusPill,
} from "@/components/adaline/PageScreen";
import { fetchDashboardKPIs, type DashboardKPIs } from "@/lib/data-provider";
import { useAlerts, useTreatments, useParcelles } from "@/hooks/useData";
import type { Alert, Parcelle } from "@/lib/mock-data";
import {
  findParcelleByTreatment,
  resolveTreatmentParcelleId,
} from "@/components/map/dashboard-map-utils";
import { alertTypeLabel, TREATMENT_STATUS_SHORT, FARM_DISPLAY_NAME } from "@/lib/ux-labels";
import { countTreatmentsInWeek, sumParcelleHectares } from "@/lib/dashboard-utils";
import InlineBanner from "@/components/ui/InlineBanner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Map as MapIcon,
  Download,
  ChevronRight,
  Loader2,
  Radio,
  RefreshCw,
  MapPin,
} from "lucide-react";

const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[120px] rounded-[8px] border border-[var(--color-stone-moss)] bg-[#f5f8ec] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-valley-green)]" />
    </div>
  ),
});

const REFRESH_MS = 60_000;
const ALERTS_SHOWN = 4;

const STATUS_PILL: Record<string, "treating" | "planned" | "done" | "warn"> = {
  in_progress: "treating",
  planned: "planned",
  completed: "done",
  cancelled: "warn",
  pending_approval: "warn",
};

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("access") === "denied";
  const [showAccessBanner, setShowAccessBanner] = useState(accessDenied);

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpiError, setKpiError] = useState(false);
  const [lastKpiUpdate, setLastKpiUpdate] = useState<Date | null>(null);
  const [activeTreatmentId, setActiveTreatmentId] = useState<string | null>(null);
  const [focusParcelleId, setFocusParcelleId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapCardRef = useRef<HTMLDivElement>(null);

  const { data: alertsRaw } = useAlerts();
  const { data: treatmentsRaw } = useTreatments();
  const { data: parcellesRaw } = useParcelles();
  const alerts = (alertsRaw || []) as Alert[];
  const treatments = (treatmentsRaw || []) as unknown as Record<string, unknown>[];
  const parcelles = (parcellesRaw || []) as Parcelle[];

  const handleTreatmentRowSelect = useCallback(
    (t: Record<string, unknown>) => {
      const id = String(t.id);
      const next = activeTreatmentId === id ? null : id;
      setActiveTreatmentId(next);
      setFocusParcelleId(next ? resolveTreatmentParcelleId(parcelles, t) : null);
      if (next) {
        mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [activeTreatmentId, parcelles]
  );

  const handleMapTreatmentSelect = useCallback((id: string | null) => {
    setActiveTreatmentId(id);
    if (!id) {
      setFocusParcelleId(null);
      return;
    }
    const t = treatments.find((x) => String(x.id) === String(id));
    setFocusParcelleId(t ? resolveTreatmentParcelleId(parcelles, t) : null);
  }, [treatments, parcelles]);

  useEffect(() => setMounted(true), []);

  const loadKpis = useCallback(async () => {
    try {
      const data = await fetchDashboardKPIs();
      setKpis(data);
      setKpiError(false);
      setLastKpiUpdate(new Date());
    } catch {
      setKpiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
    intervalRef.current = setInterval(loadKpis, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadKpis]);

  const today = mounted
    ? new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const timeLabel = mounted
    ? new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

  const unack = alerts.filter((a) => !a.acknowledged);
  const recentTreatments = [...treatments]
    .sort(
      (a, b) =>
        new Date(String(b.plannedDate || b.planned_date || 0)).getTime() -
        new Date(String(a.plannedDate || a.planned_date || 0)).getTime()
    )
    .slice(0, 5);

  const plannedThisWeek = useMemo(() => countTreatmentsInWeek(treatments), [treatments]);
  const totalHa = useMemo(() => sumParcelleHectares(parcelles), [parcelles]);

  const favorableHint = useMemo(() => {
    if ((kpis?.stressedParcels ?? 0) > 0) return `${kpis?.stressedParcels} zone(s) sous stress.`;
    if (unack.some((a) => a.message?.toLowerCase().includes("vent"))) {
      return "Fenêtres météo à confirmer avant pulvérisation.";
    }
    return "Conditions favorables pour planifier cette semaine.";
  }, [kpis?.stressedParcels, unack]);

  const alertTone = (type: string) => {
    if (type === "critical" || type === "disease") return "danger";
    if (type === "warning" || type === "stock") return "warn";
    return "info";
  };

  const heroTitle = loading
    ? "Chargement du tableau de bord…"
    : `${plannedThisWeek} traitement${plannedThisWeek !== 1 ? "s" : ""} planifié${plannedThisWeek !== 1 ? "s" : ""} cette semaine.`;

  return (
    <AppLayout>
      {showAccessBanner && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <span>🔒 Vous n'avez pas accès à cette page avec votre profil actuel.</span>
          <button onClick={() => setShowAccessBanner(false)} className="text-amber-500 hover:text-amber-700 font-bold text-lg leading-none">×</button>
        </div>
      )}
      <PageScreen className="dashboard-screen">
        <PageHero
          aside={<DashboardHeroAside />}
          eyebrow={
            mounted
              ? `BONJOUR · ${today.toUpperCase()}${timeLabel ? ` · ${timeLabel}` : ""}`
              : FARM_DISPLAY_NAME.toUpperCase()
          }
          title={heroTitle}
          faded={favorableHint}
          actions={
            <>
              <FeatureGate feature="treatments.edit">
                <AdalineButton variant="primary" href="/treatments">
                  <Plus className="w-3.5 h-3.5" />
                  Planifier un traitement
                </AdalineButton>
              </FeatureGate>
              <FeatureGate feature="parcelles.view">
                <AdalineButton variant="tertiary" href="/parcelles">
                  <MapIcon className="w-3.5 h-3.5" />
                  Ouvrir la carte
                </AdalineButton>
              </FeatureGate>
              <FeatureGate feature="registre">
                <AdalineButton variant="tertiary" href="/registre">
                  <Download className="w-3.5 h-3.5" />
                  Registre du jour
                </AdalineButton>
              </FeatureGate>
              <button
                type="button"
                className="lf-btn lf-btn-tertiary !h-8"
                onClick={() => {
                  setLoading(true);
                  void loadKpis();
                }}
                title="Actualiser les indicateurs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              </button>
            </>
          }
        />

        {kpiError && (
          <InlineBanner tone="warn">
            Impossible de charger les indicateurs.{" "}
            <button type="button" className="underline font-medium" onClick={() => {
              setLoading(true);
              void loadKpis();
            }}>
              Réessayer
            </button>
          </InlineBanner>
        )}

        <div className="dash-kpi-row">
          {lastKpiUpdate && !kpiError && (
            <p className="mono text-[9px] text-[var(--color-mist-gray)] col-span-full -mt-1 mb-0 flex items-center gap-2">
              <span className="lf-live-dot inline-block w-1.5 h-1.5 rounded-full bg-[#3d8b3d]" />
              SYNC · indicateurs à{" "}
              {lastKpiUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          <KpiCard
            label="SURFACE TOTALE"
            value={loading ? "—" : totalHa.toFixed(1)}
            unit="ha"
            trend={
              parcelles.length > 0
                ? `${parcelles.length} parcelle(s) cartographiée(s)`
                : "Cartographie monitorée"
            }
          />
          <KpiCard
            label="TRAITEMENTS / MOIS"
            value={loading ? "—" : (kpis?.traitementsMois ?? 0)}
            trend={
              (kpis?.pendingApproval ?? 0) > 0
                ? `${kpis?.pendingApproval} en attente de validation`
                : `${(kpis?.surfaceMois ?? 0).toFixed(1)} ha traités ce mois`
            }
            tone={(kpis?.pendingApproval ?? 0) > 0 ? "warn" : "ok"}
          />
          <KpiCard
            label="ALERTES ACTIVES"
            value={unack.length}
            trend={
              unack.length === 0
                ? "Aucune action requise"
                : `${Math.min(unack.length, ALERTS_SHOWN)} affichée(s) ci-contre`
            }
            tone={unack.length > 0 ? "warn" : "ok"}
          />
        </div>

        <DashboardInsights kpis={kpis} loading={loading} />

        <div className="dash-grid">
          <div ref={mapCardRef} className="dash-map-card-anchor">
            <DashCard
              eyebrow="EXPLOITATION"
              title={`Vue d'ensemble · ${parcelles.length || 0} parcelle(s)`}
              action={
                <AdalineButton variant="tertiary" href="/parcelles">
                  Détails
                  <ChevronRight className="w-3 h-3" />
                </AdalineButton>
              }
              className="dash-map-card"
              bodyClassName="!overflow-hidden"
            >
              <div className="dash-mini-map">
                <DashboardMap
                  embedded
                  activeTreatmentId={activeTreatmentId}
                  focusParcelleId={focusParcelleId}
                  onSelectTreatment={handleMapTreatmentSelect}
                />
              </div>
              <p className="mono text-[9px] text-[var(--color-mist-gray)] mt-2 shrink-0 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0 text-[var(--color-valley-green)]" />
                Cliquez une parcelle sur la carte : historique complet (traitements, maladies, récoltes, satellite…)
              </p>
              {activeTreatmentId && (
                <p className="mono text-[9px] text-amber-700 mt-2 shrink-0">
                  Traitement sélectionné — associez une parcelle (nom ou parcelle_id) pour la localiser sur la carte.
                </p>
              )}
            </DashCard>
          </div>

          <DashCard
            eyebrow="FLUX D'ALERTES"
            title={
              unack.length === 0
                ? "Aucune action requise"
                : `${unack.length} action${unack.length > 1 ? "s" : ""} requise${unack.length > 1 ? "s" : ""}`
            }
            action={
              <Link href="/alerts" className="lf-live-pill hover:opacity-90" title="Voir toutes les alertes">
                <span className="lf-live-dot" />
                LIVE
              </Link>
            }
            scrollBody
          >
            <div className="alert-list">
              {unack.length === 0 ? (
                <p className="text-sm text-[var(--color-mist-gray)] py-4 text-center">
                  Tout est à jour — bonne journée de pilotage.
                </p>
              ) : (
                unack.slice(0, ALERTS_SHOWN).map((a) => (
                  <div key={a.id} className={`alert-item alert-${alertTone(a.type)}`}>
                    <div className="alert-time mono">
                      {new Date(a.timestamp).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="alert-title line-clamp-2">{a.message}</div>
                      <div className="alert-sub">{alertTypeLabel(a.type)}</div>
                    </div>
                    <AdalineButton
                      variant="tertiary"
                      href={`/alerts?highlight=${a.id}`}
                      className="!h-8 !px-3 text-xs shrink-0"
                    >
                      Voir
                    </AdalineButton>
                  </div>
                ))
              )}
            </div>
          </DashCard>

          <DashCard
            eyebrow="PLANNING RÉCENT"
            title="Derniers traitements"
            action={
              <AdalineButton variant="tertiary" href="/treatments">
                Voir tout
                <ChevronRight className="w-3 h-3" />
              </AdalineButton>
            }
            scrollBody
          >
            <p className="dash-table-hint">
              Cliquez une ligne pour centrer la parcelle sur la carte et afficher son historique de traitements.
            </p>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>PARC.</th>
                    <th>TYPE</th>
                    <th className="hidden md:table-cell">OPÉRATEUR</th>
                    <th>DATE</th>
                    <th>STATUT</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTreatments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="!py-6 text-center text-[var(--color-mist-gray)] text-sm">
                        Aucun traitement récent.
                      </td>
                    </tr>
                  ) : (
                    recentTreatments.map((t) => {
                      const id = String(t.id);
                      const status = String(t.status || "planned");
                      const date = t.plannedDate || t.planned_date;
                      const selected = activeTreatmentId === id;
                      const parc = findParcelleByTreatment(parcelles, t);
                      const parcLabel =
                        (t.parcelleName as string) ||
                        parc?.name ||
                        (t.site_name as string) ||
                        "—";
                      return (
                        <tr
                          key={id}
                          tabIndex={0}
                          role="button"
                          aria-selected={selected}
                          aria-label={`Localiser sur la carte : ${parcLabel}, traitement ${String(t.type || "")}`}
                          className={cn(
                            "cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-valley-green)]/40",
                            selected && "dash-table-row-selected"
                          )}
                          onClick={() => handleTreatmentRowSelect(t)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleTreatmentRowSelect(t);
                            }
                          }}
                        >
                          <td className="mono font-medium dash-table-parc">
                            <span className="inline-flex items-center gap-1.5 max-w-[140px]">
                              {parc && (
                                <span
                                  className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                                  style={{ backgroundColor: parc.color || "var(--color-valley-green)" }}
                                  aria-hidden
                                />
                              )}
                              <span className="truncate" title={parcLabel}>
                                {parcLabel}
                              </span>
                              {selected && (
                                <MapPin className="w-3 h-3 shrink-0 text-[var(--color-valley-green)]" aria-hidden />
                              )}
                            </span>
                          </td>
                          <td>{String(t.type || "—")}</td>
                          <td className="hidden md:table-cell">
                            {String(t.operatorName || t.operator_name || "—")}
                          </td>
                          <td>
                            {date
                              ? new Date(String(date)).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </td>
                          <td>
                            <StatusPill
                              label={TREATMENT_STATUS_SHORT[status] || status.toUpperCase()}
                              variant={STATUS_PILL[status] || "planned"}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </DashCard>

          <DashCard
            eyebrow="FENÊTRES MÉTÉO"
            title="Conditions applicatives"
            action={
              <FeatureGate feature="live">
                <AdalineButton variant="tertiary" href="/live" className="!h-8">
                  <Radio className="w-3 h-3" />
                  IoT Live
                </AdalineButton>
              </FeatureGate>
            }
            scrollBody
          >
            <MeteoWidget compact />
          </DashCard>
        </div>
      </PageScreen>
    </AppLayout>
  );
}
