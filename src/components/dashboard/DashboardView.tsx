"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, ClipboardList, CloudSun, Plus, RefreshCw } from "lucide-react";
import FeatureGate from "@/components/auth/FeatureGate";
import { useSetHeaderActions } from "@/components/layout/HeaderActions";
import { useAccessContext, setDemoRole } from "@/components/auth/AccessProvider";
import { isDevDemoMode } from "@/lib/dev-demo";
import { PageScreen } from "@/components/adaline/PageScreen";
import DashboardParcelleStockPanel from "@/components/dashboard/DashboardParcelleStockPanel";
import DashboardMagasinierOverlay from "@/components/dashboard/DashboardMagasinierOverlay";
import AgronomeMapOverlay from "@/components/dashboard/agronome/AgronomeMapOverlay";
import DirecteurDashboard from "@/components/dashboard/directeur/DirecteurDashboard";
import OperateurDashboard from "@/components/dashboard/operateur/OperateurDashboard";
import AuditeurDashboard from "@/components/dashboard/auditeur/AuditeurDashboard";
import ConsultantDashboard from "@/components/dashboard/consultant/ConsultantDashboard";
import DashboardRoleSwitcher from "@/components/dashboard/DashboardRoleSwitcher";
import { MagRoleChip } from "@/components/magasinier/MagRouteMeta";
import { AgRoleChip } from "@/components/agronome/AgRouteMeta";
import WeatherMapHud from "@/components/dashboard/WeatherMapHud";
import DashboardKpiStrip from "@/components/dashboard/DashboardKpiStrip";
import DashboardEmptyMapState from "@/components/dashboard/DashboardEmptyMapState";
import DashboardTreatmentsPanel from "@/components/dashboard/DashboardTreatmentsPanel";
import DashboardSatellitePanel from "@/components/dashboard/DashboardSatellitePanel";
import DashboardParcelleHistoryPanel from "@/components/map/DashboardParcelleHistoryPanel";
import InlineBanner from "@/components/ui/InlineBanner";
import { Button } from "@/components/ui/button-1";
import { cn } from "@/lib/utils";
import { useDashboardPage, DASH_DRAWER_WIDTH } from "@/components/dashboard/useDashboardPage";

const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[120px] rounded-[6.08px] border border-fog-border bg-canvas flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-graphite" />
    </div>
  ),
});

