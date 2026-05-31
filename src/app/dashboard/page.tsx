"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import MeteoWidget from "@/components/dashboard/MeteoWidget";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import DashboardPanelModal from "@/components/dashboard/DashboardPanelModal";
import FeatureGate from "@/components/auth/FeatureGate";
import {
  PageScreen,
  AdalineButton,
  StatusPill,
} from "@/components/adaline/PageScreen";
import { fetchDashboardKPIs, type DashboardKPIs } from "@/lib/data-provider";
import { useTreatments, useParcelles } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import {
  findParcelleByTreatment,
  resolveTreatmentParcelleId,
} from "@/components/map/dashboard-map-utils";
import { TREATMENT_STATUS_SHORT } from "@/lib/ux-labels";
import { countTreatmentsInWeek } from "@/lib/dashboard-utils";
import InlineBanner from "@/components/ui/InlineBanner";
import { useSetHeaderActions } from "@/components/layout/HeaderActions";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronRight,
  Loader2,
  RefreshCw,
  MapPin,
  ClipboardList,
  CloudSun,
} from "lucide-react";

type DashboardPanel = "treatments" | "meteo" | null;

const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[120px] rounded-[8px] border border-[var(--color-stone-moss)] bg-[#f5f8ec] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-valley-green)]" />
    </div>
  ),
});

const REFRESH_MS = 60_000;

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
  return (
    <AppLayout>
      <DashboardView />
    </AppLayout>
  );
}

function DashboardView() {
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("access") === "denied";
  const [showAccessBanner, setShowAccessBanner] = useState(accessDenied);

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpiError, setKpiError] = useState(false);
  const [activeTreatmentId, setActiveTreatmentId] = useState<string | null>(null);
  const [focusParcelleId, setFocusParcelleId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<DashboardPanel>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setHeaderActions = useSetHeaderActions();

  const { data: treatmentsRaw } = useTreatments();
  const { data: parcellesRaw } = useParcelles();
  const treatments = (treatmentsRaw || []) as unknown as Record<string, unknown>[];
  const parcelles = (parcellesRaw || []) as Parcelle[];

  const handleTreatmentRowSelect = useCallback(
    (t: Record<string, unknown>) => {
      const id = String(t.id);
      const next = activeTreatmentId === id ? null : id;
      setActiveTreatmentId(next);
      setFocusParcelleId(next ? resolveTreatmentParcelleId(parcelles, t) : null);
      if (next) setOpenPanel(null);
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

  const loadKpis = useCallback(async () => {
    try {
      const data = await fetchDashboardKPIs();
      setKpis(data);
      setKpiError(false);
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

  const plannedThisWeek = useMemo(() => countTreatmentsInWeek(treatments), [treatments]);

  const treatmentsWeekLabel = loading
    ? "Chargement du tableau de bord…"
    : `${plannedThisWeek} traitement${plannedThisWeek !== 1 ? "s" : ""} planifié${plannedThisWeek !== 1 ? "s" : ""} cette semaine`;

  const treatmentsMonthLabel = loading
    ? "—"
    : (kpis?.pendingApproval ?? 0) > 0
      ? `${kpis?.traitementsMois ?? 0} traitements / mois · ${kpis?.pendingApproval} en attente de validation`
      : `${kpis?.traitementsMois ?? 0} traitements / mois · ${(kpis?.surfaceMois ?? 0).toFixed(1)} ha traités ce mois`;

  const headerStatsLabel = loading
    ? treatmentsWeekLabel
    : `${treatmentsWeekLabel} · ${treatmentsMonthLabel}`;

  useEffect(() => {
    setHeaderActions(
      <>
        <span className="hidden sm:inline text-sm text-[var(--color-mist-gray)] whitespace-nowrap">
          {headerStatsLabel}
        </span>
        <FeatureGate feature="treatments.edit">
          <AdalineButton variant="primary" href="/treatments">
            <Plus className="w-3.5 h-3.5" />
            Planifier un traitement
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
    );
    return () => setHeaderActions(null);
  }, [loading, loadKpis, setHeaderActions, headerStatsLabel]);

  const recentTreatments = [...treatments]
    .sort(
      (a, b) =>
        new Date(String(b.plannedDate || b.planned_date || 0)).getTime() -
        new Date(String(a.plannedDate || a.planned_date || 0)).getTime()
    )
    .slice(0, 5);

  return (
    <>
      {showAccessBanner && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <span>🔒 Vous n'avez pas accès à cette page avec votre profil actuel.</span>
          <button onClick={() => setShowAccessBanner(false)} className="text-amber-500 hover:text-amber-700 font-bold text-lg leading-none">×</button>
        </div>
      )}
      <PageScreen className="dashboard-screen">
        {kpiError && (
          <div className="px-4 pt-3 shrink-0">
            <InlineBanner tone="warn">
            Impossible de charger les indicateurs.{" "}
            <button type="button" className="underline font-medium" onClick={() => {
              setLoading(true);
              void loadKpis();
            }}>
              Réessayer
            </button>
            </InlineBanner>
          </div>
        )}

        <div className="dash-map-stage">
          <div className="dash-map-bg">
            <div className="dash-mini-map">
              <DashboardMap
                embedded
                activeTreatmentId={activeTreatmentId}
                focusParcelleId={focusParcelleId}
                onSelectTreatment={handleMapTreatmentSelect}
              />
            </div>
          </div>

          <div className="dash-map-insights-overlay">
            <DashboardInsights kpis={kpis} loading={loading} />
          </div>

          <p className="dash-map-stage-hint">
            <MapPin className="w-3 h-3 shrink-0 text-[var(--color-valley-green)]" />
            Cliquez une parcelle sur la carte : historique complet (traitements, maladies, récoltes, satellite…)
            {activeTreatmentId && (
              <span className="block mt-1 text-amber-700">
                Traitement sélectionné — associez une parcelle pour la localiser sur la carte.
              </span>
            )}
          </p>

          <div className="dash-map-fabs">
            <button
              type="button"
              className="dash-map-fab"
              onClick={() => setOpenPanel("treatments")}
            >
              <span className="dash-map-fab-icon">
                <ClipboardList className="w-4 h-4" />
              </span>
              Derniers traitements
            </button>
            <button
              type="button"
              className="dash-map-fab"
              onClick={() => setOpenPanel("meteo")}
            >
              <span className="dash-map-fab-icon">
                <CloudSun className="w-4 h-4" />
              </span>
              Conditions applicatives
            </button>
          </div>
        </div>

        <DashboardPanelModal
          open={openPanel === "treatments"}
          onClose={() => setOpenPanel(null)}
          eyebrow="PLANNING RÉCENT"
          title="Derniers traitements"
          action={
            <AdalineButton variant="tertiary" href="/treatments">
              Voir tout
              <ChevronRight className="w-3 h-3" />
            </AdalineButton>
          }
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
        </DashboardPanelModal>

        <DashboardPanelModal
          open={openPanel === "meteo"}
          onClose={() => setOpenPanel(null)}
          eyebrow="FENÊTRES MÉTÉO"
          title="Conditions applicatives"
        >
          <MeteoWidget compact />
        </DashboardPanelModal>
      </PageScreen>
    </>
  );
}
