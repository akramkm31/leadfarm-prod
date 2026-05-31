"use client";

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ScheduleTreatmentModal from "@/components/treatments/ScheduleTreatmentModal";
import { useParcelles, useTreatments } from "@/hooks/useData";
import { insertParcelle, updateParcelle, deleteParcelle, fetchTreatmentWithPoints } from "@/lib/data-provider";
import { dbPointsToTrajectory } from "@/lib/trajectory-utils";
import type { Trajectory } from "@/lib/trajectory-utils";
import { genererOrdreTraitementPDF } from "@/lib/pdf/ordreTraitement";
import {
  cultureTypeLabels,
  irrigationLabels,
  type Parcelle,
  type CultureType,
} from "@/lib/mock-data";
import type { Treatment } from "@/lib/database.types";
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
  GitBranch,
  History,
  Clock,
  FlaskConical,
  User,
  ChevronLeft,
  AreaChart,
  Search,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Filter,
  Wind,
  Thermometer,
  ShieldAlert,
} from "lucide-react";
import type { DrawTool } from "@/components/map/ParcelleMap";
import ParcelleQuickNav from "@/components/map/ParcelleQuickNav";

const ParcelleMap = dynamic(() => import("@/components/map/ParcelleMap"), {
  ssr: false,
  loading: () => (
    <div className="glass-card h-[500px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--color-valley-green)]/30 border-t-amber-400 rounded-full animate-spin" />
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
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#091509]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-valley-green)]" />
      </div>
    }>
      <ParcellesPageContent />
    </Suspense>
  );
}