export default function DashboardView() {
  const d = useDashboardPage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: accessLoading, refresh } = useAccessContext();
  const isMagasinier = profile?.role === "magasinier";
  const isAgronome = profile?.role === "agronome";
  const isOperateur = profile?.role === "operateur";
  const isResponsableTechnique = profile?.role === "responsable_technique";
  const isDirecteur = profile?.role === "directeur" || isResponsableTechnique;
  const isAuditeur = profile?.role === "auditeur";
  const isConsultant = profile?.role === "consultant";
  const setHeaderActions = useSetHeaderActions();
  const showDevRoleTools = isDevDemoMode() && !isAgronome && !isMagasinier && !isOperateur;

  useEffect(() => {
    if (!isDevDemoMode()) return;
    const roleParam = searchParams.get("role");
    if (roleParam === "agronome" || roleParam === "magasinier" || roleParam === "directeur") {
      setDemoRole(roleParam);
      void refresh();
    }
  }, [searchParams, refresh]);

  // Preload satellite data for roles that use it directly on the dashboard
  const needsSatellitePreload = isAgronome || isConsultant;
  useEffect(() => {
    if (needsSatellitePreload && d.satelliteData.length === 0 && !d.satelliteLoading && !d.satelliteError) {
      void d.loadSatellite();
    }
  }, [needsSatellitePreload, d.satelliteData.length, d.satelliteLoading, d.satelliteError, d.loadSatellite]);

  useEffect(() => {
    const hasRoleChip = isMagasinier || isAgronome || isOperateur;
    setHeaderActions(
      <>
        {!isMagasinier && !isOperateur && (
          <FeatureGate feature="treatments.plan">
            <Button variant="primary" size="md" asChild>
              <Link href="/treatments">
                <Plus className="w-4 h-4" />
                Planifier un traitement
              </Link>
            </Button>
          </FeatureGate>
        )}
        {isMagasinier && <MagRoleChip />}
        {isAgronome && <AgRoleChip />}
        <Button
          variant={hasRoleChip ? "outline" : "ghost"}
          size={hasRoleChip ? "md" : "icon"}
          onClick={() => void d.loadKpis()}
          title="Actualiser les indicateurs"
          aria-label="Actualiser"
        >
          <RefreshCw className={cn("w-4 h-4", d.loading && "animate-spin")} />
          {hasRoleChip && <span>Actualiser</span>}
        </Button>
      </>
    );
    return () => setHeaderActions(null);
  }, [d.loading, d.loadKpis, isMagasinier, isAgronome, isOperateur, setHeaderActions]);

  if (accessLoading) {
    return (
      <PageScreen className="dashboard-screen flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-graphite" aria-label="Chargement du profil" />
      </PageScreen>
    );
  }

  // ── Role-specific full-page dashboards (replace map as primary content) ──
  if (isDirecteur)
    return (
      <DirecteurDashboard
        kpis={d.kpis}
        loading={d.loading}
        onRefresh={d.loadKpis}
        variant={isResponsableTechnique ? "responsable_technique" : "directeur"}
      />
    );
  if (isOperateur)
    return <OperateurDashboard kpis={d.kpis} />;
  if (isAuditeur)
    return <AuditeurDashboard kpis={d.kpis} />;
  if (isConsultant)
    return (
      <ConsultantDashboard
        kpis={d.kpis}
        satelliteData={d.satelliteForMap}
        onLoadSatellite={d.loadSatellite}
        satelliteLoading={d.satelliteLoading}
      />
    );

  return (
    <>
      {d.showAccessBanner && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-[6.08px] bg-canvas border border-fog-border text-sm text-void">
          <span>Vous n&apos;avez pas accès à cette page avec votre profil actuel.</span>
          <button
            type="button"
            onClick={() => d.setShowAccessBanner(false)}
            className="text-graphite hover:text-void font-medium text-lg leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}
      <PageScreen className="dashboard-screen">
        {showDevRoleTools && (
          <div className="px-4 pt-2 shrink-0 max-w-[1200px] w-full mx-auto">
            <DashboardRoleSwitcher />
          </div>
        )}

        {d.kpiError && (
          <div className="px-4 pt-3 shrink-0 max-w-[1200px] w-full mx-auto">
            <InlineBanner tone="warn">
              Impossible de charger les indicateurs.{" "}
              <button type="button" className="underline font-medium" onClick={() => d.loadKpis()}>
                Réessayer
              </button>
            </InlineBanner>
          </div>
        )}

        {!isMagasinier && !isAgronome && !isOperateur && (
          <div className="max-w-[1200px] w-full mx-auto px-1">
            <DashboardKpiStrip kpis={d.kpis} loading={d.loading} />
          </div>
        )}

        <div
          className={cn(
            "dash-workspace",
            isMagasinier && "dash-workspace--magasinier",
            isAgronome && "dash-workspace--agronome",
            isOperateur && "dash-workspace--operateur",
            isDirecteur && "dash-workspace--directeur",
            d.drawerOpen && "dash-workspace--drawer-open"
          )}
        >
          <div className={cn("parc-map-shell dash-map-shell", d.drawerOpen && "parc-map-shell--open")}>
            <div className="parc-map-canvas dash-map-stage">
              <div className="dash-map-bg">
                <div className="dash-mini-map">
                  <DashboardMap
                    key={isAgronome ? "agronome" : isMagasinier ? "magasinier" : "default"}
                    embedded
                    activeTreatmentId={d.activeTreatmentId}
                    focusParcelleId={d.focusParcelleId}
                    selectedParcelleId={d.mapSelectedParcelleId}
                    onSelectedParcelleIdChange={d.handleMapParcelleSelect}
                    historyPanelExternal
                    detailPanelOpen={d.drawerOpen}
                    detailPanelWidth={DASH_DRAWER_WIDTH}
                    onSelectTreatment={d.handleMapTreatmentSelect}
                    weatherMode={d.weatherMode}
                    weatherLayers={d.weatherLayers}
                    weatherOpacity={d.weatherOpacity}
                    onWeatherData={d.handleWeatherData}
                    stockLabels={isMagasinier}
                    satelliteMode={isAgronome && d.hasSatelliteIndices}
                    satelliteData={d.satelliteForMap}
                    satelliteIndex={d.satelliteIndex}
                    hideQuickNav={isMagasinier || isAgronome || isOperateur || isDirecteur}
                  />
                </div>
              </div>

              {!d.loading && d.parcelles.length === 0 && <DashboardEmptyMapState />}

              {d.weatherMode && (
                <WeatherMapHud
                  weather={d.weatherData}
                  loading={d.weatherLoading}
                  layers={d.weatherLayers}
                  opacity={d.weatherOpacity}
                  onLayersChange={d.setWeatherLayers}
                  onOpacityChange={d.setWeatherOpacity}
                  onClose={() => d.setOpenPanel(null)}
                />
              )}

              {!isMagasinier && !isAgronome && !isOperateur && !isDirecteur && !isAuditeur && !isConsultant && (
                <div className="dash-map-fabs">
                  <Button
                    type="button"
                    variant={d.openPanel === "treatments" ? "mono" : "outline"}
                    size="sm"
                    className="rounded-full shadow-sm"
                    onClick={d.toggleTreatmentsPanel}
                    aria-pressed={d.openPanel === "treatments"}
                  >
                    <ClipboardList className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Derniers traitements</span>
                  </Button>
                  <Button
                    type="button"
                    variant={d.weatherMode ? "mono" : "outline"}
                    size="sm"
                    className="rounded-full shadow-sm"
                    onClick={d.toggleWeatherMode}
                    aria-pressed={d.weatherMode}
                  >
                    <CloudSun className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Météo</span>
                  </Button>
                </div>
              )}

              {isMagasinier && <DashboardMagasinierOverlay />}

              {isAgronome && (
                <AgronomeMapOverlay
                  parcelles={d.parcelles}
                  satelliteData={d.satelliteForMap}
                  satelliteLoading={d.satelliteLoading}
                  satelliteIndex={d.satelliteIndex}
                  onSatelliteIndexChange={d.setSatelliteIndex}
                  kpis={d.kpis}
                  onOpenSatellite={d.toggleSatellitePanel}
                  onOpenTreatments={d.toggleTreatmentsPanel}
                  onOpenMeteo={() => router.push("/meteo")}
                />
              )}
            </div>

            <aside className="parc-map-drawer dash-map-drawer" aria-hidden={!d.drawerOpen}>
              <div className="parc-map-drawer-inner dash-drawer-inner">
                {d.drawerParcelle && d.drawerOpen &&
                  (isMagasinier ? (
                    <DashboardParcelleStockPanel
                      parcelle={d.drawerParcelle}
                      treatments={d.treatments}
                      onClose={d.closeParcelleDrawer}
                    />
                  ) : (
                    <DashboardParcelleHistoryPanel
                      variant="drawer"
                      parcelle={d.drawerParcelle}
                      history={d.historyBundle}
                      loading={d.historyLoading}
                      onClose={d.closeParcelleDrawer}
                    />
                  ))}

              </div>
            </aside>
          </div>
        </div>

        <DashboardTreatmentsPanel
          open={d.openPanel === "treatments"}
          onClose={() => d.setOpenPanel(null)}
          treatments={d.treatments}
          parcelles={d.parcelles}
          activeTreatmentId={d.activeTreatmentId}
          onSelectTreatment={d.handleTreatmentRowSelect}
        />

        <DashboardSatellitePanel
          open={d.openPanel === "satellite"}
          onClose={() => d.setOpenPanel(null)}
          data={d.satelliteForMap}
          loading={d.satelliteLoading}
          index={d.satelliteIndex}
          onIndexChange={d.setSatelliteIndex}
          onRefresh={d.loadSatellite}
        />
      </PageScreen>
    </>
  );
}
