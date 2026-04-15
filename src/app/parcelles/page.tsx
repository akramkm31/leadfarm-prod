"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import ScheduleTreatmentModal from "@/components/treatments/ScheduleTreatmentModal";
import { useParcelles, useTreatments } from "@/hooks/useData";
import { insertParcelle, updateParcelle, deleteParcelle } from "@/lib/data-provider";
import {
  cultureTypeLabels,
  irrigationLabels,
  type Parcelle,
  type Treatment,
  type CultureType,
} from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import {
  Map,
  Plus,
  Layers,
  ChevronRight,
  ChevronDown,
  Droplets,
  Calendar,
  Wheat,
  MapPin,
  X,
  TreePine,
  Grape,
  SproutIcon,
  Info,
  Pencil,
  Undo2,
  Check,
  Trash2,
  Save,
  Loader2,
  Square,
  Shapes,
  Navigation,
} from "lucide-react";
import type { DrawTool } from "@/components/map/ParcelleMap";

const ParcelleMap = dynamic(() => import("@/components/map/ParcelleMap"), {
  ssr: false,
  loading: () => (
    <div className="glass-card h-[500px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
  ),
});

const cultureIcons: Record<string, typeof TreePine> = {
  arboriculture: TreePine,
  oleiculture: TreePine,
  viticulture: Grape,
  cereales: Wheat,
  maraichage: SproutIcon,
  agrumes: TreePine,
  autre: Wheat,
};