function ParcellesPageContent() {
  const { data: parcellesRaw, loading: parcellesLoading, refetch: refetchParcelles } = useParcelles();
  const { data: treatmentsRaw, loading: treatmentsLoading } = useTreatments();
  const baseParcelles = (parcellesRaw || []) as Parcelle[];
  const treatments = (treatmentsRaw || []) as any[];

  const [localParcelles, setLocalParcelles] = useState<Parcelle[]>([]);
  const baseIds = new Set(baseParcelles.map((p) => p.id));
  const parcelles = [...baseParcelles, ...localParcelles.filter((lp) => !baseIds.has(lp.id))];

  const [expandedParcelle, setExpandedParcelle] = useState<string | null>(null);
  const [selectedParcelle, setSelectedParcelle] = useState<Parcelle | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>("polygon");
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [newParcelle, setNewParcelle] = useState({ name: "", site: "", cropType: "", variete: "", color: "#10b981" });
  const [drawingParentId, setDrawingParentId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; name: string; cropType: string; color: string }>({ open: false, name: "", cropType: "", color: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [mapOverlayChild, setMapOverlayChild] = useState<{ child: Parcelle; parent: Parcelle } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ═══ THEATER & EXPLORATION STATES ═══
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [geoPins, setGeoPins] = useState<any[]>([
    { id: "pin-1", lat: 34.9868, lng: -0.5362, type: "pest", note: "Foyer d'araignée rouge détecté sur les feuilles inférieures.", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "pin-2", lat: 34.9875, lng: -0.5348, type: "irrigation", note: "Buse bouchée sur la rampe 3 d'irrigation.", createdAt: new Date(Date.now() - 172800000).toISOString() }
  ]);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newPinNote, setNewPinNote] = useState("");
  const [newPinType, setNewPinType] = useState<"pest" | "irrigation" | "weed" | "other">("pest");
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [viewportBounds, setViewportBounds] = useState<any>(null);

  // ═══ QUERY PARAMETER PARCEL SELECTION (URL ↔ state) ═══
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectId = searchParams.get("select");
  const pendingSelectIdRef = useRef<string | null>(null);
  const suppressSelectSyncRef = useRef(false);

  const findParcelleById = useCallback(
    (id: string) => {
      const all = parcelles.flatMap((p: Parcelle) => [p, ...(p.children || [])]);
      return all.find((p: Parcelle) => p.id === id) ?? null;
    },
    [parcelles]
  );

  const setSelectQuery = useCallback(
    (id: string | null) => {
      const base = pathname || "/parcelles";
      const next = id ? `${base}?select=${encodeURIComponent(id)}` : base;
      router.replace(next, { scroll: false });
    },
    [router, pathname]
  );

  const clearParcelleSelection = useCallback(() => {
    suppressSelectSyncRef.current = true;
    pendingSelectIdRef.current = null;
    setSelectedParcelle(null);
    setHistoryOpen(false);
    setMapOverlayChild(null);
    if (selectId) setSelectQuery(null);
  }, [selectId, setSelectQuery]);

  const selectParcelle = useCallback(
    (parcelle: Parcelle, options?: { openHistory?: boolean }) => {
      suppressSelectSyncRef.current = false;
      pendingSelectIdRef.current = parcelle.id;
      setSelectedParcelle(parcelle);
      if (parcelle.parentId) {
        setExpandedParcelle(parcelle.parentId);
      } else {
        setExpandedParcelle(parcelle.id);
      }
      if (parcelle.center) {
        setFocusCoords(parcelle.center as [number, number]);
      }
      setSelectQuery(parcelle.id);
      if (options?.openHistory) setHistoryOpen(true);
    },
    [setSelectQuery]
  );

  useEffect(() => {
    if (!selectId) {
      suppressSelectSyncRef.current = false;
      if (pendingSelectIdRef.current) return;
      if (selectedParcelle) {
        setSelectedParcelle(null);
        setHistoryOpen(false);
      }
      return;
    }

    if (suppressSelectSyncRef.current) return;

    pendingSelectIdRef.current = null;

    if (parcelles.length === 0) return;

    const found = findParcelleById(selectId);
    if (!found) {
      setSelectQuery(null);
      return;
    }

    if (selectedParcelle?.id === selectId) return;

    setSelectedParcelle(found);
    if (found.parentId) {
      setExpandedParcelle(found.parentId);
    } else {
      setExpandedParcelle(found.id);
    }
    if (found.center) {
      setFocusCoords(found.center as [number, number]);
    }
    setHistoryOpen(true);
  }, [selectId, parcelles, findParcelleById, selectedParcelle?.id, setSelectQuery]);

  // ═══ AUTO-SCROLL TREE SIDEBAR INTO VIEW ═══
  useEffect(() => {
    if (selectedParcelle) {
      const timer = setTimeout(() => {
        const element = document.getElementById("tree-node-" + selectedParcelle.id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedParcelle]);

  const visibleStats = useMemo(() => {
    if (!viewportBounds) return { hectares: 0, parcellesCount: 0, cultureDist: {} as Record<string, number> };
    const all = parcelles.flatMap((p: Parcelle) => [p, ...(p.children || [])]);
    
    // Filter parcelles whose center is inside the current viewport bounds
    const visible = all.filter((p) => {
      if (!p.center) return false;
      const [lat, lon] = p.center;
      try {
        return viewportBounds.contains([lat, lon]);
      } catch {
        return false;
      }
    });

    const hectares = visible.reduce((sum, p) => sum + (p.areaHectares || 0), 0);
    const cultureDist = visible.reduce((acc, p) => {
      const crop = p.cropType || "Non défini";
      acc[crop] = (acc[crop] || 0) + (p.areaHectares || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      hectares,
      parcellesCount: visible.length,
      cultureDist,
    };
  }, [viewportBounds, parcelles]);

  // ═══ TREATMENT TAB STATE ═══
  const [activeTab, setActiveTab] = useState<"parcelles" | "treatments">("parcelles");
  const [selectedTreatmentItem, setSelectedTreatmentItem] = useState<any | null>(null);
  const [treatmentTrajectory, setTreatmentTrajectory] = useState<Trajectory | null>(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [treatmentFilter, setTreatmentFilter] = useState<"all" | "completed" | "in_progress" | "planned">("all");
  // Simulation state
  const [simIndex, setSimIndex] = useState(0);
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(5);
  const [simRawPoints, setSimRawPoints] = useState<any[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<Parcelle | null>(null);

  useEffect(() => {
    if (expandedParcelle !== null || parcelles.length === 0) return;
    const first = parcelles.find((p) => !p.parentId) ?? parcelles[0];
    if (first) setExpandedParcelle(first.id);
  }, [parcelles, expandedParcelle]);

  // Synchronize the active zone filter whenever a new parcelle/sub-parcelle is selected
  const lastSelectedParcelleRef = useRef<Parcelle | null>(null);
  useEffect(() => {
    if (selectedParcelle && selectedParcelle !== lastSelectedParcelleRef.current) {
      setSelectedZoneFilter(selectedParcelle);
    }
    lastSelectedParcelleRef.current = selectedParcelle;
  }, [selectedParcelle]);

  const startDrawingSubParcelle = useCallback((parent: Parcelle): void => {
    setDrawingParentId(parent.id);
    setNewParcelle({ name: "", site: parent.site || "", cropType: parent.cropType, variete: parent.variete || "", color: parent.color });
    setDrawMode(true);
    setDrawTool("polygon");
    setDrawnPoints([]);
    setShowDrawForm(false);
  }, []);

  const startDrawingParcelle = useCallback((): void => {
    setDrawingParentId(null);
    setNewParcelle({ name: "", site: "", cropType: "", variete: "", color: "#10b981" });
    setDrawMode(true);
    setDrawnPoints([]);
    setShowDrawForm(false);
  }, []);

  const handleMapClick = useCallback((lat: number, lon: number): void => {
    if (drawMode) {
      setDrawnPoints((prev) => [...prev, [lat, lon]]);
      return;
    }
    if (isPinMode) {
      setPendingPinCoords({ lat, lng: lon });
      return;
    }
  }, [drawMode, isPinMode]);

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
    if (!newParcelle.name.trim() || !newParcelle.site.trim() || !newParcelle.cropType.trim() || !newParcelle.variete.trim()) {
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
        site: newParcelle.site.trim(),
        cropType: newParcelle.cropType.trim(),
        variete: newParcelle.variete.trim(),
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
        cropType: newParcelle.cropType,
        variete: newParcelle.variete,
        cultureType: "arboriculture",
        soilType: "Non défini",
        site: newParcelle.site,
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
        setNewParcelle({ name: "", site: "", cropType: "", variete: "", color: "#10b981" });
        refetchParcelles?.();
      }, 800);
    } catch (err) {
      console.error("Erreur création parcelle:", err);
      setSaveStatus("error");
      setSaving(false);
    }
  };

  // ═══ TREATMENT SELECTION & TRAJECTORY LOADING ═══
  const handleSelectTreatment = useCallback(async (t: any) => {
    if (selectedTreatmentItem?.id === t.id) {
      // Deselect
      setSelectedTreatmentItem(null);
      setTreatmentTrajectory(null);
      setSimRawPoints([]);
      setSimIndex(0);
      setIsSimPlaying(false);
      return;
    }
    setSelectedTreatmentItem(t);
    clearParcelleSelection();
    const focusId = t.sousParcelleId || t.parcelleId;
    if (focusId) {
      const found = findParcelleById(focusId);
      if (found?.center) {
        setFocusCoords(found.center as [number, number]);
      } else if (found?.boundary?.length) {
        setFocusCoords(found.boundary[0] as [number, number]);
      }
    }
    setTreatmentTrajectory(null);
    setSimRawPoints([]);
    setSimIndex(0);
    setIsSimPlaying(false);

    // Load trajectory from DB if treatment is not planned, draft, or cancelled
    if (t.status === "planned" || t.status === "draft" || t.status === "cancelled") {
      return;
    }

    setLoadingTrajectory(true);
    try {
      const data = await fetchTreatmentWithPoints(t.id);
      if (data?.points?.length > 0) {
        setSimRawPoints(data.points);
        setTreatmentTrajectory(dbPointsToTrajectory(data.points));
      }
    } catch (err) {
      console.error("Error loading trajectory:", err);
    } finally {
      setLoadingTrajectory(false);
    }
  }, [selectedTreatmentItem, clearParcelleSelection, findParcelleById]);

  const telechargerOrdre = useCallback(async (treatmentId: string) => {
    const t = treatments.find((x: any) => x.id === treatmentId);
    if (!t) return;
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/v1/treatments/${treatmentId}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FOR.PR6.003_${treatmentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      
      console.warn("API PDF non disponible, fallback génération locale");
      const culture = t.culture || "";
      const variete = t.variete || "";
      const cible = t.cible || "";
      const modeApp = t.modeApplication || "Pulverisation";
      const materiel = t.materiel || "";
      const vitesseKmh = t.vitesseKmh || 0;
      const pressionBar = t.pressionBar || 0;
      const diamPastilles = t.diametrePastillesMm || 0;

      const produits = (t.products || []).map((p: any) => ({
        nom_commercial: p.productName || "",
        matiere_active: "",
        dose_hl: p.dosePerHectare ? `${p.dosePerHectare}` : "",
        quantite_sortir: p.quantityUsed ? `${p.quantityUsed} ${p.unit || "L"}` : "",
      }));

      const pdfBlob = await genererOrdreTraitementPDF({
        site: "Domaine Khelifa",
        n_traitement: t.id.slice(0, 8).toUpperCase(),
        date_prevue: t.plannedDate || "",
        parcelle_nom: t.parcelleName || "",
        superficie_ha: t.areaTreatedHectares || undefined,
        culture,
        variete,
        cible,
        mode_application: modeApp,
        materiel_utilise: materiel,
        vitesse_avancement_kmh: (vitesseKmh && vitesseKmh > 0) ? vitesseKmh : undefined,
        pression_service_bar: (pressionBar && pressionBar > 0) ? pressionBar : undefined,
        diametre_pastilles_mm: (diamPastilles && diamPastilles > 0) ? diamPastilles : undefined,
        produits,
        operateur_nom: t.operatorName || "",
        date_reelle: t.dateReelle || t.executedDate || undefined,
        heure_debut: t.heureDebut || undefined,
        heure_fin: t.heureFin || undefined,
        quantite_utilisee: t.quantiteUtilisee || undefined,
        bouillon_citerne_l: t.bouillonCiterneL || undefined,
        nb_citernes: t.nbCiternes || undefined,
        date_reentree: t.dateReentree || undefined,
        dar_jours: (t.darJours && t.darJours > 0) ? t.darJours : undefined,
        efficacite: t.efficacite || "",
        visa_rt: t.visaRt || "",
        signe: ["completed", "evaluated", "approved"].includes(t.status),
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FOR.PR6.003_${treatmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur génération PDF:", err);
    } finally {
      setExportingPdf(false);
    }
  }, [treatments]);

  // ═══ SIMULATION TIMER ═══
  useEffect(() => {
    if (!isSimPlaying || simRawPoints.length === 0) return;
    const timer = setTimeout(() => {
      setSimIndex((prev) => {
        if (prev >= simRawPoints.length - 1) {
          setIsSimPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, Math.max(10, 200 / simSpeed));
    return () => clearTimeout(timer);
  }, [isSimPlaying, simIndex, simRawPoints.length, simSpeed]);

  // Current simulation position
  const simPosition = useMemo(() => {
    if (simRawPoints.length === 0 || simIndex >= simRawPoints.length) return null;
    const pt = simRawPoints[simIndex];
    return { lat: pt.lat, lon: pt.lng, speed: pt.speed_kmh || 0 };
  }, [simRawPoints, simIndex]);

  // Compute compass heading (rotation) dynamically
  const heading = useMemo(() => {
    if (simRawPoints.length < 2 || simIndex >= simRawPoints.length - 1) return 0;
    const p1 = simRawPoints[simIndex];
    const p2 = simRawPoints[simIndex + 1];
    const dy = p2.lat - p1.lat;
    const dx = p2.lng - p1.lng;
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);
    return angle;
  }, [simRawPoints, simIndex]);

  // Premium Agricultural Weather Safety Warnings
  const weatherWarnings = useMemo(() => {
    if (!selectedTreatmentItem) return [];
    const warnings = [];
    const wind = parseFloat(selectedTreatmentItem.windSpeed) || 0;
    const temp = parseFloat(selectedTreatmentItem.temperature) || 0;
    const hum = parseFloat(selectedTreatmentItem.humidity) || 0;

    if (wind > 19) {
      warnings.push({
        type: "danger",
        text: "Vent violent (>19 km/h) : Dérive de pulvérisation élevée. Épandage non conforme.",
      });
    } else if (wind > 12) {
      warnings.push({
        type: "warning",
        text: "Vent modéré (12-19 km/h) : Risque de dérive mineure. Buses anti-dérive requises.",
      });
    }

    if (temp > 28) {
      warnings.push({
        type: "danger",
        text: "Chaleur critique (>28°C) : Risque d'évaporation instantanée et brûlures de la culture.",
      });
    } else if (temp < 5) {
      warnings.push({
        type: "warning",
        text: "Froid extrême (<5°C) : Activité systémique très ralentie par la plante.",
      });
    }

    if (hum < 50) {
      warnings.push({
        type: "warning",
        text: "Humidité basse (<50%) : Cristallisation rapide des fines gouttelettes.",
      });
    }
    return warnings;
  }, [selectedTreatmentItem]);

  // ═══ FILTERED TREATMENTS ═══
  const filteredTreatmentsList = useMemo(() => {
    return treatments
      .filter((t: any) => {
        const matchStatus = treatmentFilter === "all" || t.status === treatmentFilter;
        const matchSearch = !treatmentSearch ||
          (t.parcelleName || "").toLowerCase().includes(treatmentSearch.toLowerCase()) ||
          (t.operatorName || "").toLowerCase().includes(treatmentSearch.toLowerCase()) ||
          (t.type || "").toLowerCase().includes(treatmentSearch.toLowerCase());
        
        // Active zone/parcelle filtering
        const matchZone = !selectedZoneFilter ||
          t.parcelleId === selectedZoneFilter.id ||
          t.sousParcelleId === selectedZoneFilter.id ||
          (t.parcelleName || "").toLowerCase() === (selectedZoneFilter.name || "").toLowerCase() ||
          (t.sousParcelleNom || "").toLowerCase() === (selectedZoneFilter.name || "").toLowerCase();

        return matchStatus && matchSearch && matchZone;
      })
      .sort((a: any, b: any) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime());
  }, [treatments, treatmentFilter, treatmentSearch, selectedZoneFilter]);

  // Treatment status config
  const TREATMENT_STATUS_CONFIG: Record<string, { label: string; dotColor: string; badgeClass: string }> = {
    completed: { label: "Terminé", dotColor: "bg-emerald-500", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    in_progress: { label: "En cours", dotColor: "bg-amber-500", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    planned: { label: "Planifié", dotColor: "bg-blue-500", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    approved: { label: "Approuvé", dotColor: "bg-indigo-500", badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
    draft: { label: "Brouillon", dotColor: "bg-slate-400", badgeClass: "bg-slate-400/10 text-slate-500 border-slate-400/20" },
    cancelled: { label: "Annulé", dotColor: "bg-red-500", badgeClass: "bg-red-500/10 text-red-600 border-red-500/20" },
    evaluated: { label: "Évalué", dotColor: "bg-purple-500", badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    pending_approval: { label: "En attente", dotColor: "bg-orange-500", badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  };

  const treatmentCounts = useMemo(() => {
    const list = treatments.filter((t: any) => {
      return !selectedZoneFilter ||
        t.parcelleId === selectedZoneFilter.id ||
        t.sousParcelleId === selectedZoneFilter.id ||
        (t.parcelleName || "").toLowerCase() === (selectedZoneFilter.name || "").toLowerCase() ||
        (t.sousParcelleNom || "").toLowerCase() === (selectedZoneFilter.name || "").toLowerCase();
    });
    return {
      all: list.length,
      completed: list.filter((t: any) => t.status === "completed").length,
      in_progress: list.filter((t: any) => t.status === "in_progress").length,
      planned: list.filter((t: any) => t.status === "planned").length,
    };
  }, [treatments, selectedZoneFilter]);

  if (parcellesLoading || treatmentsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-valley-green)]/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-sm text-[var(--color-adaline-ink)]/55">Chargement des parcelles...</span>
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
      <div className="mb-6 bg-black/30  rounded-2xl p-5 border border-[var(--color-stone-moss)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight">Parcelles</h1>
            <p className="text-sm text-[var(--color-adaline-ink)]/60 mt-1">
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
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-black/40 border border-[var(--color-stone-moss)]">
                {([["polygon", Shapes, "Polygone"], ["rectangle", Square, "Rectangle"], ["gps", Navigation, "GPS"]] as const).map(([tool, Icon, label]) => (
                  <button
                    key={tool}
                    type="button"
                    aria-label={label}
                    aria-pressed={drawTool === tool}
                    onClick={() => switchTool(tool as DrawTool)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all flex-1 justify-center sm:flex-initial",
                      drawTool === tool
                        ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] shadow-sm"
                        : "text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/80 hover:bg-white/[0.06]"
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-[var(--color-stone-moss)]">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: newParcelle.color }} />
                  <span className="text-xs font-mono text-[var(--color-adaline-ink)]/60">
                    {drawnPoints.length} pts
                    {liveArea > 0 && <span className="text-[var(--color-valley-green)] ml-2">{liveArea.toFixed(2)} ha</span>}
                  </span>
                </div>

                {drawTool !== "rectangle" && (
                  <button
                    onClick={undoLastPoint}
                    disabled={drawnPoints.length === 0}
                    className="px-3 py-2 text-xs rounded-xl bg-white/[0.06] border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/60 hover:text-[var(--color-adaline-ink)]/90 hover:bg-white/[0.1] disabled:opacity-30 flex items-center gap-1.5 transition-all"
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
                  className="px-3 py-2 text-xs rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/20 flex items-center gap-1.5 transition-all"
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
        <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-green-500/10 border border-[var(--color-valley-green)]/20 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[var(--color-valley-green)]">{Math.min(drawnPoints.length + 1, 4)}</span>
          </div>
          <p className="text-sm text-[var(--color-adaline-ink)]/70">
            {drawTool === "rectangle" ? (
              "Cliquez-glissez sur la carte pour dessiner un rectangle"
            ) : drawnPoints.length === 0 ? (
              "Cliquez sur la carte pour placer le premier sommet"
            ) : drawnPoints.length === 1 ? (
              "Placez le deuxième point — glissez un sommet pour ajuster"
            ) : drawnPoints.length === 2 ? (
              "Encore 1 point minimum — ensuite cliquez le point ① pour fermer"
            ) : (
              <>Cliquez le point <strong className="text-[var(--color-valley-green)]">①</strong> (pulsant) pour fermer · <span className="text-[var(--color-adaline-ink)]/40">Clic-droit sur un sommet pour le supprimer</span></>
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
                onClick={() => selectParcelle(p)}
                className={cn(
                  "glass-card p-4 cursor-pointer border-l-[3px] transition-all hover:scale-[1.02]",
                  selectedParcelle?.id === p.id && "border-emerald-500/40"
                )}
                style={{ borderLeftColor: p.color || "#6b9e7a" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CultureIcon className="w-4 h-4" style={{ color: p.color || "#6b9e7a" }} />
                  <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/70 truncate">{p.name || p.cropType}</span>
                </div>
                <span className="text-lg font-bold text-[var(--color-adaline-ink)]/90 font-mono">{formatHectares(p.areaHectares)}</span>
                <span className="text-[10px] text-[var(--color-adaline-ink)]/50 block">{p.cropType}{p.variete ? ` · ${p.variete}` : ""}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {parcelles.length === 0 && !drawMode && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px] mb-6">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500/15 to-amber-500/10 border border-[var(--color-stone-moss)] flex items-center justify-center empty-state-icon">
              <Map className="w-14 h-14 text-[var(--color-valley-green)]/40" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-[var(--color-valley-green)]/60" />
            </div>
            <div className="absolute -top-2 -left-2 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/15 to-green-600/10 border border-green-500/15 flex items-center justify-center">
              <Wheat className="w-4 h-4 text-green-400/50" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-[var(--color-adaline-ink)]/80 mb-2">Cartographiez votre exploitation</h3>
          <p className="text-sm text-[var(--color-adaline-ink)]/50 max-w-sm mb-8 leading-relaxed">
            Dessinez vos parcelles sur la carte interactive pour suivre vos cultures, planifier les traitements et gérer vos surfaces agricoles.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button onClick={startDrawingParcelle} className="glass-button px-6 py-3 flex items-center gap-2.5 text-sm font-semibold">
              <Pencil className="w-4 h-4" />
              Dessiner ma première parcelle
            </button>
            <div className="flex items-center gap-6 text-xs text-[var(--color-adaline-ink)]/40">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Géolocalisation</span>
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Sous-parcelles</span>
              <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Irrigation</span>
            </div>
          </div>
        </div>
      )}

      {/* Map + embedded save form */}
      <div className="mb-6 relative flex flex-col rounded-2xl overflow-hidden border border-[var(--color-stone-moss)] bg-[#f5f8ec]">
        {parcelles.length > 0 && !drawMode && (
          <ParcelleQuickNav
            parcelles={parcelles}
            selectedId={
              activeTab === "treatments"
                ? selectedTreatmentItem?.sousParcelleId ||
                  selectedTreatmentItem?.parcelleId ||
                  null
                : selectedParcelle?.id ?? null
            }
            onSelect={(id) => {
              const found = findParcelleById(id);
              if (!found) return;
              if (activeTab === "treatments") {
                if (found.center) setFocusCoords(found.center as [number, number]);
                else if (found.boundary?.length) {
                  setFocusCoords(found.boundary[0] as [number, number]);
                }
              } else {
                selectParcelle(found);
              }
            }}
            onClear={clearParcelleSelection}
            variant="light"
            hint={
              activeTab === "treatments"
                ? "Centrer la carte sur la parcelle"
                : "Accès rapide · clic pour ouvrir la fiche"
            }
          />
        )}
        <div className="relative min-h-[500px] flex-1">
        <ParcelleMap
          parcelles={parcelles}
          isTheaterMode={false}
          onTheaterToggle={() => setIsTheaterMode(true)}
          geoPins={geoPins}
          focusCoordinates={focusCoords}
          onViewportBoundsChange={(bounds) => setViewportBounds(bounds)}
          onMapClick={handleMapClick}
          onParcelleClick={(id: string) => {
            if (drawMode) return;
            const all = parcelles.flatMap((p: Parcelle) => [p, ...(p.children || [])]);
            const found = all.find((p: Parcelle) => p.id === id);
            if (found) selectParcelle(found, { openHistory: true });
          }}
          onChildParcelleClick={(childId: string, parentId: string) => {
            if (drawMode) return;
            const parent = parcelles.find((p: Parcelle) => p.id === parentId);
            const child = parent?.children?.find((c: Parcelle) => c.id === childId);
            if (child && parent) {
              setMapOverlayChild({ child, parent });
              selectParcelle(child, { openHistory: true });
            }
          }}
          onCreateSubParcelle={(parentId: string) => {
            const parent = parcelles.find((p: Parcelle) => p.id === parentId);
            if (parent) {
              startDrawingSubParcelle(parent);
              clearParcelleSelection();
            }
          }}
          drawMode={drawMode}
          drawTool={drawTool}
          drawnPoints={drawnPoints}
          onPointUpdate={handlePointUpdate}
          onSnapClose={handleSnapClose}
          onShapeComplete={handleShapeComplete}
          onStartDraw={startDrawingParcelle}
          onPointDelete={deletePoint}
          drawColor={newParcelle.color}
          previewLabel={
            showDrawForm && drawnPoints.length >= 3
              ? newParcelle.name.trim() || "Nouvelle parcelle"
              : undefined
          }
          hideHud={showDrawForm}
          constrainBoundary={drawingParentId ? parcelles.find((p) => p.id === drawingParentId)?.boundary : undefined}
          trajectory={activeTab === "treatments" ? treatmentTrajectory : null}
          simulationPosition={activeTab === "treatments" && (isSimPlaying || simIndex > 0) ? simPosition : null}
          highlightParcelleId={activeTab === "treatments" ? selectedTreatmentItem?.parcelleId : selectedParcelle?.id}
        />
        </div>

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
                      <h3 className="text-sm font-bold text-[var(--color-adaline-ink)]/90 truncate">{mapOverlayChild.child.name}</h3>
                      <p className="text-[10px] text-[var(--color-adaline-ink)]/40 truncate">
                        sous-parcelle de {mapOverlayChild.parent.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMapOverlayChild(null)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/70 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-lg font-bold text-[var(--color-valley-green)] font-mono block">{formatHectares(mapOverlayChild.child.areaHectares)}</span>
                  <span className="text-[9px] text-[var(--color-adaline-ink)]/40 uppercase tracking-wider">Surface</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-lg font-bold text-[var(--color-valley-green)] font-mono block">{mapOverlayChild.child.treatmentCount ?? 0}</span>
                  <span className="text-[9px] text-[var(--color-adaline-ink)]/40 uppercase tracking-wider">Traitements</span>
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
                {treatments.filter((t: any) => t.sousParcelleId === mapOverlayChild.child.id).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Droplets className="w-3 h-3 text-[var(--color-valley-green)]" />
                      <span className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/55 uppercase tracking-wider">Récents</span>
                    </div>
                    <div className="space-y-1.5">
                      {treatments
                        .filter((t: any) => t.sousParcelleId === mapOverlayChild.child.id)
                        .slice(0, 3)
                        .map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <div>
                              <span className="text-[11px] text-[var(--color-adaline-ink)]/60">{t.products[0]?.productName || t.type}</span>
                              <span className="text-[9px] text-[var(--color-adaline-ink)]/35 block">{new Date(t.plannedDate).toLocaleDateString("fr-FR")}</span>
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
                    selectParcelle(mapOverlayChild.child);
                    setMapOverlayChild(null);
                    setScheduleOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/25 transition-colors flex items-center justify-center gap-2"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  Planifier un traitement
                </button>
                <button
                  onClick={() => {
                    selectParcelle(mapOverlayChild.child);
                    setMapOverlayChild(null);
                  }}
                  className="w-full py-2 text-[11px] font-medium rounded-xl border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/50 hover:bg-white/[0.06] hover:text-[var(--color-adaline-ink)]/70 transition-colors flex items-center justify-center gap-1.5"
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
              className="pointer-events-auto group relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/90 to-amber-600/90 border-3 border-white/90 shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
            >
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping" />
              {gpsLoading ? (
                <Loader2 className="w-8 h-8 text-[var(--color-adaline-ink)] animate-spin relative z-10" />
              ) : (
                <Navigation className="w-8 h-8 text-[var(--color-adaline-ink)] drop-shadow-lg relative z-10" />
              )}
            </button>
            <div className="pointer-events-auto bg-black/80  px-4 py-2 rounded-xl border border-[var(--color-stone-moss)] max-w-xs text-center">
              <p className="text-xs text-[var(--color-adaline-ink)]/80 font-medium">
                {drawnPoints.length === 0
                  ? "Marchez au premier coin de votre parcelle"
                  : `Point ${drawnPoints.length} enregistré · Marchez au coin suivant`}
              </p>
              {gpsError && (
                <p className="text-[10px] text-[var(--color-valley-green)] mt-1">{gpsError}</p>
              )}
            </div>
          </div>
        )}

        {/* Floating save form — inside the map, bottom bar */}
        {showDrawForm && (
          <div className={cn(
            "lf-map-draw-panel absolute bottom-3 left-3 right-3 z-[1000] rounded-2xl shadow-2xl shadow-black/50 transition-all duration-300",
            saveStatus === "success"
              ? "bg-green-900/90 border border-green-400/40 "
              : "bg-[#0d1f0d]/92 border border-white/15 "
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
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/25">
                    <Pencil className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                    <span className="text-[11px] text-[var(--color-valley-green)] font-medium">
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
                    <span className="text-xs font-mono lf-overlay-muted">
                      <span className="text-[var(--color-forest-dew)] font-bold">{computeArea(drawnPoints).toFixed(2)} ha</span>
                      <span className="opacity-50 mx-1.5">·</span>
                      {drawnPoints.length} pts
                      <span className="opacity-50 mx-1.5">·</span>
                      {computePerimeter(drawnPoints).toFixed(0)} m
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDrawForm(false)}
                    className="text-[10px] text-[var(--color-valley-green)] hover:text-[var(--color-valley-green)] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/[0.08] transition-all"
                  >
                    <Pencil className="w-3 h-3" /> Modifier tracé
                  </button>
                </div>

                {/* Row 2: Name input (full width, prominent) */}
                <div className="mb-3">
                  <input
                    type="text"
                    className={cn(
                      "w-full px-4 py-3 text-sm rounded-xl bg-black/40 border outline-none transition-all",
                      saveStatus === "error" && !newParcelle.name.trim()
                        ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                        : "border-white/15 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                    )}
                    placeholder="Nom de la parcelle (obligatoire)"
                    value={newParcelle.name}
                    onChange={(e) => { setNewParcelle({ ...newParcelle, name: e.target.value }); setSaveStatus(null); }}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveParcelle(); if (e.key === "Escape") cancelDraw(); }}
                  />
                  {saveStatus === "error" && !newParcelle.name.trim() && (
                    <span className="text-[10px] text-[var(--color-valley-green)] mt-1 block pl-1">Veuillez saisir un nom</span>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-xl bg-black/40 border outline-none transition-all",
                        saveStatus === "error" && !newParcelle.site.trim()
                          ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                          : "border-white/15 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                      )}
                      placeholder="Site (obligatoire)"
                      value={newParcelle.site}
                      onChange={(e) => { setNewParcelle({ ...newParcelle, site: e.target.value }); setSaveStatus(null); }}
                    />
                    {saveStatus === "error" && !newParcelle.site.trim() && (
                      <span className="text-[10px] text-[var(--color-valley-green)] mt-1 block pl-1">Site obligatoire</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      list="cultures-list"
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-xl bg-black/40 border outline-none transition-all",
                        saveStatus === "error" && !newParcelle.cropType.trim()
                          ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                          : "border-white/15 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                      )}
                      placeholder="Culture (ex: Pommier)"
                      value={newParcelle.cropType}
                      onChange={(e) => { setNewParcelle({ ...newParcelle, cropType: e.target.value }); setSaveStatus(null); }}
                    />
                    <datalist id="cultures-list">
                      <option value="Pommier" />
                      <option value="Olivier" />
                      <option value="Vigne" />
                      <option value="Agrumes" />
                      <option value="Maraîchage" />
                      <option value="Céréales" />
                    </datalist>
                    {saveStatus === "error" && !newParcelle.cropType.trim() && (
                      <span className="text-[10px] text-[var(--color-valley-green)] mt-1 block pl-1">Culture obligatoire</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-xl bg-black/40 border outline-none transition-all",
                        saveStatus === "error" && !newParcelle.variete.trim()
                          ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                          : "border-white/15 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                      )}
                      placeholder="Variété (obligatoire)"
                      value={newParcelle.variete}
                      onChange={(e) => { setNewParcelle({ ...newParcelle, variete: e.target.value }); setSaveStatus(null); }}
                    />
                    {saveStatus === "error" && !newParcelle.variete.trim() && (
                      <span className="text-[10px] text-[var(--color-valley-green)] mt-1 block pl-1">Variété obligatoire</span>
                    )}
                  </div>
                </div>

                {/* Row 3: Colors + Actions */}
                <div className="flex items-center gap-3 flex-wrap">

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
                    className="px-3 py-2 text-xs rounded-xl lf-overlay-muted hover:text-white hover:bg-white/[0.08] transition-all"
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
                        : "bg-white/[0.06] border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/40"
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

      {/* ═══ TAB SWITCHER ═══ */}
      {!drawMode && parcelles.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/20 border border-[var(--color-stone-moss)] w-fit">
            <button
              onClick={() => { setActiveTab("parcelles"); setSelectedTreatmentItem(null); setTreatmentTrajectory(null); setIsSimPlaying(false); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                activeTab === "parcelles"
                  ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] shadow-sm border border-[var(--color-valley-green)]/20"
                  : "text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/80 hover:bg-white/[0.04]"
              )}
            >
              <Layers className="w-4 h-4" />
              Parcelles
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                activeTab === "parcelles"
                  ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]"
                  : "bg-white/[0.08] text-[var(--color-adaline-ink)]/40"
              )}>{parcelles.length}</span>
            </button>
            <button
              onClick={() => { setActiveTab("treatments"); clearParcelleSelection(); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                activeTab === "treatments"
                  ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] shadow-sm border border-[var(--color-valley-green)]/20"
                  : "text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/80 hover:bg-white/[0.04]"
              )}
            >
              <FlaskConical className="w-4 h-4" />
              Traitements
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                activeTab === "treatments"
                  ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]"
                  : "bg-white/[0.08] text-[var(--color-adaline-ink)]/40"
              )}>{treatments.length}</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* ═══ PARCELLE TAB ═══ */}
        {activeTab === "parcelles" && (
        <>
        {/* Parcelle tree */}
        <div className={cn(selectedParcelle ? "col-span-12 lg:col-span-7" : "col-span-12")}>
          <div className="space-y-3">
            {parcelles.map((parcelle: Parcelle) => {
              const isExpanded = expandedParcelle === parcelle.id;
              const hasChildren = parcelle.children && parcelle.children.length > 0;

              return (
                <div key={parcelle.id}>
                  <div
                    id={"tree-node-" + parcelle.id}
                    className={cn(
                      "glass-card p-5 cursor-pointer transition-all",
                      selectedParcelle?.id === parcelle.id && "border-[var(--color-valley-green)]/30"
                    )}
                    onClick={() => selectParcelle(parcelle)}
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
                              <ChevronDown className="w-4 h-4 text-[var(--color-adaline-ink)]/55" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--color-adaline-ink)]/55" />
                            )}
                          </button>
                        )}
                        <div
                          className="w-4 h-4 rounded-md border-2"
                          style={{ borderColor: parcelle.color || "#6b9e7a", backgroundColor: (parcelle.color || "#6b9e7a") + "20" }}
                        />
                        <div>
                          <span className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">{parcelle.name}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-[var(--color-adaline-ink)]/50 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
                              {cultureTypeLabels[parcelle.cultureType as CultureType] || parcelle.cultureType || "—"}
                            </span>
                            <span className="text-[10px] text-[var(--color-adaline-ink)]/50">{parcelle.variete}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <Link
                          href={`/trace/${parcelle.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-lg border border-white/[0.12] text-[var(--color-valley-green)] hover:bg-white/[0.06] transition-colors"
                          title="Fiche traçabilité (parcelle ou plantation)"
                        >
                          <GitBranch className="w-3 h-3.5" />
                          Trace
                        </Link>
                        <span className="text-sm font-bold text-[var(--color-valley-green)] font-mono">
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
                        <Droplets className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                        <span className="text-xs text-[var(--color-adaline-ink)]/55">
                          <span className="text-[var(--color-adaline-ink)]/60 font-mono">{parcelle.treatmentCount}</span> traitements
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/40" />
                        <span className="text-xs text-[var(--color-adaline-ink)]/55">
                          {parcelle.lastTreatmentDate
                            ? new Date(parcelle.lastTreatmentDate).toLocaleDateString("fr-FR")
                            : "Jamais traité"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/40" />
                        <span className="text-xs text-[var(--color-adaline-ink)]/55">{parcelle.zone || "—"} · {parcelle.secteur || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                        <span className="text-xs text-[var(--color-adaline-ink)]/55">{irrigationLabels[parcelle.irrigation] || parcelle.irrigation || "—"}</span>
                      </div>
                    </div>

                    {!parcelle.lastTreatmentDate && (
                      <div className="mt-3 p-2 rounded-lg bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/20">
                        <span className="text-[10px] text-[var(--color-valley-green)]">
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
                          id={"tree-node-" + child.id}
                          onClick={() => selectParcelle(child)}
                          className={cn(
                            "glass-card p-4 cursor-pointer transition-all",
                            selectedParcelle?.id === child.id && "border-[var(--color-valley-green)]/30"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-3 h-3 rounded shrink-0"
                                style={{ borderColor: child.color || "#6b9e7a", backgroundColor: (child.color || "#6b9e7a") + "20", border: `1.5px solid ${child.color || "#6b9e7a"}` }}
                              />
                              <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/70 truncate">{child.name}</span>
                              <span className="text-[10px] text-[var(--color-adaline-ink)]/40 shrink-0">{child.variete}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/trace/${child.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border border-white/[0.12] text-[var(--color-valley-green)] hover:bg-white/[0.06]"
                              >
                                <GitBranch className="w-3 h-3" />
                                Trace
                              </Link>
                              <span className="text-xs text-[var(--color-valley-green)] font-mono">
                                {formatHectares(child.areaHectares)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-[10px] text-[var(--color-adaline-ink)]/55">
                              {child.treatmentCount} traitements
                            </span>
                            <span className="text-[10px] text-[var(--color-adaline-ink)]/40">
                              {child.lastTreatmentDate
                                ? `Dernier: ${new Date(child.lastTreatmentDate).toLocaleDateString("fr-FR")}`
                                : "Jamais traité"}
                            </span>
                            <span className="text-[10px] text-[var(--color-adaline-ink)]/35">{child.secteur}</span>
                            {child.densitePlantation && (
                              <span className="text-[10px] text-[var(--color-adaline-ink)]/35">{child.densitePlantation} {child.densiteUnit}</span>
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
              <button
                type="button"
                onClick={clearParcelleSelection}
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-adaline-ink)]/55 hover:text-[var(--color-valley-green)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour à la liste
              </button>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-5 h-5 rounded-lg border-2 shrink-0"
                    style={{ borderColor: selectedParcelle.color || "#6b9e7a", backgroundColor: (selectedParcelle.color || "#6b9e7a") + "20" }}
                  />
                  <h3 className="text-lg font-bold text-[var(--color-adaline-ink)]/85 truncate">{selectedParcelle.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/trace/${selectedParcelle.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/10 transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Traçabilité
                  </Link>
                  <button
                    type="button"
                    onClick={clearParcelleSelection}
                    aria-label="Fermer la fiche parcelle"
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!selectedParcelle.parentId && (
                <button
                  onClick={() => { startDrawingSubParcelle(selectedParcelle); clearParcelleSelection(); }}
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
                        onClick={() => selectParcelle(child)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left group"
                      >
                        <div
                          className="w-3.5 h-3.5 rounded shrink-0"
                          style={{ backgroundColor: child.color || "#6b9e7a", border: `1.5px solid ${child.color || "#6b9e7a"}` }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-[var(--color-adaline-ink)]/70 group-hover:text-[var(--color-adaline-ink)]/90 block truncate">{child.name}</span>
                          <span className="text-[10px] text-[var(--color-adaline-ink)]/40">{child.variete || child.cropType} · {formatHectares(child.areaHectares)}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/20 group-hover:text-[var(--color-adaline-ink)]/50 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              <SectionTitle icon={Droplets} title="Traitements" />
              <div className="space-y-0 mb-4">
                <DetailRow label="Nombre total" value={String(selectedParcelle.treatmentCount ?? 0)} />
                <DetailRow label="Dernier traitement" value={
                  selectedParcelle.lastTreatmentDate
                    ? new Date(selectedParcelle.lastTreatmentDate).toLocaleDateString("fr-FR")
                    : "Jamais"
                } />
              </div>

              {/* Historique CTA */}
              <button
                onClick={() => setHistoryOpen(true)}
                className="w-full mb-3 flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-valley-green)]/25 bg-[var(--color-forest-dew)] hover:bg-[var(--green-010)] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-[var(--color-valley-green)]" />
                  <span className="text-sm font-semibold text-[var(--color-valley-green)]">Voir l'historique complet</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[var(--color-valley-green)] bg-[var(--color-valley-green)]/10 px-2 py-0.5 rounded-full">
                    {treatments.filter((t: any) =>
                      t.parcelleName === selectedParcelle.name ||
                      t.parcelleId === selectedParcelle.id ||
                      t.sousParcelleId === selectedParcelle.id
                    ).length} traitements
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-valley-green)] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Filtrer par cette zone CTA */}
              <button
                onClick={() => {
                  setSelectedZoneFilter(selectedParcelle);
                  setActiveTab("treatments");
                  setSelectedTreatmentItem(null);
                }}
                className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Filter className="w-4 h-4 text-[var(--color-adaline-ink)]/50" />
                  <span className="text-sm font-semibold text-[var(--color-adaline-ink)]/70">Filtrer l'historique de cette zone</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-adaline-ink)]/30 group-hover:translate-x-0.5 transition-transform animate-pulse" />
              </button>

              {selectedParcelle.observations && (
                <>
                  <SectionTitle icon={Info} title="Observations" />
                  <p className="text-xs text-[var(--color-adaline-ink)]/50 leading-relaxed mb-5">{selectedParcelle.observations}</p>
                </>
              )}

              <button
                onClick={() => setScheduleOpen(true)}
                className="w-full glass-button py-2.5 text-sm mt-2 flex items-center justify-center gap-2"
              >
                <Droplets className="w-4 h-4" />
                Planifier un traitement
              </button>

              {/* Edit / Delete actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditModal({ open: true, name: selectedParcelle.name, cropType: selectedParcelle.cropType, color: selectedParcelle.color })}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-[var(--color-stone-moss)] bg-white/[0.04] text-[var(--color-adaline-ink)]/60 hover:bg-white/[0.08] hover:text-[var(--color-adaline-ink)]/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3 h-3" />
                  Modifier
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex-1 py-2 text-xs font-medium rounded-xl border border-[var(--color-valley-green)]/20 bg-[var(--color-valley-green)]/[0.06] text-[var(--color-valley-green)]/70 hover:bg-[var(--color-valley-green)]/[0.12] hover:text-[var(--color-valley-green)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {/* ═══ TREATMENTS TAB ═══ */}
        {activeTab === "treatments" && (
        <>
          {/* Treatment list panel */}
          <div className={cn(selectedTreatmentItem ? "col-span-12 lg:col-span-7" : "col-span-12")}>
            {/* Search + Filters */}
            <div className="glass-card p-4 mb-4">
              {/* Search bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-adaline-ink)]/35" />
                <input
                  type="text"
                  value={treatmentSearch}
                  onChange={(e) => setTreatmentSearch(e.target.value)}
                  placeholder="Rechercher par parcelle, opérateur, type..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-[var(--color-stone-moss)] text-sm text-[var(--color-adaline-ink)]/90 placeholder:text-[var(--color-adaline-ink)]/30 focus:border-[var(--color-valley-green)]/40 focus:outline-none transition-colors"
                />
              </div>

              {/* Active Zone Filter Badge */}
              {selectedZoneFilter && (
                <div className="flex items-center gap-2 mb-3 animate-fade-in">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: selectedZoneFilter.color || "#10b981" }} />
                    Zone filtrée : <span className="font-bold">{selectedZoneFilter.name}</span>
                    <button
                      onClick={() => setSelectedZoneFilter(null)}
                      className="ml-1.5 p-0.5 rounded-full hover:bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]/70 hover:text-[var(--color-valley-green)] transition-all flex items-center justify-center"
                      title="Effacer le filtre de zone"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Status filter pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/35 mr-1" />
                {([
                  { key: "all", label: "Tous" },
                  { key: "completed", label: "Terminé" },
                  { key: "in_progress", label: "En cours" },
                  { key: "planned", label: "Planifié" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTreatmentFilter(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      treatmentFilter === key
                        ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)] border-[var(--color-valley-green)]/25 shadow-sm"
                        : "bg-white/[0.03] text-[var(--color-adaline-ink)]/50 border-white/[0.08] hover:bg-white/[0.06] hover:text-[var(--color-adaline-ink)]/70"
                    )}
                  >
                    {key !== "all" && (
                      <div className={cn("w-2 h-2 rounded-full", TREATMENT_STATUS_CONFIG[key]?.dotColor || "bg-slate-400")} />
                    )}
                    {label}
                    <span className={cn(
                      "text-[10px] font-bold px-1 py-px rounded",
                      treatmentFilter === key
                        ? "bg-[var(--color-valley-green)]/20"
                        : "bg-white/[0.08]"
                    )}>{treatmentCounts[key]}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-[var(--color-adaline-ink)]/45 mb-3">
              Cliquez un traitement pour afficher sa trajectoire et centrer la parcelle sur la carte.
            </p>
            {/* Treatment cards list */}
            <div className="space-y-2">
              {filteredTreatmentsList.length === 0 && (
                <div className="glass-card p-8 text-center">
                  <FlaskConical className="w-10 h-10 text-[var(--color-adaline-ink)]/20 mx-auto mb-3" />
                  <p className="text-sm text-[var(--color-adaline-ink)]/50">Aucun traitement trouvé</p>
                  <p className="text-xs text-[var(--color-adaline-ink)]/30 mt-1">Modifiez vos filtres ou recherche</p>
                </div>
              )}
              {filteredTreatmentsList.map((t: any) => {
                const statusConf = TREATMENT_STATUS_CONFIG[t.status] || TREATMENT_STATUS_CONFIG.draft;
                const isSelected = selectedTreatmentItem?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTreatment(t)}
                    className={cn(
                      "glass-card p-4 cursor-pointer transition-all hover:border-[var(--color-valley-green)]/20",
                      isSelected && "border-[var(--color-valley-green)]/40 bg-[var(--color-valley-green)]/[0.04]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", statusConf.dotColor)} />
                          <span className="text-sm font-semibold text-[var(--color-adaline-ink)]/85 truncate inline-flex items-center gap-1">
                            {t.parcelleName || "Parcelle inconnue"}
                            {isSelected && <MapPin className="w-3 h-3 text-[var(--color-valley-green)] shrink-0" />}
                          </span>
                          {t.sousParcelleNom && (
                            <span className="text-[10px] text-[var(--color-adaline-ink)]/40 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">
                              {t.sousParcelleNom}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[11px] text-[var(--color-adaline-ink)]/55 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(t.plannedDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          {t.operatorName && (
                            <span className="text-[11px] text-[var(--color-adaline-ink)]/45 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {t.operatorName}
                            </span>
                          )}
                          {t.type && (
                            <span className="text-[11px] text-[var(--color-adaline-ink)]/45">
                              {t.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-md border", statusConf.badgeClass)}>
                          {statusConf.label}
                        </span>
                        {isSelected && loadingTrajectory && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-valley-green)]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Treatment detail panel */}
          {selectedTreatmentItem && (
            <div className="col-span-12 lg:col-span-5">
              <div className="glass-card p-5 sticky top-[90px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-3 h-3 rounded-full shrink-0", TREATMENT_STATUS_CONFIG[selectedTreatmentItem.status]?.dotColor || "bg-slate-400")} />
                    <h3 className="text-base font-bold text-[var(--color-adaline-ink)]/85 truncate">
                      {selectedTreatmentItem.parcelleName || "Traitement"}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setSelectedTreatmentItem(null); setTreatmentTrajectory(null); setIsSimPlaying(false); setSimRawPoints([]); }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status badge */}
                <div className="mb-4">
                  <span className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-lg border",
                    TREATMENT_STATUS_CONFIG[selectedTreatmentItem.status]?.badgeClass || "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  )}>
                    {TREATMENT_STATUS_CONFIG[selectedTreatmentItem.status]?.label || selectedTreatmentItem.status}
                  </span>
                </div>

                {/* Detail rows */}
                <div className="space-y-2.5 mb-5">
                  {[
                    { icon: Calendar, label: "Date planifiée", value: selectedTreatmentItem.plannedDate ? new Date(selectedTreatmentItem.plannedDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
                    { icon: User, label: "Opérateur", value: selectedTreatmentItem.operatorName || "—" },
                    { icon: FlaskConical, label: "Type", value: selectedTreatmentItem.type || "—" },
                    { icon: MapPin, label: "Parcelle", value: selectedTreatmentItem.parcelleName || "—" },
                    { icon: AreaChart, label: "Surface traitée", value: selectedTreatmentItem.areaTreatedHectares ? `${selectedTreatmentItem.areaTreatedHectares.toFixed(2)} ha` : "—" },
                    { icon: Droplets, label: "Volume bouillie", value: selectedTreatmentItem.volumeBouillie ? `${selectedTreatmentItem.volumeBouillie} ${selectedTreatmentItem.volumeBouillieUnit || "L"}` : "—" },
                    { icon: Clock, label: "Heure début/fin", value: selectedTreatmentItem.heure_debut ? `${selectedTreatmentItem.heure_debut}${selectedTreatmentItem.heure_fin ? ` → ${selectedTreatmentItem.heure_fin}` : ""}` : "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 py-1.5 border-b border-white/[0.05] last:border-0">
                      <Icon className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/30 shrink-0" />
                      <span className="text-[11px] text-[var(--color-adaline-ink)]/45 w-28 shrink-0">{label}</span>
                      <span className="text-xs text-[var(--color-adaline-ink)]/80 font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Simulation controls */}
                {simRawPoints.length > 0 && (
                  <div className="glass-card p-3 mb-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-adaline-ink)]/40">
                        Simulation trajectoire
                      </span>
                      <span className="text-[10px] text-[var(--color-adaline-ink)]/35 font-mono">
                        {simIndex + 1}/{simRawPoints.length} pts
                      </span>
                    </div>

                    {/* Interactive timeline scrubber slider */}
                    <div className="relative mb-3 flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={simRawPoints.length - 1}
                        value={simIndex}
                        onChange={(e) => {
                          setSimIndex(parseInt(e.target.value));
                          setIsSimPlaying(false);
                        }}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--color-valley-green)]"
                      />
                    </div>

                    {/* Live telemetry dashboard card grid */}
                    {(isSimPlaying || simIndex > 0) && simPosition && (
                      <div className="grid grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-black/30 border border-white/[0.06] mb-3.5 animate-fade-in">
                        {/* Heading & direction */}
                        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/[0.02]">
                          <span className="text-[9px] text-[var(--color-adaline-ink)]/35 uppercase tracking-wider block mb-1">Cap</span>
                          <div className="flex items-center gap-1">
                            <Navigation
                              className="w-3.5 h-3.5 text-[var(--color-valley-green)] transition-transform duration-200"
                              style={{ transform: `rotate(${heading}deg)` }}
                            />
                            <span className="text-xs font-mono font-bold text-[var(--color-adaline-ink)]/85">
                              {heading >= 0 ? Math.round(heading) : Math.round(360 + heading)}°
                            </span>
                          </div>
                        </div>

                        {/* Instant Speed */}
                        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/[0.02]">
                          <span className="text-[9px] text-[var(--color-adaline-ink)]/35 uppercase tracking-wider block mb-1">Vitesse</span>
                          <span className={cn(
                            "text-xs font-mono font-bold block",
                            simPosition.speed > 12 ? "text-red-400" :
                            simPosition.speed >= 6 ? "text-emerald-400" : "text-amber-400"
                          )}>
                            {simPosition.speed.toFixed(1)} km/h
                          </span>
                        </div>

                        {/* Simulated flow rate (depends on speed) */}
                        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/[0.02]">
                          <span className="text-[9px] text-[var(--color-adaline-ink)]/35 uppercase tracking-wider block mb-1">Débit</span>
                          <span className="text-xs font-mono font-bold text-[var(--color-valley-green)]">
                            {simPosition.speed > 0 ? (12.5 + (simPosition.speed - 8) * 0.4).toFixed(1) : "0.0"} L/min
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsSimPlaying(!isSimPlaying)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          isSimPlaying
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        )}
                      >
                        {isSimPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSimIndex(0); setIsSimPlaying(false); }}
                        className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[var(--color-adaline-ink)]/50 hover:text-[var(--color-adaline-ink)]/80 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Speed selector */}
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[10px] text-[var(--color-adaline-ink)]/35 mr-1">Vitesse</span>
                        {[1, 3, 5, 10].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSimSpeed(s)}
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-1 rounded transition-all",
                              simSpeed === s
                                ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)]"
                                : "text-[var(--color-adaline-ink)]/35 hover:text-[var(--color-adaline-ink)]/60"
                            )}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {loadingTrajectory && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-adaline-ink)]/50 mb-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Chargement de la trajectoire GPS...
                  </div>
                )}

                {/* Trajectory legend */}
                {treatmentTrajectory && (
                  <div className="glass-card p-3 mb-4" style={{ background: "rgba(0,0,0,0.15)" }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-adaline-ink)]/40 block mb-2">
                      Légende trajectoire
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-adaline-ink)]/55">
                        <div className="w-3 h-1 rounded-full bg-emerald-500" /> Débit normal
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-adaline-ink)]/55">
                        <div className="w-3 h-1 rounded-full bg-amber-500" /> Débit moyen
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-adaline-ink)]/55">
                        <div className="w-3 h-1 rounded-full bg-red-500" /> Débit faible
                      </span>
                    </div>
                  </div>
                )}

                {/* Products section */}
                {selectedTreatmentItem.products?.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.08] mb-4">
                    <p className="text-[10px] text-[var(--color-adaline-ink)]/40 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                      Produits utilisés
                    </p>
                    <div className="space-y-1.5">
                      {selectedTreatmentItem.products.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                          <div className="flex items-center gap-2 min-w-0">
                            <FlaskConical className="w-3.5 h-3.5 text-[var(--color-valley-green)] shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs text-[var(--color-adaline-ink)]/75 truncate block font-medium">{p.productName}</span>
                              {p.dosePerHectare && (
                                <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">
                                  {p.dosePerHectare} {p.unit || "L"}/ha
                                </span>
                              )}
                            </div>
                          </div>
                          {p.quantityUsed && (
                            <span className="text-xs font-bold text-[var(--color-valley-green)] font-mono shrink-0">
                              -{p.quantityUsed} {p.unit || "L"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weather section */}
                {(selectedTreatmentItem.weatherConditions || selectedTreatmentItem.temperature || selectedTreatmentItem.windSpeed || selectedTreatmentItem.humidity) && (
                  <div className="pt-3 border-t border-white/[0.08] mb-4">
                    <p className="text-[10px] text-[var(--color-adaline-ink)]/40 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                      Météo réelle
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedTreatmentItem.weatherConditions && (
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-[var(--color-adaline-ink)]/60">
                          <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">Conditions</span>
                          {selectedTreatmentItem.weatherConditions}
                        </div>
                      )}
                      {selectedTreatmentItem.temperature !== undefined && selectedTreatmentItem.temperature !== null && (
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-[var(--color-adaline-ink)]/60">
                          <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">Température</span>
                          {selectedTreatmentItem.temperature} °C
                        </div>
                      )}
                      {selectedTreatmentItem.windSpeed !== undefined && selectedTreatmentItem.windSpeed !== null && (
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-[var(--color-adaline-ink)]/60">
                          <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">Vent</span>
                          {selectedTreatmentItem.windSpeed} km/h
                        </div>
                      )}
                      {selectedTreatmentItem.humidity !== undefined && selectedTreatmentItem.humidity !== null && (
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-[var(--color-adaline-ink)]/60">
                          <span className="text-[10px] text-[var(--color-adaline-ink)]/40 block">Humidité</span>
                          {selectedTreatmentItem.humidity} %
                        </div>
                      )}

                      {/* Premium agricultural regulatory weather compliance alerts */}
                      {weatherWarnings.length > 0 && (
                        <div className="col-span-2 mt-2 space-y-1.5 animate-fade-in">
                          {weatherWarnings.map((w, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start gap-1.5 p-2 rounded-lg text-[10px] leading-relaxed border",
                                w.type === "danger"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              )}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0 mt-1" />
                              <span>{w.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Visa section */}
                {selectedTreatmentItem.visa_rt && (
                  <div className="pt-3 border-t border-white/[0.08] mb-4">
                    <p className="text-[10px] text-[var(--color-adaline-ink)]/40 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                      Visas & Signatures
                    </p>
                    <div className="p-3 rounded-xl bg-[var(--color-valley-green)]/[0.04] border border-[var(--color-valley-green)]/15 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/35 flex items-center justify-center text-[var(--color-valley-green)] text-[10px] font-bold">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-[var(--color-adaline-ink)]/80 font-medium block">Visa Responsable Technique</span>
                        <span className="text-[10px] text-[var(--color-valley-green)] font-mono truncate block">{selectedTreatmentItem.visa_rt}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08]">
                  <button
                    disabled={exportingPdf}
                    onClick={() => telechargerOrdre(selectedTreatmentItem.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/25 transition-all disabled:opacity-40"
                  >
                    {exportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Ordre PDF FOR.PR6.003
                  </button>
                  <Link
                    href={`/treatments?id=${selectedTreatmentItem.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl border border-white/[0.12] text-[var(--color-adaline-ink)]/60 hover:text-[var(--color-adaline-ink)]/90 hover:bg-white/[0.06] transition-colors"
                  >
                    Fiche Complète
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
        )}
      </div>
      <div className="h-8" />
      <ScheduleTreatmentModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        initialParcelleName={selectedParcelle?.name}
        initialParcelleId={selectedParcelle?.id}
      />

      {/* ═══ HISTORIQUE MODAL ═══ */}
      {historyOpen && selectedParcelle && (
        <HistoriqueModal
          parcelle={selectedParcelle}
          treatments={treatments}
          onClose={() => setHistoryOpen(false)}
          onPlanifier={() => { setHistoryOpen(false); setScheduleOpen(true); }}
        />
      )}

      {/* ═══ GIS SPATIAL THEATER OVERLAY ═══ */}
      {isTheaterMode && (
        <div className="fixed inset-0 z-[1500] bg-[#071007]/97 backdrop-blur-xl flex flex-col p-4 overflow-hidden text-[var(--color-adaline-ink)] animate-page-enter">
          {/* Top Control Bar HUD */}
          <div className="mb-4 flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/10">
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                CENTRE D'EXPLORATION SPATIALE LEADFARM
              </h2>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">Tlemcen, Algérie · IoT Precision GIS Control Center</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Signalement Mode Toggle */}
              <button
                onClick={() => {
                  setIsPinMode(!isPinMode);
                  setPendingPinCoords(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer",
                  isPinMode
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                )}
              >
                <span>📌</span>
                {isPinMode ? "Mode Signalement : ACTIF" : "Mode Signalement : INACTIF"}
              </button>

              {/* Close Theater Button */}
              <button
                onClick={() => {
                  setIsTheaterMode(false);
                  setIsPinMode(false);
                  setPendingPinCoords(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" /> Quitter Exploration
              </button>
            </div>
          </div>

          {/* Main content grid (Left HUD | Map | Right HUD) */}
          <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden relative">
            
            {/* Left HUD Panel (Geo-Pins) */}
            <div className="col-span-3 flex flex-col gap-3 h-full overflow-hidden max-h-[82vh]">
              {/* Pin Mode Instruction Alert */}
              {isPinMode && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed animate-pulse">
                  <span className="font-bold">Astuce:</span> Cliquez n'importe où sur la carte pour déposer une note d'observation agricole (maladies, fuites, etc.).
                </div>
              )}

              {/* Geo-Notes List */}
              <div className="flex-1 flex flex-col p-4 rounded-2xl bg-black/30 border border-white/10 overflow-hidden h-full">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📝</span>
                  Geo-Notes & Alertes ({geoPins.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {geoPins.map((pin) => {
                    const colors = { pest: "text-amber-400 border-amber-500/20 bg-amber-500/5", irrigation: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5", weed: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", other: "text-purple-400 border-purple-500/20 bg-purple-500/5" };
                    return (
                      <div
                        key={pin.id}
                        onClick={() => setFocusCoords([pin.lat, pin.lng])}
                        className={cn("p-3 rounded-xl border cursor-pointer hover:border-white/20 transition-all text-left", colors[pin.type as "pest" | "irrigation" | "weed" | "other"] || "border-white/10")}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {pin.type === "pest" ? "🐛 Ravageur" : pin.type === "irrigation" ? "💧 Irrigation" : pin.type === "weed" ? "🌾 Mauvaises Herbes" : "📌 Autre"}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">{new Date(pin.createdAt).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{pin.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Central Map Workspace */}
            <div className="col-span-6 h-full flex flex-col relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <ParcelleMap
                parcelles={parcelles}
                drawMode={false}
                hideHud={true}
                trajectory={selectedTreatmentItem ? treatmentTrajectory : null}
                simulationPosition={selectedTreatmentItem && (isSimPlaying || simIndex > 0) ? simPosition : null}
                highlightParcelleId={selectedTreatmentItem ? selectedTreatmentItem.parcelleId : null}
                geoPins={geoPins}
                isTheaterMode={true}
                focusCoordinates={focusCoords}
                onViewportBoundsChange={(bounds) => setViewportBounds(bounds)}
                onMapClick={handleMapClick}
                onTheaterToggle={() => { setIsTheaterMode(false); setIsPinMode(false); setPendingPinCoords(null); }}
                onParcelleClick={(id: string) => {
                  const all = parcelles.flatMap((p: Parcelle) => [p, ...(p.children || [])]);
                  const found = all.find((p: Parcelle) => p.id === id);
                  if (found) selectParcelle(found);
                }}
              />

              {/* Dynamic Overlay simulation controls inside the map */}
              {selectedTreatmentItem && simRawPoints.length > 0 && (
                <div className="absolute bottom-4 inset-x-4 z-[1000] p-4 rounded-2xl bg-[#091509]/92 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-3">
                  {/* Replay tracking */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">REPLAY SIMULATION</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{simIndex + 1}/{simRawPoints.length} points</span>
                  </div>
                  {/* Slider */}
                  <input
                    type="range"
                    min={0}
                    max={simRawPoints.length - 1}
                    value={simIndex}
                    onChange={(e) => { setSimIndex(parseInt(e.target.value)); setIsSimPlaying(false); }}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsSimPlaying(!isSimPlaying)} className={cn("p-2 rounded-xl border transition-all text-xs font-semibold cursor-pointer", isSimPlaying ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400")}>
                        {isSimPlaying ? "Pause" : "Play"}
                      </button>
                      <button onClick={() => { setSimIndex(0); setIsSimPlaying(false); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-all text-xs cursor-pointer">
                        Reset
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-zinc-400">Vitesse :</span>
                      <div className="flex items-center gap-1">
                        {[1, 3, 5, 10].map((s) => (
                          <button key={s} onClick={() => setSimSpeed(s)} className={cn("px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer", simSpeed === s ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "text-zinc-500 hover:text-zinc-300")}>
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right HUD Panel (Visible Analytics) */}
            <div className="col-span-3 flex flex-col gap-4 h-full overflow-hidden max-h-[82vh]">
              {/* Visible Stats KPI card */}
              <div className="p-5 rounded-2xl bg-black/30 border border-white/10">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>📊</span>
                  Analyse de la Zone Visible
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-2xl font-black text-emerald-400 font-mono">{visibleStats.hectares.toFixed(2)} ha</span>
                    <span className="text-[10px] text-zinc-400 uppercase block tracking-wider mt-0.5">Surface visible</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <span className="text-xl font-bold text-white font-mono">{visibleStats.parcellesCount}</span>
                    <span className="text-[10px] text-zinc-400 uppercase block tracking-wider mt-0.5">Zones & Plantations</span>
                  </div>
                </div>
              </div>

              {/* Crop Type distribution visual card */}
              <div className="flex-1 p-5 rounded-2xl bg-black/30 border border-white/10 overflow-hidden flex flex-col">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
                  🌾 Répartition des Cultures
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                  {Object.entries(visibleStats.cultureDist).length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-8">Aucune culture dans la vue</p>
                  ) : (
                    Object.entries(visibleStats.cultureDist).map(([crop, ha]) => (
                      <div key={crop} className="space-y-1.5 text-left">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-semibold">{crop}</span>
                          <span className="text-emerald-400 font-bold font-mono">{ha.toFixed(2)} ha</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, (ha / (visibleStats.hectares || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* New GeoPin Form Modal Overlay */}
          {pendingPinCoords && (
            <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/70 animate-page-enter" onClick={() => setPendingPinCoords(null)}>
              <div className="p-6 rounded-2xl bg-[#091509] border border-white/15 w-full max-w-md shadow-2xl text-left" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>📌</span> Signaler une Observation
                  </h3>
                  <button onClick={() => setPendingPinCoords(null)} className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Lat/lng indicator */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-zinc-400 font-mono text-[10px]">
                    Coordonnées : {pendingPinCoords.lat.toFixed(5)}, {pendingPinCoords.lng.toFixed(5)}
                  </div>

                  {/* Type Selector */}
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1.5 font-bold">Type d'Observation</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([["pest", "🐛 Ravageur"], ["irrigation", "💧 Irrigation"], ["weed", "🌾 Mauvaises Herbes"], ["other", "📌 Autre"]] as const).map(([type, label]) => (
                        <button
                          key={type}
                          onClick={() => setNewPinType(type)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer",
                            newPinType === type
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note text field */}
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1.5 font-bold">Note / Description</label>
                    <textarea
                      value={newPinNote}
                      onChange={(e) => setNewPinNote(e.target.value)}
                      placeholder="Décrivez ce que vous observez à cet endroit..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 outline-none text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500/40 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setPendingPinCoords(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (!newPinNote.trim()) return;
                      const newPin = {
                        id: `pin-${Date.now()}`,
                        lat: pendingPinCoords.lat,
                        lng: pendingPinCoords.lng,
                        type: newPinType,
                        note: newPinNote.trim(),
                        createdAt: new Date().toISOString(),
                      };
                      setGeoPins((prev) => [newPin, ...prev]);
                      setPendingPinCoords(null);
                      setNewPinNote("");
                    }}
                    disabled={!newPinNote.trim()}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      newPinNote.trim()
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-white/5 text-zinc-600 border border-white/5"
                    )}
                  >
                    Placer la Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 " onClick={() => setShowQuitConfirm(false)}>
          <div className="glass-card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-[var(--color-valley-green)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--color-adaline-ink)]/90 mb-1">Abandonner le dessin ?</h3>
            <p className="text-sm text-[var(--color-adaline-ink)]/50 mb-6">
              Vous perdrez les {drawnPoints.length} points tracés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-sm text-[var(--color-adaline-ink)]/70 hover:bg-white/[0.05] transition-colors"
              >
                Continuer
              </button>
              <button
                onClick={cancelDraw}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-sm text-[var(--color-valley-green)] font-semibold hover:bg-[var(--color-valley-green)]/30 transition-colors"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT PARCELLE MODAL ═══ */}
      {editModal.open && selectedParcelle && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 " onClick={() => setEditModal({ ...editModal, open: false })}>
          <div className="glass-card w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--color-adaline-ink)]/90">Modifier la parcelle</h3>
              <button onClick={() => setEditModal({ ...editModal, open: false })} className="p-1 rounded-lg hover:bg-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[var(--color-adaline-ink)]/50 font-medium uppercase tracking-wider block mb-1">Nom</label>
                <input
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="glass-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-adaline-ink)]/50 font-medium uppercase tracking-wider block mb-1">Culture</label>
                <select
                  value={editModal.cropType}
                  onChange={(e) => setEditModal({ ...editModal, cropType: e.target.value })}
                  className="glass-input w-full px-3 py-2 text-sm bg-[var(--color-canvas-ice)]"
                >
                  {Object.entries(cultureTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-adaline-ink)]/50 font-medium uppercase tracking-wider block mb-1">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editModal.color}
                    onChange={(e) => setEditModal({ ...editModal, color: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-[var(--color-stone-moss)] cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-[var(--color-adaline-ink)]/40 font-mono">{editModal.color}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditModal({ ...editModal, open: false })}
                className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/60 hover:bg-white/[0.06] transition-colors"
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
                    clearParcelleSelection();
                  } catch (err) {
                    alert((err as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 " onClick={() => setDeleteConfirm(false)}>
          <div className="glass-card w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/25 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[var(--color-valley-green)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-adaline-ink)]/90">Supprimer la parcelle</h3>
                <p className="text-[11px] text-[var(--color-adaline-ink)]/40">{selectedParcelle.name}</p>
              </div>
            </div>

            <p className="text-xs text-[var(--color-adaline-ink)]/60 leading-relaxed mb-4">
              {(selectedParcelle.children?.length || 0) > 0
                ? <>Cette parcelle contient <b className="text-[var(--color-valley-green)]">{selectedParcelle.children?.length} sous-parcelle(s)</b> qui seront aussi supprimées. Cette action est irréversible.</>
                : <>Cette action est irréversible. La parcelle et toutes ses données associées seront supprimées.</>
              }
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/60 hover:bg-white/[0.06] transition-colors"
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
                    clearParcelleSelection();
                  } catch (err) {
                    alert((err as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
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

// ─── Historique Modal ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  completed: "Terminé",
  in_progress: "En cours",
  planned: "Planifié",
  cancelled: "Annulé",
};

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-[var(--green-010)] text-[var(--color-valley-green)] border-[var(--green-020)]",
  in_progress: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  planned: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STATUS_DOT: Record<string, string> = {
  completed: "bg-[var(--color-valley-green)]",
  in_progress: "bg-amber-500",
  planned: "bg-blue-500",
  cancelled: "bg-red-500",
};

type HistoriqueFilter = "all" | "completed" | "planned" | "in_progress" | "cancelled";

function HistoriqueModal({
  parcelle,
  treatments,
  onClose,
  onPlanifier,
}: {
  parcelle: Parcelle;
  treatments: any[];
  onClose: () => void;
  onPlanifier: () => void;
}) {
  const [filter, setFilter] = useState<HistoriqueFilter>("all");

  // Match treatments by name or ID
  const parcelleTreatments = treatments
    .filter((t: any) =>
      t.parcelleName === parcelle.name ||
      t.parcelleId === parcelle.id ||
      t.sousParcelleId === parcelle.id
    )
    .sort((a: any, b: any) =>
      new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime()
    );

  const filtered =
    filter === "all"
      ? parcelleTreatments
      : parcelleTreatments.filter((t: any) => t.status === filter);

  const counts = {
    all: parcelleTreatments.length,
    completed: parcelleTreatments.filter((t: any) => t.status === "completed").length,
    in_progress: parcelleTreatments.filter((t: any) => t.status === "in_progress").length,
    planned: parcelleTreatments.filter((t: any) => t.status === "planned").length,
    cancelled: parcelleTreatments.filter((t: any) => t.status === "cancelled").length,
  };

  const totalSurface = parcelleTreatments
    .filter((t: any) => t.status === "completed")
    .reduce((s: number, t: any) => s + (t.areaTreatedHectares || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[9998] flex"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--color-adaline-ink)]/20 backdrop-blur-sm" />

      {/* Panel — slides in from right */}
      <div
        className="relative ml-auto h-full w-full max-w-2xl bg-[var(--surface-pure)] border-l border-[var(--color-mist-gray)] shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-stone-moss)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--black-006)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-lg border-2 flex-shrink-0"
              style={{
                borderColor: parcelle.color || "#6b9e7a",
                backgroundColor: (parcelle.color || "#6b9e7a") + "20",
              }}
            />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Historique — {parcelle.name}</h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {parcelle.cropType}{parcelle.variete ? ` · ${parcelle.variete}` : ""} · {formatHectares(parcelle.areaHectares)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--black-006)] text-[var(--text-tertiary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-[var(--color-stone-moss)]">
          <div className="text-center">
            <p className="text-2xl font-black text-[var(--text-primary)]">{parcelleTreatments.length}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium mt-0.5">Total traitements</p>
          </div>
          <div className="text-center border-x border-[var(--color-stone-moss)]">
            <p className="text-2xl font-black text-[var(--color-valley-green)]">{counts.completed}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium mt-0.5">Terminés</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-[var(--text-primary)] font-mono">{totalSurface.toFixed(1)} ha</p>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium mt-0.5">Surface traitée</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--color-stone-moss)] overflow-x-auto">
          {(["all", "completed", "in_progress", "planned", "cancelled"] as HistoriqueFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border",
                filter === f
                  ? "bg-[var(--color-valley-green)] text-[var(--color-canvas-ice)] border-[var(--color-valley-green)] shadow-sm"
                  : "border-[var(--color-mist-gray)] text-[var(--text-secondary)] hover:border-[var(--color-valley-green)]/40 hover:text-[var(--text-primary)]"
              )}
            >
              {f !== "all" && (
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[f] || "bg-gray-400")} />
              )}
              {f === "all" ? "Tous" : STATUS_LABELS[f]}
              <span className={cn(
                "text-[9px] font-bold px-1 py-0.5 rounded",
                filter === f ? "bg-white/20" : "bg-[var(--black-006)]"
              )}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Timeline list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--black-004)] border border-[var(--color-mist-gray)] flex items-center justify-center mb-4">
                <History className="w-7 h-7 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Aucun traitement</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {filter === "all" ? "Aucun traitement enregistré pour cette parcelle." : `Aucun traitement avec le statut "${STATUS_LABELS[filter]}".`}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--color-stone-moss)]" />

              <div className="space-y-3">
                {filtered.map((t: any, idx: number) => {
                  const dateStr = t.plannedDate
                    ? new Date(t.plannedDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—";
                  const products: any[] = t.products || [];
                  const statusBadge = STATUS_BADGE[t.status] || STATUS_BADGE.planned;
                  const statusDot = STATUS_DOT[t.status] || "bg-gray-400";

                  return (
                    <div key={t.id || idx} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative flex-shrink-0 mt-3.5">
                        <div className={cn("w-5 h-5 rounded-full border-2 border-[var(--surface-pure)] flex items-center justify-center", statusDot)}>
                          <div className="w-2 h-2 rounded-full bg-white/60" />
                        </div>
                      </div>

                      {/* Card */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="glass-card p-4 hover:border-[var(--color-valley-green)]/20 transition-colors">
                          {/* Row 1: date + status */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                                <span className="text-xs font-semibold text-[var(--text-primary)]">{dateStr}</span>
                              </div>
                              <p className="text-[11px] text-[var(--text-tertiary)] pl-5">
                                {t.type || "Traitement"}
                                {t.operatorName && ` · ${t.operatorName}`}
                              </p>
                            </div>
                            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0", statusBadge)}>
                              {STATUS_LABELS[t.status] || t.status}
                            </span>
                          </div>

                          {/* Row 2: Tracabilité — Qui / Quand / Où */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                            {t.operatorName && (
                              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                                <User className="w-3 h-3 text-[var(--color-valley-green)] shrink-0" />
                                <span className="font-semibold">{t.operatorName}</span>
                              </span>
                            )}
                            {(t.heure_debut || t.heure_fin) && (
                              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                                <Clock className="w-3 h-3 text-[var(--color-valley-green)] shrink-0" />
                                {t.heure_debut}{t.heure_fin ? ` → ${t.heure_fin}` : ""}
                              </span>
                            )}
                            {t.executedDate && t.executedDate !== t.plannedDate && (
                              <span className="flex items-center gap-1.5 text-[10px] text-amber-600 col-span-2">
                                <Calendar className="w-3 h-3 shrink-0" />
                                Réalisé le {new Date(t.executedDate).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                            {t.areaTreatedHectares > 0 && (
                              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                                <AreaChart className="w-3 h-3 shrink-0" />
                                {formatHectares(t.areaTreatedHectares)} traités
                              </span>
                            )}
                            {t.volumeBouillie && (
                              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-mono">
                                <Droplets className="w-3 h-3 shrink-0" />
                                {t.volumeBouillie} {t.volumeBouillieUnit || "L"} bouillie
                              </span>
                            )}
                          </div>

                          {/* Row 3: Produits with tracabilité */}
                          {products.length > 0 && (
                            <div className="mb-2 rounded-lg bg-[var(--black-004)] border border-[var(--color-stone-moss)] overflow-hidden">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[var(--color-stone-moss)]">
                                <FlaskConical className="w-3 h-3 text-[var(--color-valley-green)]" />
                                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Produits phytosanitaires</span>
                              </div>
                              <div className="divide-y divide-[var(--color-stone-moss)]">
                                {products.map((p: any, pi: number) => {
                                  const planned = p.quantite_sortir || null;
                                  const used = p.quantityUsed || null;
                                  const reste = planned && used ? (parseFloat(planned) - parseFloat(used)).toFixed(2) : null;
                                  return (
                                    <div key={pi} className="px-2.5 py-2">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[11px] text-[var(--text-primary)] font-semibold truncate">
                                          {p.productName || p.nom_commercial || "—"}
                                        </span>
                                        {p.matiere_active && (
                                          <span className="text-[9px] text-[var(--text-tertiary)] italic truncate">{p.matiere_active}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 flex-wrap text-[10px] font-mono">
                                        {p.dose_hl && <span className="text-[var(--color-valley-green)]">{p.dose_hl}/hl</span>}
                                        {p.dosePerHectare && <span className="text-[var(--color-valley-green)]">{p.dosePerHectare} {p.unit || "L"}/ha</span>}
                                        {planned && <span className="text-[var(--text-secondary)]">Prévu: {planned}</span>}
                                        {used && <span className="text-amber-600">Utilisé: {used} {p.unit || "L"}</span>}
                                        {reste && <span className={parseFloat(reste) >= 0 ? "text-blue-600" : "text-red-500"}>Reste: {reste}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Row 4: DAR + météo */}
                          <div className="flex items-center gap-3 flex-wrap pt-1.5 border-t border-[var(--color-stone-moss)]">
                            {t.dar_jours && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                                <Calendar className="w-3 h-3" />
                                DAR {t.dar_jours}j
                                {t.date_reentree && ` · Réentrée ${new Date(t.date_reentree).toLocaleDateString("fr-FR")}`}
                              </span>
                            )}
                            {t.weatherConditions && (
                              <span className="text-[10px] text-[var(--text-tertiary)]">🌤 {t.weatherConditions}</span>
                            )}
                            {t.temperature && <span className="text-[10px] text-[var(--text-tertiary)]">🌡 {t.temperature}°C</span>}
                            {t.windSpeed && <span className="text-[10px] text-[var(--text-tertiary)]">💨 {t.windSpeed} km/h</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[var(--color-stone-moss)] flex gap-3">
          <button
            onClick={onPlanifier}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-[var(--color-valley-green)] text-[var(--color-canvas-ice)] hover:bg-[var(--color-adaline-ink)] transition-colors flex items-center justify-center gap-2"
          >
            <Droplets className="w-4 h-4" />
            Planifier un traitement
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-[var(--color-mist-gray)] text-[var(--text-secondary)] hover:bg-[var(--black-004)] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Info; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 pt-3 border-t border-white/[0.08] first:border-t-0 first:pt-0">
      <Icon className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
      <span className="text-[10px] font-semibold text-[var(--color-adaline-ink)]/55 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: "amber" | "cyan" }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-b-0">
      <span className="text-[11px] text-[var(--color-adaline-ink)]/55">{label}</span>
      <span className={cn(
        "text-[11px] font-medium text-right max-w-[55%]",
        highlight === "amber" ? "text-[var(--color-valley-green)] font-mono" :
        highlight === "cyan" ? "text-[var(--color-valley-green)] font-mono" : "text-[var(--color-adaline-ink)]/60"
      )}>
        {value}
      </span>
    </div>
  );
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