export default function ParcellesPage() {
  const { data: parcellesRaw, loading: parcellesLoading, refetch: refetchParcelles } = useParcelles();
  const { data: treatmentsRaw, loading: treatmentsLoading } = useTreatments();
  const baseParcelles = (parcellesRaw || []) as Parcelle[];
  const treatments = (treatmentsRaw || []) as Treatment[];

  const [localParcelles, setLocalParcelles] = useState<Parcelle[]>([]);
  const baseIds = new Set(baseParcelles.map((p) => p.id));
  const parcelles = [...baseParcelles, ...localParcelles.filter((lp) => !baseIds.has(lp.id))];

  const [expandedParcelle, setExpandedParcelle] = useState<string | null>("p-001");
  const [selectedParcelle, setSelectedParcelle] = useState<Parcelle | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>("polygon");
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [newParcelle, setNewParcelle] = useState({ name: "", cropType: "", color: "#10b981" });
  const [drawingParentId, setDrawingParentId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; name: string; cropType: string; color: string }>({ open: false, name: "", cropType: "", color: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [mapOverlayChild, setMapOverlayChild] = useState<{ child: Parcelle; parent: Parcelle } | null>(null);

  const startDrawingSubParcelle = useCallback((parent: Parcelle): void => {
    setDrawingParentId(parent.id);
    setNewParcelle({ name: "", cropType: parent.cropType, color: parent.color });
    setDrawMode(true);
    setDrawTool("polygon");
    setDrawnPoints([]);
    setShowDrawForm(false);
  }, []);

  const startDrawingParcelle = useCallback((): void => {
    setDrawingParentId(null);
    setNewParcelle({ name: "", cropType: "", color: "#10b981" });
    setDrawMode(true);
    setDrawnPoints([]);
    setShowDrawForm(false);
  }, []);

  const handleMapClick = useCallback((lat: number, lon: number): void => {
    if (!drawMode) return;
    setDrawnPoints((prev) => [...prev, [lat, lon]]);
  }, [drawMode]);

  const handlePointUpdate = useCallback((index: number, lat: number, lon: number): void => {
    setDrawnPoints((prev) => {
      const next = [...prev];
      next[index] = [lat, lon];
      return next;
    });
  }, []);

  // Use ref-based check to avoid stale closure
  const handleSnapClose = useCallback((): void => {
    setDrawnPoints((current) => {
      if (current.length >= 3) {
        // Schedule form show after state update
        setTimeout(() => setShowDrawForm(true), 0);
      }
      return current;
    });
  }, []);

  // ═══ GPS Walk Mode: add current geolocation as a vertex ═══
  const addGpsPoint = useCallback((): void => {
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée sur cet appareil");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDrawnPoints((prev) => [...prev, [pos.coords.latitude, pos.coords.longitude]]);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? "Autorisation GPS refusée"
            : err.code === 2
              ? "Position indisponible"
              : "Délai GPS dépassé"
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Shape complete (rectangle mode): replace all drawn points
  const handleShapeComplete = useCallback((points: [number, number][]): void => {
    setDrawnPoints(points);
  }, []);

  const switchTool = (tool: DrawTool): void => {
    setDrawTool(tool);
    setDrawnPoints([]);
    setGpsError(null);
  };

  const undoLastPoint = useCallback((): void => {
    setDrawnPoints((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (inField) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoLastPoint();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        undoLastPoint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawMode, undoLastPoint]);
  const clearDrawing = (): void => { setDrawnPoints([]); setShowDrawForm(false); };
  const finishDrawing = (): void => {
    if (drawnPoints.length >= 3) setShowDrawForm(true);
  };
  const cancelDraw = (): void => { setDrawMode(false); setDrawnPoints([]); setShowDrawForm(false); setSaveStatus(null); setDrawingParentId(null); setShowQuitConfirm(false); };
  const safeCancelDraw = (): void => {
    if (drawnPoints.length > 0) { setShowQuitConfirm(true); return; }
    cancelDraw();
  };
  const deletePoint = useCallback((index: number): void => {
    setDrawnPoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  const saveParcelle = async () => {
    if (!newParcelle.name.trim()) {
      setSaveStatus("error");
      return;
    }
    if (drawnPoints.length < 3) return;

    setSaving(true);
    setSaveStatus(null);
    try {
      const center: [number, number] = [
        drawnPoints.reduce((s, p) => s + p[0], 0) / drawnPoints.length,
        drawnPoints.reduce((s, p) => s + p[1], 0) / drawnPoints.length,
      ];
      const areaHa = parseFloat(computeArea(drawnPoints).toFixed(2));

      const result = await insertParcelle({
        name: newParcelle.name.trim(),
        cropType: newParcelle.cropType || "Non défini",
        color: newParcelle.color,
        boundary: drawnPoints,
        areaHectares: areaHa,
        center,
        parentId: drawingParentId,
      });

      const created: Parcelle = {
        id: result?.id || `p-${Date.now()}`,
        name: newParcelle.name.trim(),
        parentId: drawingParentId,
        exploitationId: "exp-001",
        areaHectares: areaHa,
        cropType: newParcelle.cropType || "Non défini",
        variete: "",
        cultureType: "arboriculture",
        soilType: "Non défini",
        site: "Ferme Principale",
        zone: "Nouvelle Zone",
        secteur: "Nouveau Secteur",
        irrigation: "aucune",
        center,
        boundary: drawnPoints,
        color: newParcelle.color,
        children: [],
        lastTreatmentDate: null,
        treatmentCount: 0,
      };
      setLocalParcelles((prev) => {
        if (!drawingParentId) return [...prev, created];
        return prev.map((p) =>
          p.id === drawingParentId ? { ...p, children: [...(p.children || []), created] } : p
        );
      });
      setSaveStatus("success");

      // Show success briefly, then clean up
      setTimeout(() => {
        cancelDraw();
        setNewParcelle({ name: "", cropType: "", color: "#10b981" });
        refetchParcelles?.();
      }, 800);
    } catch (err) {
      console.error("Erreur création parcelle:", err);
      setSaveStatus("error");
      setSaving(false);
    }
  };

  if (parcellesLoading || treatmentsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-sm text-white/55">Chargement des parcelles...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalArea = parcelles.reduce((a, p) => a + (p.areaHectares || 0), 0);
  const totalChildren = parcelles.reduce((a, p) => a + (p.children?.length || 0), 0);
  const liveArea = drawnPoints.length >= 3 ? computeArea(drawnPoints) : 0;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Parcelles</h1>
            <p className="text-sm text-white/60 mt-1">
              {parcelles.length} parcelles · {totalChildren} sous-parcelles · {formatHectares(totalArea)} total
            </p>
          </div>
          {!drawMode ? (
            <button
              onClick={startDrawingParcelle}
              className="glass-button px-5 py-2.5 flex items-center gap-2.5 text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Dessiner une parcelle
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Tool switcher */}
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-black/40 border border-white/10">
                {([["polygon", Shapes, "Polygone"], ["rectangle", Square, "Rectangle"], ["gps", Navigation, "GPS"]] as const).map(([tool, Icon, label]) => (
                  <button
                    key={tool}
                    onClick={() => switchTool(tool as DrawTool)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all flex-1 justify-center sm:flex-initial",
                      drawTool === tool
                        ? "bg-amber-500/20 text-amber-300 shadow-sm"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2">
                {/* Live badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/10">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: newParcelle.color }} />
                  <span className="text-xs font-mono text-white/60">
                    {drawnPoints.length} pts
                    {liveArea > 0 && <span className="text-amber-400 ml-2">{liveArea.toFixed(2)} ha</span>}
                  </span>
                </div>

                {drawTool !== "rectangle" && (
                  <button
                    onClick={undoLastPoint}
                    disabled={drawnPoints.length === 0}
                    className="px-3 py-2 text-xs rounded-xl bg-white/[0.06] border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/[0.1] disabled:opacity-30 flex items-center gap-1.5 transition-all"
                    title="Ctrl+Z ou Backspace"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Annuler pt</span>
                  </button>
                )}

                <button
                  onClick={finishDrawing}
                  disabled={drawnPoints.length < 3}
                  className="px-3 py-2 text-xs rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  {drawnPoints.length >= 3 ? "Terminer" : `${3 - drawnPoints.length} pts`}
                </button>

                <button
                  onClick={safeCancelDraw}
                  className="px-3 py-2 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center gap-1.5 transition-all"
                >
                  <X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Quitter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contextual step hint */}
      {drawMode && !showDrawForm && drawTool !== "gps" && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-green-500/10 border border-amber-500/20 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-amber-400">{Math.min(drawnPoints.length + 1, 4)}</span>
          </div>
          <p className="text-sm text-white/70">
            {drawTool === "rectangle" ? (
              "Cliquez-glissez sur la carte pour dessiner un rectangle"
            ) : drawnPoints.length === 0 ? (
              "Cliquez sur la carte pour placer le premier sommet"
            ) : drawnPoints.length === 1 ? (
              "Placez le deuxième point — glissez un sommet pour ajuster"
            ) : drawnPoints.length === 2 ? (
              "Encore 1 point minimum — ensuite cliquez le point ① pour fermer"
            ) : (
              <>Cliquez le point <strong className="text-amber-400">①</strong> (pulsant) pour fermer · <span className="text-white/40">Clic-droit sur un sommet pour le supprimer</span></>
            )}
          </p>
        </div>
      )}

      {/* KPIs */}
      {parcelles.length > 0 && !drawMode && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {parcelles.map((p: Parcelle) => {
            const CultureIcon = cultureIcons[p.cultureType] || Wheat;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedParcelle(p)}
                className={cn(
                  "glass-card p-4 cursor-pointer border-l-[3px] transition-all hover:scale-[1.02]",
                  selectedParcelle?.id === p.id && "border-amber-500/40"
                )}
                style={{ borderLeftColor: p.color || "#6b9e7a" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CultureIcon className="w-4 h-4" style={{ color: p.color || "#6b9e7a" }} />
                  <span className="text-xs font-semibold text-white/70 truncate">{p.name || p.cropType}</span>
                </div>
                <span className="text-lg font-bold text-white/90 font-mono">{formatHectares(p.areaHectares)}</span>
                <span className="text-[10px] text-white/50 block">{p.cropType}{p.variete ? ` · ${p.variete}` : ""}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {parcelles.length === 0 && !drawMode && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px] mb-6">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500/15 to-amber-500/10 border border-white/10 flex items-center justify-center empty-state-icon">
              <Map className="w-14 h-14 text-emerald-400/40" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400/60" />
            </div>
            <div className="absolute -top-2 -left-2 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/15 to-green-600/10 border border-green-500/15 flex items-center justify-center">
              <Wheat className="w-4 h-4 text-green-400/50" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white/80 mb-2">Cartographiez votre exploitation</h3>
          <p className="text-sm text-white/50 max-w-sm mb-8 leading-relaxed">
            Dessinez vos parcelles sur la carte interactive pour suivre vos cultures, planifier les traitements et gérer vos surfaces agricoles.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button onClick={startDrawingParcelle} className="glass-button px-6 py-3 flex items-center gap-2.5 text-sm font-semibold">
              <Pencil className="w-4 h-4" />
              Dessiner ma première parcelle
            </button>
            <div className="flex items-center gap-6 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Géolocalisation</span>
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Sous-parcelles</span>
              <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Irrigation</span>
            </div>
          </div>
        </div>
      )}

      {/* Map + embedded save form */}
      <div className="mb-6 relative">
        <ParcelleMap
          onParcelleClick={(id: string) => {
            if (drawMode) return;
            const all = parcelles.flatMap((p: Parcelle) => [p, ...(p.children || [])]);
            const found = all.find((p: Parcelle) => p.id === id);
            if (found) setSelectedParcelle(found);
          }}
          onChildParcelleClick={(childId: string, parentId: string) => {
            if (drawMode) return;
            const parent = parcelles.find((p: Parcelle) => p.id === parentId);
            const child = parent?.children?.find((c: Parcelle) => c.id === childId);
            if (child && parent) {
              setMapOverlayChild({ child, parent });
            }
          }}
          onCreateSubParcelle={(parentId: string) => {
            const parent = parcelles.find((p: Parcelle) => p.id === parentId);
            if (parent) {
              startDrawingSubParcelle(parent);
              setSelectedParcelle(null);
            }
          }}
          drawMode={drawMode}
          drawTool={drawTool}
          drawnPoints={drawnPoints}
          onMapClick={handleMapClick}
          onPointUpdate={handlePointUpdate}
          onSnapClose={handleSnapClose}
          onShapeComplete={handleShapeComplete}
          onStartDraw={startDrawingParcelle}
          onPointDelete={deletePoint}
          drawColor={newParcelle.color}
          hideHud={showDrawForm}
          constrainBoundary={drawingParentId ? parcelles.find((p) => p.id === drawingParentId)?.boundary : undefined}
        />

        {/* ═══ SOUS-PARCELLE MAP OVERLAY SIDEBAR ═══ */}
        {mapOverlayChild && (
          <div
            className="absolute top-0 right-0 bottom-0 z-[1100] w-80 flex flex-col animate-slide-in-right"
            style={{ pointerEvents: "auto" }}
          >
            <div className="h-full m-3 ml-0 rounded-2xl bg-[#0d1a0d]/92 backdrop-blur-2xl border border-white/[0.12] shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
              {/* Header with color accent */}
              <div className="relative p-4 pb-3">
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${mapOverlayChild.child.color}, ${mapOverlayChild.child.color}80)` }}
                />
                <div className="flex items-start justify-between mt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: mapOverlayChild.child.color,
                        backgroundColor: mapOverlayChild.child.color + "20",
                      }}
                    >
                      <Layers className="w-5 h-5" style={{ color: mapOverlayChild.child.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white/90 truncate">{mapOverlayChild.child.name}</h3>
                      <p className="text-[10px] text-white/40 truncate">
                        sous-parcelle de {mapOverlayChild.parent.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMapOverlayChild(null)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-lg font-bold text-amber-400 font-mono block">{formatHectares(mapOverlayChild.child.areaHectares)}</span>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider">Surface</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-lg font-bold text-cyan-400 font-mono block">{mapOverlayChild.child.treatmentCount ?? 0}</span>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider">Traitements</span>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                <div className="space-y-0">
                  <DetailRow label="Culture" value={mapOverlayChild.child.cropType || "—"} />
                  <DetailRow label="Variété" value={mapOverlayChild.child.variete || "—"} highlight="amber" />
                  <DetailRow label="Sol" value={mapOverlayChild.child.soilType || "—"} />
                  <DetailRow label="Irrigation" value={irrigationLabels[mapOverlayChild.child.irrigation] || mapOverlayChild.child.irrigation || "—"} />
                  {mapOverlayChild.child.densitePlantation && (
                    <DetailRow label="Densité" value={`${mapOverlayChild.child.densitePlantation} ${mapOverlayChild.child.densiteUnit}`} highlight="cyan" />
                  )}
                  <DetailRow label="Dernier traitement" value={
                    mapOverlayChild.child.lastTreatmentDate
                      ? new Date(mapOverlayChild.child.lastTreatmentDate).toLocaleDateString("fr-FR")
                      : "Jamais"
                  } />
                  <DetailRow label="Secteur" value={mapOverlayChild.child.secteur || "—"} />
                </div>

                {/* Recent treatments */}
                {treatments.filter((t: Treatment) => t.sousParcelleId === mapOverlayChild.child.id).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Droplets className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-semibold text-white/55 uppercase tracking-wider">Récents</span>
                    </div>
                    <div className="space-y-1.5">
                      {treatments
                        .filter((t: Treatment) => t.sousParcelleId === mapOverlayChild.child.id)
                        .slice(0, 3)
                        .map((t: Treatment) => (
                          <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div>
                              <span className="text-[11px] text-white/60">{t.products[0]?.productName || t.type}</span>
                              <span className="text-[9px] text-white/35 block">{new Date(t.plannedDate).toLocaleDateString("fr-FR")}</span>
                            </div>
                            <span className={cn(
                              "badge text-[9px]",
                              t.status === "completed" ? "badge-success" :
                              t.status === "in_progress" ? "badge-warning" :
                              t.status === "planned" ? "badge-info" : "badge-danger"
                            )}>
                              {t.status === "completed" ? "Terminé" :
                               t.status === "in_progress" ? "En cours" :
                               t.status === "planned" ? "Planifié" : "Annulé"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-3 border-t border-white/[0.08] space-y-2">
                <button
                  onClick={() => {
                    setSelectedParcelle(mapOverlayChild.child);
                    setMapOverlayChild(null);
                    setScheduleOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-2"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  Planifier un traitement
                </button>
                <button
                  onClick={() => {
                    setSelectedParcelle(mapOverlayChild.child);
                    setMapOverlayChild(null);
                  }}
                  className="w-full py-2 text-[11px] font-medium rounded-xl border border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Info className="w-3 h-3" />
                  Voir tous les détails
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ GPS Walk mode: giant tap-to-add-position button ═══ */}
        {drawMode && drawTool === "gps" && !showDrawForm && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-3 pointer-events-none">
            <button
              onClick={addGpsPoint}
              disabled={gpsLoading}
              className="pointer-events-auto group relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/90 to-amber-600/90 border-3 border-white/90 shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
            >
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
              {gpsLoading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin relative z-10" />
              ) : (
                <Navigation className="w-8 h-8 text-white drop-shadow-lg relative z-10" />
              )}
            </button>
            <div className="pointer-events-auto bg-black/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 max-w-xs text-center">
              <p className="text-xs text-white/80 font-medium">
                {drawnPoints.length === 0
                  ? "Marchez au premier coin de votre parcelle"
                  : `Point ${drawnPoints.length} enregistré · Marchez au coin suivant`}
              </p>
              {gpsError && (
                <p className="text-[10px] text-red-400 mt-1">{gpsError}</p>
              )}
            </div>
          </div>
        )}

        {/* Floating save form — inside the map, bottom bar */}
        {showDrawForm && (
          <div className={cn(
            "absolute bottom-3 left-3 right-3 z-[1000] rounded-2xl shadow-2xl shadow-black/50 transition-all duration-300",
            saveStatus === "success"
              ? "bg-green-900/90 border border-green-400/40 backdrop-blur-xl"
              : "bg-[#0d1f0d]/92 border border-white/15 backdrop-blur-xl"
          )}>
            {/* Success state */}
            {saveStatus === "success" ? (
              <div className="p-5 flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-sm font-semibold text-green-300">Parcelle enregistrée avec succès !</span>
              </div>
            ) : (
              <div className="p-4">
                {drawingParentId && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] text-amber-300 font-medium">
                      Sous-parcelle de{" "}
                      <span className="font-bold">
                        {parcelles.find((p) => p.id === drawingParentId)?.name || "—"}
                      </span>
                    </span>
                  </div>
                )}
                {/* Row 1: Stats + edit link */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: newParcelle.color, boxShadow: `0 0 8px ${newParcelle.color}60` }} />
                    <span className="text-xs font-mono text-white/60">
                      <span className="text-amber-400 font-bold">{computeArea(drawnPoints).toFixed(2)} ha</span>
                      <span className="text-white/30 mx-1.5">·</span>
                      {drawnPoints.length} pts
                      <span className="text-white/30 mx-1.5">·</span>
                      {computePerimeter(drawnPoints).toFixed(0)} m
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDrawForm(false)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/[0.08] transition-all"
                  >
                    <Pencil className="w-3 h-3" /> Modifier tracé
                  </button>
                </div>

                {/* Row 2: Name input (full width, prominent) */}
                <div className="mb-3">
                  <input
                    type="text"
                    className={cn(
                      "w-full px-4 py-3 text-sm rounded-xl bg-black/40 border text-white placeholder-white/30 outline-none transition-all",
                      saveStatus === "error" && !newParcelle.name.trim()
                        ? "border-red-500/50 ring-1 ring-red-500/30"
                        : "border-white/15 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
                    )}
                    placeholder="Nom de la parcelle (obligatoire)"
                    value={newParcelle.name}
                    onChange={(e) => { setNewParcelle({ ...newParcelle, name: e.target.value }); setSaveStatus(null); }}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveParcelle(); if (e.key === "Escape") cancelDraw(); }}
                  />
                  {saveStatus === "error" && !newParcelle.name.trim() && (
                    <span className="text-[10px] text-red-400 mt-1 block pl-1">Veuillez saisir un nom</span>
                  )}
                </div>

                {/* Row 3: Culture + Colors + Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    className="px-3 py-2 text-xs rounded-xl bg-black/30 border border-white/15 text-white/70 outline-none focus:border-amber-500/30 w-[130px]"
                    value={newParcelle.cropType}
                    onChange={(e) => setNewParcelle({ ...newParcelle, cropType: e.target.value })}
                  >
                    <option value="">Culture...</option>
                    <option value="Pommier">Pommier</option>
                    <option value="Olivier">Olivier</option>
                    <option value="Vigne">Vigne</option>
                    <option value="Agrumes">Agrumes</option>
                    <option value="Maraîchage">Maraîchage</option>
                    <option value="Céréales">Céréales</option>
                  </select>

                  <div className="flex items-center gap-1">
                    {["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewParcelle({ ...newParcelle, color: c })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all",
                          newParcelle.color === c ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-90"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="flex-1" />

                  <button
                    onClick={cancelDraw}
                    className="px-3 py-2 text-xs rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                  >
                    Annuler
                  </button>

                  <button
                    onClick={saveParcelle}
                    disabled={saving}
                    className={cn(
                      "px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2 transition-all",
                      newParcelle.name.trim()
                        ? "bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30"
                        : "bg-white/[0.06] border border-white/10 text-white/40"
                    )}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Parcelle tree */}
        <div className={cn(selectedParcelle ? "col-span-12 lg:col-span-7" : "col-span-12")}>
          <div className="space-y-3">
            {parcelles.map((parcelle: Parcelle) => {
              const isExpanded = expandedParcelle === parcelle.id;
              const hasChildren = parcelle.children && parcelle.children.length > 0;

              return (
                <div key={parcelle.id}>
                  <div
                    className={cn(
                      "glass-card p-5 cursor-pointer transition-all",
                      selectedParcelle?.id === parcelle.id && "border-amber-500/30"
                    )}
                    onClick={() => setSelectedParcelle(parcelle)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {hasChildren && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedParcelle(isExpanded ? null : parcelle.id);
                            }}
                            className="p-1 rounded-lg hover:bg-white/[0.06]"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-white/55" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-white/55" />
                            )}
                          </button>
                        )}
                        <div
                          className="w-4 h-4 rounded-md border-2"
                          style={{ borderColor: parcelle.color || "#6b9e7a", backgroundColor: (parcelle.color || "#6b9e7a") + "20" }}
                        />
                        <div>
                          <span className="text-sm font-semibold text-white/85">{parcelle.name}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-white/50 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
                              {cultureTypeLabels[parcelle.cultureType as CultureType] || parcelle.cultureType || "—"}
                            </span>
                            <span className="text-[10px] text-white/50">{parcelle.variete}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-amber-400 font-mono">
                          {formatHectares(parcelle.areaHectares)}
                        </span>
                        {hasChildren && (
                          <span className="badge badge-info text-[10px]">
                            <Layers className="w-3 h-3 mr-1" />
                            {parcelle.children!.length} sous-parcelles
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs text-white/55">
                          <span className="text-white/60 font-mono">{parcelle.treatmentCount}</span> traitements
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-xs text-white/55">
                          {parcelle.lastTreatmentDate
                            ? new Date(parcelle.lastTreatmentDate).toLocaleDateString("fr-FR")
                            : "Jamais traité"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-xs text-white/55">{parcelle.zone || "—"} · {parcelle.secteur || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-white/55">{irrigationLabels[parcelle.irrigation] || parcelle.irrigation || "—"}</span>
                      </div>
                    </div>

                    {!parcelle.lastTreatmentDate && (
                      <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[10px] text-amber-400">
                          Aucun traitement enregistré — planifiez un traitement
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sub-parcelles */}
                  {isExpanded && hasChildren && (
                    <div className="ml-8 mt-2 space-y-2 border-l-2 border-white/[0.08] pl-4">
                      {parcelle.children!.map((child: Parcelle) => (
                        <div
                          key={child.id}
                          onClick={() => setSelectedParcelle(child)}
                          className={cn(
                            "glass-card p-4 cursor-pointer transition-all",
                            selectedParcelle?.id === child.id && "border-amber-500/30"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ borderColor: child.color || "#6b9e7a", backgroundColor: (child.color || "#6b9e7a") + "20", border: `1.5px solid ${child.color || "#6b9e7a"}` }}
                              />
                              <span className="text-xs font-semibold text-white/70">{child.name}</span>
                              <span className="text-[10px] text-white/40">{child.variete}</span>
                            </div>
                            <span className="text-xs text-amber-400 font-mono">
                              {formatHectares(child.areaHectares)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-[10px] text-white/55">
                              {child.treatmentCount} traitements
                            </span>
                            <span className="text-[10px] text-white/40">
                              {child.lastTreatmentDate
                                ? `Dernier: ${new Date(child.lastTreatmentDate).toLocaleDateString("fr-FR")}`
                                : "Jamais traité"}
                            </span>
                            <span className="text-[10px] text-white/35">{child.secteur}</span>
                            {child.densitePlantation && (
                              <span className="text-[10px] text-white/35">{child.densitePlantation} {child.densiteUnit}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedParcelle && (
          <div className="col-span-12 lg:col-span-5">
            <div className="glass-card p-6 sticky top-[90px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-lg border-2"
                    style={{ borderColor: selectedParcelle.color || "#6b9e7a", backgroundColor: (selectedParcelle.color || "#6b9e7a") + "20" }}
                  />
                  <h3 className="text-lg font-bold text-white/85">{selectedParcelle.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedParcelle(null)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-white/40 hover:text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!selectedParcelle.parentId && (
                <button
                  onClick={() => { startDrawingSubParcelle(selectedParcelle); setSelectedParcelle(null); }}
                  className="w-full mb-5 glass-button py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
                  style={{ borderColor: `${selectedParcelle.color}55` }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Dessiner une sous-parcelle
                </button>
              )}

              <SectionTitle icon={Wheat} title="Culture" />
              <div className="space-y-0 mb-5">
                <DetailRow label="Type de culture" value={cultureTypeLabels[selectedParcelle.cultureType as CultureType] || selectedParcelle.cultureType || "—"} />
                <DetailRow label="Culture" value={selectedParcelle.cropType || "—"} />
                <DetailRow label="Variété" value={selectedParcelle.variete || "—"} highlight="amber" />
                <DetailRow label="Surface" value={formatHectares(selectedParcelle.areaHectares)} highlight="amber" />
                <DetailRow label="Sol" value={selectedParcelle.soilType || "—"} />
                <DetailRow label="Irrigation" value={irrigationLabels[selectedParcelle.irrigation] || selectedParcelle.irrigation || "—"} />
                {selectedParcelle.densitePlantation && (
                  <DetailRow label="Densité plantation" value={`${selectedParcelle.densitePlantation} ${selectedParcelle.densiteUnit}`} highlight="cyan" />
                )}
                {selectedParcelle.dateImplantation && (
                  <DetailRow label="Date implantation" value={new Date(selectedParcelle.dateImplantation).toLocaleDateString("fr-FR")} />
                )}
              </div>

              <SectionTitle icon={MapPin} title="Localisation" />
              <div className="space-y-0 mb-5">
                <DetailRow label="Site" value={selectedParcelle.site || "—"} />
                <DetailRow label="Zone" value={selectedParcelle.zone || "—"} />
                <DetailRow label="Secteur" value={selectedParcelle.secteur || "—"} />
                {selectedParcelle.altitude && (
                  <DetailRow label="Altitude" value={`${selectedParcelle.altitude} m`} />
                )}
                {selectedParcelle.parentId && (
                  <DetailRow label="Parcelle parente" value={
                    parcelles.find(p => p.id === selectedParcelle.parentId)?.name || "—"
                  } />
                )}
              </div>

              {/* Sous-parcelles selector */}
              {!selectedParcelle.parentId && selectedParcelle.children && selectedParcelle.children.length > 0 && (
                <>
                  <SectionTitle icon={Layers} title={`Sous-parcelles (${selectedParcelle.children.length})`} />
                  <div className="space-y-1.5 mb-5">
                    {selectedParcelle.children.map((child: Parcelle) => (
                      <button
                        key={`sp-${child.id}`}
                        onClick={() => setSelectedParcelle(child)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left group"
                      >
                        <div
                          className="w-3.5 h-3.5 rounded shrink-0"
                          style={{ backgroundColor: child.color || "#6b9e7a", border: `1.5px solid ${child.color || "#6b9e7a"}` }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-white/70 group-hover:text-white/90 block truncate">{child.name}</span>
                          <span className="text-[10px] text-white/40">{child.variete || child.cropType} · {formatHectares(child.areaHectares)}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              <SectionTitle icon={Droplets} title="Traitements" />
              <div className="space-y-0 mb-5">
                <DetailRow label="Nombre total" value={String(selectedParcelle.treatmentCount ?? 0)} />
                <DetailRow label="Dernier traitement" value={
                  selectedParcelle.lastTreatmentDate
                    ? new Date(selectedParcelle.lastTreatmentDate).toLocaleDateString("fr-FR")
                    : "Jamais"
                } />
              </div>

              {selectedParcelle.observations && (
                <>
                  <SectionTitle icon={Info} title="Observations" />
                  <p className="text-xs text-white/50 leading-relaxed mb-5">{selectedParcelle.observations}</p>
                </>
              )}

              <div className="border-t border-white/[0.1] pt-4">
                <h4 className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-3">
                  Traitements récents
                </h4>
                <div className="space-y-2">
                  {treatments
                    .filter((t: Treatment) => t.parcelleId === selectedParcelle.id || t.sousParcelleId === selectedParcelle.id)
                    .slice(0, 4)
                    .map((t: Treatment) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                        <div>
                          <span className="text-xs text-white/60">{t.products[0]?.productName}</span>
                          <span className="text-[10px] text-white/40 block">
                            {new Date(t.plannedDate).toLocaleDateString("fr-FR")}
                            {t.areaTreatedHectares && ` · ${formatHectares(t.areaTreatedHectares)}`}
                          </span>
                        </div>
                        <span className={cn(
                          "badge text-[10px]",
                          t.status === "completed" ? "badge-success" :
                          t.status === "in_progress" ? "badge-warning" :
                          t.status === "planned" ? "badge-info" : "badge-danger"
                        )}>
                          {t.status === "completed" ? "Terminé" :
                           t.status === "in_progress" ? "En cours" :
                           t.status === "planned" ? "Planifié" : "Annulé"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <button
                onClick={() => setScheduleOpen(true)}
                className="w-full glass-button py-2.5 text-sm mt-4 flex items-center justify-center gap-2"
              >
                <Droplets className="w-4 h-4" />
                Planifier un traitement
              </button>

              {/* Edit / Delete actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditModal({ open: true, name: selectedParcelle.name, cropType: selectedParcelle.cropType, color: selectedParcelle.color })}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3 h-3" />
                  Modifier
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-red-500/20 bg-red-500/[0.06] text-red-400/70 hover:bg-red-500/[0.12] hover:text-red-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="h-8" />
      <ScheduleTreatmentModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        initialParcelleName={selectedParcelle?.name}
      />

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuitConfirm(false)}>
          <div className="glass-card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-white/90 mb-1">Abandonner le dessin ?</h3>
            <p className="text-sm text-white/50 mb-6">
              Vous perdrez les {drawnPoints.length} points tracés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-sm text-white/70 hover:bg-white/[0.05] transition-colors"
              >
                Continuer
              </button>
              <button
                onClick={cancelDraw}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-300 font-semibold hover:bg-red-500/30 transition-colors"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT PARCELLE MODAL ═══ */}
      {editModal.open && selectedParcelle && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditModal({ ...editModal, open: false })}>
          <div className="glass-card w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white/90">Modifier la parcelle</h3>
              <button onClick={() => setEditModal({ ...editModal, open: false })} className="p-1 rounded-lg hover:bg-white/10 text-white/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/50 font-medium uppercase tracking-wider block mb-1">Nom</label>
                <input
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/90 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/50 font-medium uppercase tracking-wider block mb-1">Culture</label>
                <select
                  value={editModal.cropType}
                  onChange={(e) => setEditModal({ ...editModal, cropType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/90 focus:border-amber-500/40 focus:outline-none"
                >
                  {Object.entries(cultureTypeLabels).map(([key, label]) => (
                    <option key={key} value={key} className="bg-zinc-900">{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/50 font-medium uppercase tracking-wider block mb-1">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editModal.color}
                    onChange={(e) => setEditModal({ ...editModal, color: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-white/40 font-mono">{editModal.color}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditModal({ ...editModal, open: false })}
                className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.06] transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={actionLoading || !editModal.name.trim()}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await updateParcelle(selectedParcelle.id, {
                      name: editModal.name.trim(),
                      cropType: editModal.cropType as CultureType,
                      color: editModal.color,
                    });
                    await refetchParcelles();
                    setEditModal({ open: false, name: "", cropType: "", color: "" });
                    setSelectedParcelle(null);
                  } catch (err) {
                    alert((err as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {deleteConfirm && selectedParcelle && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)}>
          <div className="glass-card w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/90">Supprimer la parcelle</h3>
                <p className="text-[11px] text-white/40">{selectedParcelle.name}</p>
              </div>
            </div>

            <p className="text-xs text-white/60 leading-relaxed mb-4">
              {(selectedParcelle.children?.length || 0) > 0
                ? <>Cette parcelle contient <b className="text-red-400">{selectedParcelle.children?.length} sous-parcelle(s)</b> qui seront aussi supprimées. Cette action est irréversible.</>
                : <>Cette action est irréversible. La parcelle et toutes ses données associées seront supprimées.</>
              }
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.06] transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await deleteParcelle(selectedParcelle.id);
                    await refetchParcelles();
                    setDeleteConfirm(false);
                    setSelectedParcelle(null);
                  } catch (err) {
                    alert((err as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Info; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 pt-3 border-t border-white/[0.08] first:border-t-0 first:pt-0">
      <Icon className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-[10px] font-semibold text-white/55 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: "amber" | "cyan" }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-b-0">
      <span className="text-[11px] text-white/55">{label}</span>
      <span className={cn(
        "text-[11px] font-medium text-right max-w-[55%]",
        highlight === "amber" ? "text-amber-400 font-mono" :
        highlight === "cyan" ? "text-cyan-400 font-mono" : "text-white/60"
      )}>
        {value}
      </span>
    </div>
  );
}

function isInsidePolygon(lat: number, lon: number, boundary: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [yi, xi] = boundary[i];
    const [yj, xj] = boundary[j];
    if (((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function computeArea(points: [number, number][]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;
  const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const areaM2 = area * mPerDegLat * mPerDegLon;
  return areaM2 / 10000;
}

function computePerimeter(points: [number, number][]): number {
  if (points.length < 2) return 0;
  const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dLat = (points[j][0] - points[i][0]) * mPerDegLat;
    const dLon = (points[j][1] - points[i][1]) * mPerDegLon;
    perimeter += Math.sqrt(dLat * dLat + dLon * dLon);
  }
  return perimeter;
}
