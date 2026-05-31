"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useParcelles } from "@/hooks/useData";
import {
  fetchTreatments,
  updateTreatmentStatus,
  insertTreatment,
  recordTreatmentPoint,
  finalizeTreatment,
  fetchActiveTreatment,
  createRealTreatment,
  saveTreatmentTrajectory,
  fetchTreatmentWithPoints,
  finalizeTreatmentFull,
} from "@/lib/data-provider";
import { tractorTrajectory } from "@/lib/tractor-trajectory";
import { calculateDistance, dbPointsToTrajectory } from "@/lib/trajectory-utils";
import type { Parcelle } from "@/lib/mock-data";
import {
  Wifi,
  WifiOff,
  Droplets,
  MapPin,
  Activity,
  Satellite,
  Clock,
  Zap,
  RefreshCw,
  Navigation,
  Target,
  Radio,
  Waves,
  Play,
  Square,
  ChevronDown,
  Beaker,
  Timer,
  CheckCircle2,
  X,
  Leaf,
  Sprout,
  Download,
  FlaskConical,
  Plus,
  Save,
  History,
} from "lucide-react";

const TractorLiveMap = dynamic(() => import("@/components/map/TractorLiveMap"), { ssr: false });

// ─── GPS quality thresholds (parametrable) ────────────────────────────────────
const GPS_MIN_SATS = 5;
const GPS_MAX_HDOP = 2.0;

/** "real" = use live ESP32 data, "demo" = simulation only */
type DataMode = "real" | "demo";

type Reading = {
  id: string;
  device_id: string;
  flow1: number;
  flow2: number;
  vol1: number;
  vol2: number;
  lat: number;
  lon: number;
  speed: number;
  hdop: number;
  sats: number;
  area_m2: number;
  timestamp: string;
  created_at: string;
};

type TrajectoryData = {
  segments: { points: [number, number][]; speed: number; color: string }[];
  start: [number, number] | null;
  end: [number, number] | null;
  startTime: string;
  endTime: string;
};

type TreatmentData = {
  id: string;
  parcelleName: string;
  sousParcelleName?: string;
  type: string;
  status: string;
  plannedDate: string;
  operatorName: string;
  products: { productName: string; quantityUsed: number; unit: string; productId?: string; lotId?: string }[];
  volumeBouillie?: number | null;
  areaTreatedHectares?: number;
  notes?: string;
};

export default function LivePage() {
  const router = useRouter();
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { data: parcellesRaw } = useParcelles();
  const parcelles = (parcellesRaw || []) as Parcelle[];

  // Treatment session state
  const [treatments, setTreatments] = useState<TreatmentData[]>([]);
  const [activeTreatment, setActiveTreatment] = useState<TreatmentData | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyTreatments, setHistoryTreatments] = useState<TreatmentData[]>([]);
  const [visibleHistoryIds, setVisibleHistoryIds] = useState<string[]>([]);
  const [historyTrajectories, setHistoryTrajectories] = useState<Record<string, TrajectoryData>>({});
  const [sessionStartVol, setSessionStartVol] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [ending, setEnding] = useState(false);
  const [activeTrajectory, setActiveTrajectory] = useState<TrajectoryData | null>(null);
  const [simIndex, setSimIndex] = useState(0);
  const [simRunning, setSimRunning] = useState(false);

  // ── Mode réel / démo ──
  // Auto-switch to "real" when live GPS data arrives, manual override possible
  const [dataMode, setDataMode] = useState<DataMode>("demo");
  // Accumulated real GPS trail during an active treatment session
  const [realTrailPoints, setRealTrailPoints] = useState<{lat: number, lon: number, flow: number}[]>([]);
  // Full resolution trajectory buffer for saving to DB
  const fullTrajectoryBuffer = useRef<[number, number, number, string][]>([]);

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from("device_readings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data && data.length > 0) {
      setLatest(data[0] as Reading);
      setHistory(data as Reading[]);
      setLastUpdate(new Date());
    }
  }, []);

  const loadTreatments = useCallback(async () => {
    setLoadingTreatments(true);
    try {
      const all = await fetchTreatments();
      setTreatments(all.filter((t: TreatmentData) => t.status === "planned" || t.status === "in_progress"));
      const inProgress = all.find((t: TreatmentData) => t.status === "in_progress");
      if (inProgress) {
        setActiveTreatment(inProgress);
        if (!sessionStartTime) {
          setSessionStartTime(new Date());
          setSessionStartVol(0);
        }
        // Restore trajectory for in-progress treatment (real KMZ coords, no remap)
        if (!activeTrajectory) {
          setActiveTrajectory({
            segments: tractorTrajectory.segments.map((s) => ({
              points: s.points.map((p) => [p[0], p[1]] as [number, number]),
              speed: s.speed,
              color: s.color,
            })),
            start: tractorTrajectory.start as [number, number],
            end: tractorTrajectory.end as [number, number],
            startTime: tractorTrajectory.startTime,
            endTime: tractorTrajectory.endTime,
          });
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingTreatments(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartTime, parcelles.length]);

  useEffect(() => {
    fetchLatest();
    loadTreatments();

    // 1. Check for existing active treatment on mount
    fetchActiveTreatment("ESP32-001").then(active => {
      if (active) {
        setActiveTreatment({
          id: active.id,
          parcelleName: active.parcelle_name ?? "Traitement Live",
          type: active.type ?? "pulverisation",
          status: "in_progress",
          plannedDate: active.start_time ?? new Date().toISOString(),
          products: [],
          operatorName: "Live ESP32",
          volumeBouillie: null,
          areaTreatedHectares: 0,
        });
        setDataMode("real");
        setSessionStartTime(new Date(active.start_time));
      }
    });

    const channel = supabase
      .channel("live-readings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "device_readings" },
        (payload: { new: Reading }) => {
          const newReading = payload.new as Reading;
          setLatest(newReading);
          setHistory((prev: Reading[]) => [newReading, ...prev].slice(0, 200));
          setLastUpdate(new Date());
          setConnected(true);

          const gpsOk =
            newReading.lat !== 0 &&
            newReading.lon !== 0 &&
            newReading.sats >= GPS_MIN_SATS &&
            newReading.hdop <= GPS_MAX_HDOP;

          if (gpsOk) {
            // Record point if treatment is active and data mode is real
            if (activeTreatmentRef.current && dataModeRef.current === "real") {
              recordTreatmentPoint({
                traitement_id: activeTreatmentRef.current.id,
                lat: newReading.lat,
                lng: newReading.lon,
                debit1_lpm: newReading.flow1,
                debit2_lpm: newReading.flow2,
                volume_cumul_l: newReading.vol1 + newReading.vol2,
                speed_kmh: newReading.speed
              });

              setRealTrailPoints((prev) =>
                [...prev, {
                  lat: newReading.lat, 
                  lon: newReading.lon, 
                  flow: (newReading.flow1 + newReading.flow2) / 2
                }].slice(-1000)
              );
            }
          }
        }
      )
      .subscribe((status: string) => {
        setConnected(status === "SUBSCRIBED");
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [fetchLatest, loadTreatments]);

  // Keep refs in sync for the realtime callback
  const activeTreatmentRef = useRef(activeTreatment);
  const dataModeRef = useRef(dataMode);
  useEffect(() => { activeTreatmentRef.current = activeTreatment; }, [activeTreatment]);
  useEffect(() => { dataModeRef.current = dataMode; }, [dataMode]);

  // Use the KMZ trajectory AS-IS (real GPS coords, no remap to parcelle box)
  const getRealTrajectory = (): TrajectoryData => ({
    segments: tractorTrajectory.segments.map((s) => ({
      points: s.points.map((p) => [p[0], p[1]] as [number, number]),
      speed: s.speed,
      color: s.color,
    })),
    start: [tractorTrajectory.start[0], tractorTrajectory.start[1]] as [number, number],
    end: [tractorTrajectory.end[0], tractorTrajectory.end[1]] as [number, number],
    startTime: tractorTrajectory.startTime,
    endTime: tractorTrajectory.endTime,
  });

  const startTreatment = async (treatment: TreatmentData, mode: "real" | "demo" = "real") => {
    try {
      setDataMode(mode);
      
      // Do not attempt to update the DB if it's the mock demo session
      if (treatment.id !== "demo-sim") {
        await updateTreatmentStatus(treatment.id, "in_progress", {
          executedDate: new Date().toISOString().split("T")[0],
        });
      }
      
      // Mémoriser le volume initial réel (vol1 + vol2)
      const currentVol = latest ? latest.vol1 + latest.vol2 : 0;
      setSessionStartVol(currentVol);
      setSessionStartTime(new Date());
      setActiveTreatment({ ...treatment, status: "in_progress" });
      setShowSelector(false);
      
      if (mode === "demo") {
        setActiveTrajectory(getRealTrajectory());
        setSimRunning(true);
      } else {
        setActiveTrajectory(null);
        setSimRunning(false);
      }
      
      setSimIndex(0);
      setRealTrailPoints([]);
      fullTrajectoryBuffer.current = [];

      await loadTreatments();
    } catch (err) {
      console.error("Failed to start treatment:", err);
    }
  };

  // Demo simulation — runs simulation without needing a DB treatment
  const startDemoSimulation = () => {
    const demoTreatment = {
      id: "demo-sim",
      parcelleName: "Simulation Démo",
      type: "pulverisation",
      status: "in_progress",
      plannedDate: new Date().toISOString(),
      products: [],
      operatorName: "Simulateur",
    } as any;
    startTreatment(demoTreatment, "demo");
  };

  /** V�rifier la qualit� GPS avant de d�marrer en mode r�el */
  const checkGpsQuality = async (): Promise<{ lat: number; lng: number } | null> => {
    // D'abord v�rifier la derni�re lecture temps r�el
    if (latest && latest.lat !== 0 && latest.lon !== 0 && latest.sats >= 4 && (latest.hdop ?? 99) <= 5) {
      return { lat: latest.lat, lng: latest.lon };
    }
    // Sinon, requ�ter directement esp32_telemetry
    try {
      const { data: gps } = await supabase
        .from('esp32_telemetry')
        .select('lat, lng, satellites, hdop')
        .eq('device_id', 'ESP32-001')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (gps && gps.satellites >= 4 && (gps.hdop ?? 99) <= 5 && gps.lat !== 0 && gps.lng !== 0) {
        return { lat: gps.lat, lng: gps.lng };
      }
    } catch { /* silencieux */ }
    return null;
  };

  /** Create and start a treatment on the fly using live data (active parcelle if detected) */
  const startQuickTreatment = async () => {
    try {
      const pName = activeParcelle ? activeParcelle.name : "Traitement Manuel";
      let startLat: number = tractorTrajectory.start[0];
      let startLng: number = tractorTrajectory.start[1];

      // V�rification GPS qualifi� avant d�marrage r�el
      if (dataMode === "real") {
        const gpsFix = await checkGpsQuality();
        if (!gpsFix) {
          alert('Signal GPS insuffisant. V�rifiez le bo�tier ESP32.');
          return;
        }
        startLat = gpsFix.lat;
        startLng = gpsFix.lng;
      } else {
        startLat = latest?.lat || tractorTrajectory.start[0];
        startLng = latest?.lon || tractorTrajectory.start[1];
      }

      const newT = await createRealTreatment({
        deviceId: "ESP32-001",
        parcelleName: pName,
        type: "pulverisation",
        startLat,
        startLng
      });

      if (newT) {
        setActiveTreatment({
          id: newT.id,
          parcelleName: newT.parcelle_name,
          type: newT.type,
          status: "in_progress",
          plannedDate: newT.start_time,
          products: [],
          operatorName: "Live ESP32",
          volumeBouillie: null,
          areaTreatedHectares: 0,
        });
        setDataMode("real");
        setSessionStartTime(new Date());
        setSessionStartVol(latest ? latest.vol1 + latest.vol2 : 0);
        setActiveTrajectory(null);
        setSimRunning(false);
        setRealTrailPoints([{
          lat: startLat, 
          lon: startLng, 
          flow: latest ? (latest.flow1 + latest.flow2) / 2 : 0
        }]);
      }
    } catch (err) {
      console.error("Quick start failed:", err);
    }
  };

  /** Converts the current demo simulation into a real completed treatment in history */
  const saveDemoToHistory = async () => {
    if (!activeTreatment || activeTreatment.id !== "demo-sim" || simIndex < 5) return;
    setEnding(true);
    try {
      const pName = activeParcelle ? activeParcelle.name : "Démo Sauvegardée";
      const newT = await insertTreatment({
        parcelleName: pName,
        type: activeTreatment.type,
        plannedDate: new Date().toISOString(),
        status: "completed",
        operatorName: "Simulation Démo",
        volumeBouillie: simVolume,
        areaTreatedHectares: simAreaHa,
      });

      // Mock timestamps for the demo trajectory
      const points = simFlatPath.slice(0, simIndex + 1).map((p, idx) => [
        p.lat, 
        p.lon, 
        p.speed, 
        new Date(Date.now() - (simIndex - idx) * 1000).toISOString()
      ] as [number, number, number, string]);

      await saveTreatmentTrajectory(newT.id, {
        points,
        startTime: sessionStartTime?.toISOString() || new Date().toISOString(),
        endTime: new Date().toISOString(),
      });

      setActiveTreatment(null);
      setSimRunning(false);
      setSimIndex(0);
      router.push("/treatments");
    } catch (err) {
      console.error("Failed to save demo:", err);
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    // Load recent history for the live panel
    fetchTreatments("completed").then(setHistoryTreatments);
  }, []);

  const toggleHistoryTrajectory = async (treatmentId: string) => {
    if (visibleHistoryIds.includes(treatmentId)) {
      setVisibleHistoryIds(prev => prev.filter(id => id !== treatmentId));
      return;
    }
    setVisibleHistoryIds(prev => [...prev, treatmentId]);
    if (!historyTrajectories[treatmentId]) {
      const result = await fetchTreatmentWithPoints(treatmentId);
      if (result?.points && result.points.length > 1) {
        const traj = dbPointsToTrajectory(result.points);
        setHistoryTrajectories(prev => ({ ...prev, [treatmentId]: traj as TrajectoryData }));
      }
    }
  };

  const endTreatment = async () => {
    if (!activeTreatment) return;
    setEnding(true);
    const endTime = new Date().toISOString();
    try {
      if (activeTreatment.id !== "demo-sim") {
        const duration = Math.floor((Date.now() - (sessionStartTime?.getTime() || Date.now())) / 1000);
        const totalVol = sessionVol;
        const area = areaHa > 0.001 ? areaHa : totalVol / 200;

        // 3. Distance Haversine
        const distanceM = realTrailPoints.length > 1
          ? realTrailPoints.reduce((acc, p, i) => {
              if (i === 0) return 0;
              const prev = realTrailPoints[i - 1];
              const R = 6371000;
              const dLat = (p.lat - prev.lat) * Math.PI / 180;
              const dLon = (p.lon - prev.lon) * Math.PI / 180;
              const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(prev.lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) *
                Math.sin(dLon / 2) ** 2;
              return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            }, 0)
          : 0;

        // 1. Save GPS trajectory buffer
        if (fullTrajectoryBuffer.current.length > 1) {
          await saveTreatmentTrajectory(activeTreatment.id, {
            points: fullTrajectoryBuffer.current,
            startTime: sessionStartTime?.toISOString() || endTime,
            endTime,
          });
        }

        // 2. Finalize + DAR + stock deductions (produits du traitement)
        const stockDeductions = activeTreatment.products
          .filter(p => p.productId || p.lotId)
          .map(p => ({
            lotId: (p.lotId || p.productId) as string,
            quantite: p.quantityUsed || 0,
          }));

        await finalizeTreatmentFull(activeTreatment.id, {
          endTime,
          totalVolume: totalVol,
          avgDose: dosePerHa,
          durationSeconds: duration,
          distanceM,
          areaHa: area,
          darDays: 21, // conservative default — replaced by per-product DAR when ordres workflow used
          stockDeductions: stockDeductions.length > 0 ? stockDeductions : undefined,
        });
      }

      fullTrajectoryBuffer.current = [];
      setActiveTreatment(null);
      setSessionStartVol(0);
      setSessionStartTime(null);
      setActiveTrajectory(null);
      setSimIndex(0);
      setSimRunning(false);
      setRealTrailPoints([]);
      router.push("/treatments");
    } catch (err) {
      console.error("Failed to end treatment:", err);
    } finally {
      setEnding(false);
    }
  };

  const totalVol = latest ? latest.vol1 + latest.vol2 : 0;
  const sessionVol = activeTreatment ? Math.max(0, totalVol - sessionStartVol) : 0;
  const areaHa = latest ? latest.area_m2 / 10000 : 0;
  const dosePerHa = areaHa > 0.001 ? sessionVol / areaHa : 0;
  const gpsValid = latest ? latest.lat !== 0 && latest.lon !== 0 : false;
  const flow1Active = latest ? latest.flow1 > 0.1 : false;
  const flow2Active = latest ? latest.flow2 > 0.1 : false;

  // ─── GPS quality gate (HDOP ≤ GPS_MAX_HDOP AND sats ≥ GPS_MIN_SATS) ────────
  const gpsQualityOk = latest
    ? gpsValid && latest.hdop <= GPS_MAX_HDOP && latest.sats >= GPS_MIN_SATS
    : false;

  /** "green" | "amber" | "red" — utilisé dans l'indicateur HUD */
  const gpsQualityLevel = (() => {
    if (!latest || !gpsValid) return "red" as const;
    if (latest.hdop <= 1.5 && latest.sats >= GPS_MIN_SATS) return "green" as const;
    if (latest.hdop <= GPS_MAX_HDOP && latest.sats >= 4) return "amber" as const;
    return "red" as const;
  })();

  /** Position GPS réelle passée à la carte — uniquement si qualité suffisante */
  const livePosition = useMemo(
    () =>
      gpsQualityOk && latest
        ? { lat: latest.lat, lon: latest.lon, speed: latest.speed, hdop: latest.hdop, sats: latest.sats }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latest?.lat, latest?.lon, latest?.speed, latest?.hdop, latest?.sats, gpsQualityOk]
  );

  /** Traînée réelle à afficher sur la carte */
  const realTrailForMap = useMemo(
    () => (realTrailPoints.length >= 2 ? realTrailPoints : []),
    [realTrailPoints]
  );

  /** Export CSV des dernières lectures — appelle l'API GET avec format=csv */
  const exportCsv = useCallback(() => {
    const url = `/api/readings?format=csv&limit=500${latest?.device_id ? `&device_id=${encodeURIComponent(latest.device_id)}` : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `readings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [latest?.device_id]);

  const sessionElapsed = sessionStartTime
    ? Math.round((Date.now() - sessionStartTime.getTime()) / 1000)
    : 0;

  const gpsPoints = history
    .filter((r: Reading) => r.lat !== 0 && r.lon !== 0)
    .map((r: Reading) => ({ lat: r.lat, lon: r.lon, flow1: r.flow1, flow2: r.flow2, speed: r.speed, timestamp: r.timestamp }));

  const parcelleOverlays = parcelles.map((p) => ({
    id: p.id, name: p.name, boundary: p.boundary, color: p.color,
    cropType: p.cropType, areaHectares: p.areaHectares,
    children: p.children?.map((c) => ({
      id: c.id, name: c.name, boundary: c.boundary, color: c.color,
      cropType: c.cropType, areaHectares: c.areaHectares,
    })),
  }));

  const activeParcelle = gpsValid && latest ? parcelles.find((p) => {
    if (p.boundary.length < 3) return false;
    return pointInPolygon(latest.lat, latest.lon, p.boundary);
  }) : null;


  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t: number) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const timeSince = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 1000) : null;

  const isOffline = !!(latest && !connected && (() => {
    const lastTs = new Date(latest.created_at).getTime();
    return Date.now() - lastTs > 5 * 60 * 1000;
  })());

  const lastSessionStats = (() => {
    if (!history.length) return null;
    const validGps = history.filter((r) => r.lat !== 0 && r.lon !== 0);
    const totalVolumeSession = history.reduce((s, r) => s + r.vol1 + r.vol2, 0);
    const maxFlow = Math.max(...history.map((r) => Math.max(r.flow1, r.flow2)));
    const firstReading = history[history.length - 1];
    const lastReading = history[0];
    const durationMs = new Date(lastReading.created_at).getTime() - new Date(firstReading.created_at).getTime();
    const durationMin = Math.round(durationMs / 60000);
    const lastActive = new Date(lastReading.created_at);
    const daysSince = Math.floor((Date.now() - lastActive.getTime()) / 86400000);
    return { validGps: validGps.length, totalVolume: totalVolumeSession, maxFlow, readings: history.length, durationMin, lastActive, daysSince };
  })();

  const flowHistory = history.slice(0, 20).reverse();

  // ═══ SIMULATION LOOP ═══
  // Flatten trajectory into ordered [lat, lon, speed] points
  const simFlatPath = useMemo(() => {
    if (!activeTrajectory) return [] as { lat: number; lon: number; speed: number }[];
    return activeTrajectory.segments.flatMap((s) =>
      s.points.map((p) => ({ lat: p[0], lon: p[1], speed: s.speed }))
    );
  }, [activeTrajectory]);

  // Reset sim when treatment changes — only auto-start sim in demo mode
  useEffect(() => {
    setSimIndex(0);
    setSimRunning(!!activeTreatment && simFlatPath.length > 0 && dataMode === "demo");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTreatment?.id, simFlatPath.length, dataMode]);

  // Advance simulation tick — speed-proportional timing (slow=slow, fast=fast)
  const [simSpeedMult, setSimSpeedMult] = useState(3); // 1x = real time
  useEffect(() => {
    if (!simRunning || simFlatPath.length === 0) return;
    const curSpeedKmh = simFlatPath[simIndex]?.speed || 5;
    const speedMs = (curSpeedKmh * 1000) / 3600; // m/s
    const POINT_SPACING_M = 2; // KMZ samples ≈2m apart
    const realMs = (POINT_SPACING_M / speedMs) * 1000;
    const tickMs = Math.max(40, Math.min(1500, realMs / simSpeedMult));

    const timer = setTimeout(() => {
      setSimIndex((i) => {
        if (i >= simFlatPath.length - 1) {
          setSimRunning(false);
          return simFlatPath.length - 1;
        }
        return i + 1;
      });
    }, tickMs);
    return () => clearTimeout(timer);
  }, [simRunning, simIndex, simFlatPath, simSpeedMult]);

  const simCurrent = simFlatPath[simIndex] || null;
  const simTrail = useMemo(
    () => simFlatPath.slice(0, simIndex + 1).map((p) => [p.lat, p.lon] as [number, number]),
    [simFlatPath, simIndex]
  );
  const simPosition = simCurrent
    ? { lat: simCurrent.lat, lon: simCurrent.lon, speed: simCurrent.speed }
    : null;

  // Simulated metrics (per-tick increments, 250ms tick)
  // Flow ≈ 4 L/min base + 0.4 per km/h → realistic sprayer flow
  const simFlow = simCurrent ? 4 + simCurrent.speed * 0.4 : 0;
  // Volume: integrate flow over elapsed ticks (0.25s each)
  const simVolume = simIndex * (simFlow / 60) * 0.25;
  // Area: speed (m/s) × tick (0.25s) × working width (6m) × number of ticks, in m²
  const simAreaM2 = simFlatPath.slice(0, simIndex + 1).reduce(
    (acc, p) => acc + (p.speed * 1000 / 3600) * 0.25 * 6,
    0
  );
  const simAreaHa = simAreaM2 / 10000;
  const simDosePerHa = simAreaHa > 0.01 ? simVolume / simAreaHa : 0;

  // Override displayed metrics:
  // - In DEMO mode: use sim values when sim is active
  // - In REAL mode: always use live sensor values
  const isSimActive = dataMode === "demo" && simCurrent !== null;
  const displayVol = isSimActive ? simVolume : sessionVol;
  const displayArea = isSimActive ? simAreaHa : areaHa;
  const displayDose = isSimActive ? simDosePerHa : dosePerHa;
  const displaySpeed = isSimActive ? simCurrent!.speed : latest?.speed ?? 0;
  const displayFlow1 = isSimActive ? simFlow / 2 : latest?.flow1 ?? 0;
  const displayFlow2 = isSimActive ? simFlow / 2 : latest?.flow2 ?? 0;
  const simProgress = simFlatPath.length > 0 ? (simIndex / (simFlatPath.length - 1)) * 100 : 0;

  const typeLabels: Record<string, string> = {
    pulverisation: "Pulvérisation",
    fertilisation: "Fertilisation",
    desherbage: "Désherbage",
    traitement_semence: "Traitement semence",
    autre: "Autre",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    pulverisation: <Droplets className="w-3.5 h-3.5" />,
    fertilisation: <Leaf className="w-3.5 h-3.5" />,
    desherbage: <Sprout className="w-3.5 h-3.5" />,
    traitement_semence: <Beaker className="w-3.5 h-3.5" />,
    autre: <Activity className="w-3.5 h-3.5" />,
  };

  return (
    <AppLayout>
      <div className="relative" style={{ height: "calc(100vh - 90px)" }}>
        {/* Full-screen map */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-[var(--color-stone-moss)]">
          <TractorLiveMap
            points={[]}
            parcelles={parcelleOverlays}
            trajectory={activeTrajectory || undefined}
            simPosition={isSimActive ? simPosition : null}
            simTrail={isSimActive && simTrail.length >= 2 ? simTrail : undefined}
            livePosition={livePosition}
            realTrail={realTrailForMap.length >= 2 ? realTrailForMap : undefined}
            historyTrajectories={Object.entries(historyTrajectories)
              .filter(([id]) => visibleHistoryIds.includes(id))
              .map(([_, t]) => t)}
            className="w-full h-full"
          />
        </div>

        {/* ═══ TOP HUD BAR ═══ */}
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between">
          {/* Left: Device identity */}
          <div className="flex items-center gap-2">
            <div className="hud-panel px-3 py-2 flex items-center gap-3">
              <div className="relative">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  connected ? "bg-[var(--color-valley-green)]/20 border border-emerald-500/40" : "bg-[var(--color-canvas-ice)] border border-white/15"
                )}>
                  <Zap className={cn("w-4 h-4", connected ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/40")} />
                </div>
                {connected && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20" />}
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--color-adaline-ink)]/90 tracking-wide">LEADFARM</div>
                <div className="text-[9px] text-[var(--color-adaline-ink)]/40 font-mono">{latest?.device_id || "NO DEVICE"}</div>
              </div>
            </div>

            {/* Connection status pill */}
            <div className={cn(
              "hud-panel px-3 py-1.5 flex items-center gap-2",
              connected ? "hud-panel-active" : ""
            )}>
              {connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-[10px] font-bold text-[var(--color-valley-green)] uppercase tracking-widest">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-[var(--color-valley-green)]/70" />
                  <span className="text-[10px] font-bold text-[var(--color-valley-green)]/70 uppercase tracking-widest">Off</span>
                </>
              )}
            </div>
          </div>

          {/* Right: GPS quality + mode toggle + time + refresh + CSV */}
          <div className="flex items-center gap-2">
            {/* GPS Quality indicator */}
            {latest && (
              <div className="hud-panel px-2.5 py-1.5 flex items-center gap-1.5" title={`HDOP: ${latest.hdop?.toFixed(1)} | SAT: ${latest.sats}`}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  gpsQualityLevel === "green" ? "bg-emerald-400" :
                  gpsQualityLevel === "amber" ? "bg-emerald-400 animate-pulse" :
                  "bg-emerald-400 animate-pulse"
                )} />
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest",
                  gpsQualityLevel === "green" ? "text-[var(--color-valley-green)]" :
                  gpsQualityLevel === "amber" ? "text-[var(--color-valley-green)]" :
                  "text-[var(--color-valley-green)]"
                )}>
                  GPS
                </span>
              </div>
            )}

            {/* Mode Réel / Démo toggle */}
            <button
              onClick={() => setDataMode((m) => m === "real" ? "demo" : "real")}
              className={cn(
                "hud-panel px-2.5 py-1.5 flex items-center gap-1.5 transition-all",
                dataMode === "real"
                  ? "border-emerald-500/40 bg-[var(--color-valley-green)]/10 hover:bg-[var(--color-valley-green)]/20"
                  : "border-[var(--color-valley-green)]/30 bg-[var(--color-valley-green)]/10 hover:bg-[var(--color-valley-green)]/20"
              )}
              title={dataMode === "real" ? "Passer en mode Démo" : "Passer en mode Réel"}
            >
              <FlaskConical className={cn(
                "w-3 h-3",
                dataMode === "real" ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]"
              )} />
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                dataMode === "real" ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]"
              )}>
                {dataMode === "real" ? "Réel" : "Démo"}
              </span>
            </button>

            {/* Time since last reading */}
            {timeSince != null && (
              <div className="hud-panel px-3 py-1.5 flex items-center gap-2">
                <Clock className="w-3 h-3 text-[var(--color-adaline-ink)]/40" />
                <span className={cn(
                  "text-[10px] font-mono font-bold",
                  timeSince < 15 ? "text-[var(--color-valley-green)]" : timeSince < 60 ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]"
                )}>
                  {timeSince < 60 ? `${timeSince}s` : `${Math.floor(timeSince / 60)}m`}
                </span>
              </div>
            )}

            <button onClick={fetchLatest} className="hud-panel p-2 hover:bg-[var(--color-stone-moss)] transition-colors group">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/50 group-hover:text-[var(--color-adaline-ink)]/80 transition-colors" />
            </button>
          </div>
        </div>

        {/* ═══ TREATMENT SESSION CONTROL — BOTTOM CENTER ═══ */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-24px)] max-w-[520px]">
          {activeTreatment ? (
            /* Active treatment banner */
            <div className="hud-panel p-0 overflow-hidden border-[var(--color-valley-green)]/30">
              {/* Green progress strip */}
              <div className="h-1 bg-[var(--color-valley-green)]/20">
                <div className="h-full bg-emerald-400 animate-pulse" style={{ width: "100%" }} />
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 flex items-center justify-center text-[var(--color-valley-green)]">
                      {typeIcons[activeTreatment.type] || <Activity className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--color-adaline-ink)]/90">{activeTreatment.parcelleName}</div>
                      {activeTreatment.id !== "demo-sim" && (
                        <Link
                          href={`/treatments?id=${activeTreatment.id}`}
                          className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/15 transition-colors"
                        >
                          <Droplets className="w-2.5 h-2.5" />
                          Fiche traitement
                        </Link>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] font-medium mt-1">
                        <span className="text-[var(--color-valley-green)]/80">{typeLabels[activeTreatment.type] || activeTreatment.type} · En cours</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[8px] font-bold border",
                          dataMode === "real"
                            ? "bg-[var(--color-valley-green)]/20 border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)]"
                            : "bg-[var(--color-valley-green)]/20 border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)]"
                        )}>
                          {dataMode === "real" ? "📶 Réel" : "🎬 Démo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {dataMode === "demo" && simIndex > 10 && (
                      <button
                        onClick={saveDemoToHistory}
                        disabled={ending}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold bg-[var(--color-valley-green)]/20 border border-emerald-500/40 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30 transition-all"
                        title="Enregistrer cette simulation dans l'historique"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Sauver en Historique
                      </button>
                    )}
                    <button
                      onClick={endTreatment}
                      disabled={ending}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                        "bg-[var(--color-valley-green)]/20 border border-emerald-500/40 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30",
                        ending && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Square className="w-3.5 h-3.5" />
                      {ending ? "..." : "Terminer"}
                    </button>
                  </div>
                </div>

                {/* Simulation progress + controls (visible en mode Démo seulement) */}
                {isSimActive && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[9px] text-[var(--color-adaline-ink)]/40 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span>SIM</span>
                        <span className="font-mono text-[var(--color-adaline-ink)]/60">
                          {simIndex}/{simFlatPath.length - 1}
                        </span>
                        <span className="font-mono text-[var(--color-valley-green)]">·</span>
                        <span className="font-mono text-[var(--color-valley-green)]">{simCurrent.speed.toFixed(0)} km/h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSimRunning((r) => !r)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold border transition-colors",
                            simRunning
                              ? "bg-[var(--color-valley-green)]/20 border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30"
                              : "bg-[var(--color-valley-green)]/20 border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/30"
                          )}
                        >
                          {simRunning ? "PAUSE" : "PLAY"}
                        </button>
                        <button
                          onClick={() => { setSimIndex(0); setSimRunning(true); }}
                          className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--color-stone-moss)] border border-white/15 text-[var(--color-adaline-ink)]/70 hover:bg-[var(--color-stone-moss)]"
                        >
                          ↻
                        </button>
                        {[1, 3, 6].map((m) => (
                          <button
                            key={m}
                            onClick={() => setSimSpeedMult(m)}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors",
                              simSpeedMult === m
                                ? "bg-[var(--color-valley-green)]/20 border-emerald-500/40 text-[var(--color-valley-green)]"
                                : "bg-[var(--color-canvas-ice)] border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/50 hover:bg-[var(--color-stone-moss)]"
                            )}
                          >
                            {m}x
                          </button>
                        ))}
                        <span className="font-mono text-[var(--color-valley-green)] ml-1">{simProgress.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                        style={{ width: `${simProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live session metrics */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-[var(--color-adaline-ink)]/35 block mb-0.5">VOLUME</span>
                    <span className={cn("text-sm font-bold font-mono", displayVol > 0.1 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30")}>
                      {displayVol.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-[var(--color-adaline-ink)]/40 ml-0.5">L</span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-[var(--color-adaline-ink)]/35 block mb-0.5">DOSE/HA</span>
                    <span className={cn("text-sm font-bold font-mono", displayDose > 0.1 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30")}>
                      {displayDose.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-[var(--color-adaline-ink)]/40 ml-0.5">L</span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-[var(--color-adaline-ink)]/35 block mb-0.5">DURÉE</span>
                    <span className="text-sm font-bold font-mono text-[var(--color-adaline-ink)]/60">
                      {sessionElapsed < 60
                        ? `${sessionElapsed}s`
                        : `${Math.floor(sessionElapsed / 60)}m`}
                    </span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-[var(--color-adaline-ink)]/35 block mb-0.5">DÉBIT</span>
                    <span className={cn(
                      "text-sm font-bold font-mono",
                      displayFlow1 + displayFlow2 > 0.1 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30"
                    )}>
                      {(displayFlow1 + displayFlow2).toFixed(1)}
                    </span>
                    <span className="text-[8px] text-[var(--color-adaline-ink)]/40 ml-0.5">L/m</span>
                  </div>
                </div>

                {/* Products list */}
                {activeTreatment.products.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                    {activeTreatment.products.map((p, i) => (
                      <span key={i} className="text-[9px] bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-0.5 text-[var(--color-adaline-ink)]/50">
                        {p.productName} · {p.quantityUsed} {p.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No active treatment — Traitement 1 + planned dropdown */
            <div className="flex items-stretch gap-2">
              <button
                onClick={startQuickTreatment}
                className="flex-1 hud-panel px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-valley-green)]/10 transition-all border-[var(--color-valley-green)]/30 group"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-[var(--color-valley-green)]/30">
                  <Plus className="w-4 h-4 text-[var(--color-valley-green)]" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[var(--color-adaline-ink)]/90">Nouveau Traitement</div>
                  <div className="text-[10px] text-[var(--color-valley-green)]/70">Démarrer une session live</div>
                </div>
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() => {
                    if (treatments.length > 0) startTreatment(treatments[0], "real");
                    else startDemoSimulation();
                  }}
                  className="w-full h-full hud-panel px-4 py-3 flex items-center justify-between hover:bg-[var(--color-valley-green)]/10 transition-all border-[var(--color-valley-green)]/30 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-valley-green)]/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-[var(--color-valley-green)]/30">
                      <Play className="w-4 h-4 text-[var(--color-valley-green)] ml-0.5" fill="currentColor" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-[var(--color-adaline-ink)]/90">
                        {treatments.length > 0 ? (treatments[0].sousParcelleName || treatments[0].parcelleName) : "Démo KMZ"}
                      </div>
                      <div className="text-[10px] text-[var(--color-valley-green)]/70">
                        {treatments.length > 0 ? "Utiliser le planning" : "Simulation démo"}
                      </div>
                    </div>
                  </div>
                  {treatments.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSelector(!showSelector); }}
                      className="p-1.5 rounded-md hover:bg-[var(--color-stone-moss)]"
                    >
                      <ChevronDown className={cn(
                        "w-4 h-4 text-[var(--color-adaline-ink)]/40 transition-transform",
                        showSelector && "rotate-180"
                      )} />
                    </button>
                  )}
                </button>

                {/* Treatment selector dropdown */}
                {showSelector && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 hud-panel rounded-lg border border-white/[0.06] max-h-[280px] overflow-y-auto shadow-2xl z-[600]">
                  {loadingTreatments ? (
                    <div className="p-4 text-center">
                      <RefreshCw className="w-4 h-4 text-[var(--color-adaline-ink)]/45 animate-spin mx-auto mb-2" />
                      <span className="text-[10px] text-[var(--color-adaline-ink)]/45">Chargement...</span>
                    </div>
                  ) : treatments.length === 0 ? (
                    <div className="p-4 text-center">
                      <Beaker className="w-5 h-5 text-[var(--color-adaline-ink)]/35 mx-auto mb-2" />
                      <p className="text-xs text-[var(--color-adaline-ink)]/40">Aucun traitement planifié</p>
                      <p className="text-[10px] text-[var(--color-adaline-ink)]/45 mt-1">Planifiez un traitement depuis la page Traitements</p>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {/* Quick Start Option */}
                      <button
                        onClick={startQuickTreatment}
                        className="w-full text-left p-2.5 rounded-lg border border-[var(--color-valley-green)]/30 bg-[var(--color-valley-green)]/10 hover:bg-[var(--color-valley-green)]/20 transition-all group/item mb-1.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[var(--color-valley-green)]/20 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-[var(--color-adaline-ink)]/90">Démarrer sans planning</div>
                            <div className="text-[9px] text-[var(--color-valley-green)]/80">Créer un traitement rapide {activeParcelle ? `(${activeParcelle.name})` : ""}</div>
                          </div>
                        </div>
                      </button>

                      <div className="h-px bg-[var(--color-canvas-ice)] mx-2 my-1.5" />
                      <div className="px-2 pb-1 text-[9px] font-bold text-[var(--color-adaline-ink)]/20 uppercase tracking-widest">Planifiés</div>

                      {treatments.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => startTreatment(t, "real")}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group/item"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              t.status === "in_progress"
                                ? "bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)]"
                                : "bg-white/[0.06] border border-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/40 group-hover/item:text-[var(--color-adaline-ink)]/60"
                            )}>
                              {typeIcons[t.type] || <Activity className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/80 truncate">{t.parcelleName}</span>
                                {t.status === "in_progress" && (
                                  <span className="shrink-0 text-[8px] bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] px-1.5 py-0.5 rounded-full font-bold">
                                    EN COURS
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--color-adaline-ink)]/40">
                                <span>{typeLabels[t.type] || t.type}</span>
                                <span>·</span>
                                <span>{new Date(t.plannedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                                {t.products.length > 0 && (
                                  <>
                                    <span>·</span>
                                    <span>{t.products.length} produit{t.products.length > 1 ? "s" : ""}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Play className="w-3.5 h-3.5 text-[var(--color-adaline-ink)]/35 group-hover/item:text-[var(--color-valley-green)] shrink-0 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

        {/* ═══ SPEED LEGEND (bottom-left, only during sim) ═══ */}
        {isSimActive && (
          <div className="absolute bottom-4 left-3 z-[500] hud-panel px-3 py-2">
            <div className="text-[9px] text-[var(--color-adaline-ink)]/40 font-bold tracking-widest mb-1.5">VITESSE</div>
            <div className="flex items-center gap-2">
              {[
                { c: "#1a9850", l: "Lent", v: "2" },
                { c: "#91cf60", l: "Moyen", v: "5" },
                { c: "#f0d400", l: "Normal", v: "8" },
                { c: "#fc7850", l: "Rapide", v: "12" },
                { c: "#d73027", l: "Très rapide", v: "18" },
              ].map((s) => (
                <div key={s.l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.c, boxShadow: `0 0 6px ${s.c}` }} />
                  <span className="text-[9px] text-[var(--color-adaline-ink)]/60 font-mono">{s.v}</span>
                </div>
              ))}
              <span className="text-[8px] text-[var(--color-adaline-ink)]/45 ml-1">km/h</span>
            </div>
          </div>
        )}

        {/* ═══ LEFT: RADIAL FLOW GAUGES ═══ */}
        <div className="absolute left-3 top-16 z-[500] space-y-2">
          <RadialFlowGauge
            label="DEBIT 1"
            flow={displayFlow1}
            volume={isSimActive ? simVolume / 2 : (latest?.vol1 ?? 0)}
            active={displayFlow1 > 0.1}
            color="cyan"
            maxFlow={30}
            sparkline={isSimActive
              ? simFlatPath.slice(Math.max(0, simIndex - 20), simIndex + 1).map((p) => 2 + p.speed * 0.2)
              : flowHistory.map(r => r.flow1)}
          />
          <RadialFlowGauge
            label="DEBIT 2"
            flow={displayFlow2}
            volume={isSimActive ? simVolume / 2 : (latest?.vol2 ?? 0)}
            active={displayFlow2 > 0.1}
            color="orange"
            maxFlow={30}
            sparkline={isSimActive
              ? simFlatPath.slice(Math.max(0, simIndex - 20), simIndex + 1).map((p) => 2 + p.speed * 0.2)
              : flowHistory.map(r => r.flow2)}
          />
        </div>

        {/* ═══ EXPERT HISTORY PANEL (Right) ═══ */}
        {showHistoryPanel && (
          <div className="absolute right-3 top-[260px] bottom-24 z-[500] w-[260px] animate-in slide-in-from-right-4 duration-300">
            <div className="hud-panel h-full flex flex-col p-0 overflow-hidden border-[var(--color-valley-green)]/20">
              <div className="p-3 border-b border-[var(--color-stone-moss)] bg-[var(--color-valley-green)]/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                  <span className="text-[10px] font-bold text-[var(--color-adaline-ink)]/80 uppercase tracking-widest">Historique</span>
                </div>
                <button onClick={() => setShowHistoryPanel(false)} className="text-[var(--color-adaline-ink)]/30 hover:text-[var(--color-adaline-ink)]/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {historyTreatments.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[10px] text-[var(--color-adaline-ink)]/30 italic">Aucun historique trouvé</p>
                  </div>
                ) : (
                  historyTreatments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleHistoryTrajectory(t.id)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg border transition-all group",
                        visibleHistoryIds.includes(t.id)
                          ? "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[var(--color-adaline-ink)]/90 truncate">{t.parcelleName}</span>
                        {visibleHistoryIds.includes(t.id) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#f59e0b]" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-[var(--color-adaline-ink)]/40">
                        <span>{new Date(t.plannedDate).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' })}</span>
                        <span className="font-mono text-[var(--color-valley-green)]/60">{t.areaTreatedHectares?.toFixed(2) || 0} ha</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              <div className="p-2 border-t border-[var(--color-stone-moss)] bg-black/20">
                <p className="text-[8px] text-center text-[var(--color-adaline-ink)]/30 leading-tight">
                  Cliquez sur une session pour afficher son tracé sur la carte en arrière-plan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ RIGHT: VERTICAL HUD STRIP ═══ */}
        <div className="absolute right-3 top-16 z-[500] w-[200px] space-y-2">

          {/* GPS Compass Card */}
          <div className={cn("hud-panel p-3", gpsValid ? "hud-panel-gps" : "")}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center",
                  gpsValid ? "bg-[var(--color-valley-green)]/20" : "bg-[var(--color-canvas-ice)]"
                )}>
                  <Satellite className={cn("w-3.5 h-3.5", gpsValid ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/30")} />
                </div>
                <span className="text-[10px] text-[var(--color-adaline-ink)]/50 font-bold tracking-widest">GPS</span>
              </div>
              {isSimActive ? (
                <div className="flex items-center gap-1.5 bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 rounded-md px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-[var(--color-valley-green)]">SIM</span>
                </div>
              ) : gpsQualityOk ? (
                <div className="flex items-center gap-1.5 bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 rounded-md px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-[var(--color-valley-green)]">RÉEL</span>
                </div>
              ) : gpsValid ? (
                <div className="flex items-center gap-1.5 bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 rounded-md px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-[var(--color-valley-green)]">FIXE</span>
                </div>
              ) : (
                <span className="text-[9px] text-[var(--color-adaline-ink)]/45 bg-[var(--color-canvas-ice)] px-2 py-0.5 rounded-md border border-[var(--color-stone-moss)]">AUCUN</span>
              )}
            </div>

            {isSimActive && simCurrent ? (
              <div className="space-y-2">
                <div className="bg-[var(--color-valley-green)]/10 rounded-lg p-2 border border-[var(--color-valley-green)]/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-[var(--color-valley-green)]/70" />
                    <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/70">
                      {simCurrent.lat.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-[var(--color-valley-green)]/70" />
                    <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/70">
                      {simCurrent.lon.toFixed(5)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <MiniStat icon={<Satellite className="w-3 h-3" />} value={`${latest?.sats ?? "—"}`} label="SAT" color="amber" />
                  <MiniStat icon={<Navigation className="w-3 h-3" />} value={displaySpeed.toFixed(0)} label="KM/H" color="cyan" />
                  <MiniStat icon={<Radio className="w-3 h-3" />} value={`${latest?.hdop?.toFixed(1) ?? "—"}`} label="HDOP" color="amber" />
                </div>
              </div>
            ) : gpsValid && latest ? (
              <div className="space-y-2">
                <div className="bg-black/30 rounded-lg p-2 border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-[var(--color-valley-green)]/70" />
                    <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/70">
                      {latest.lat.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-[var(--color-valley-green)]/70" />
                    <span className="text-[10px] font-mono text-[var(--color-adaline-ink)]/70">
                      {latest.lon.toFixed(5)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <MiniStat icon={<Satellite className="w-3 h-3" />} value={`${latest.sats}`} label="SAT" color={latest.sats >= 6 ? "emerald" : "amber"} />
                  <MiniStat icon={<Navigation className="w-3 h-3" />} value={`${latest.speed.toFixed(0)}`} label="KM/H" color="cyan" />
                  <MiniStat icon={<Radio className="w-3 h-3" />} value={latest.hdop.toFixed(1)} label="HDOP" color={latest.hdop < 2 ? "emerald" : latest.hdop < 5 ? "amber" : "red"} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-valley-green)]/10 border border-[var(--color-valley-green)]/20 flex items-center justify-center">
                  <Waves className="w-4 h-4 text-[var(--color-valley-green)]/50 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-valley-green)]/60 font-medium">Recherche signal</p>
                  <p className="text-[9px] text-[var(--color-adaline-ink)]/45">Module actif</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Parcelle */}
          <div className="hud-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[var(--color-valley-green)]/15 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
              </div>
              <span className="text-[10px] text-[var(--color-adaline-ink)]/50 font-bold tracking-widest">ZONE</span>
            </div>

            {activeParcelle ? (
              <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-sm ring-2 ring-white/10" style={{ backgroundColor: activeParcelle.color }} />
                  <span className="text-xs font-semibold text-[var(--color-adaline-ink)]/90">{activeParcelle.name.split(" — ")[1] || activeParcelle.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--color-adaline-ink)]/45">
                  <span className="bg-white/[0.06] px-1.5 py-0.5 rounded">{activeParcelle.cropType}</span>
                  <span>{activeParcelle.areaHectares} ha</span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-[var(--color-adaline-ink)]/35 py-1">
                {gpsValid ? "Hors parcelle" : "GPS requis"}
              </div>
            )}
          </div>

          {/* Session Stats */}
          <div className="hud-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[var(--color-valley-green)]/15 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
              </div>
              <span className="text-[10px] text-[var(--color-adaline-ink)]/50 font-bold tracking-widest">SESSION</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.04]">
                <span className={cn("text-sm font-bold font-mono block", gpsPoints.length > 0 ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]/25")}>
                  {gpsPoints.length}
                </span>
                <span className="text-[8px] text-[var(--color-adaline-ink)]/45 uppercase tracking-wider">GPS</span>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.04]">
                <span className="text-sm font-bold font-mono text-[var(--color-adaline-ink)]/50 block">{history.length}</span>
                <span className="text-[8px] text-[var(--color-adaline-ink)]/45 uppercase tracking-wider">DATA</span>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.04]">
                <span className={cn(
                  "text-sm font-bold font-mono block",
                  gpsPoints.length > 0
                    ? (gpsPoints.length / Math.max(history.length, 1)) > 0.5 ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]"
                    : "text-[var(--color-adaline-ink)]/25"
                )}>
                  {gpsPoints.length > 0 ? `${((gpsPoints.length / Math.max(history.length, 1)) * 100).toFixed(0)}%` : "—"}
                </span>
                <span className="text-[8px] text-[var(--color-adaline-ink)]/45 uppercase tracking-wider">FIX</span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </AppLayout>
  );
}

/* ═══ RADIAL FLOW GAUGE ═══ */
function RadialFlowGauge({ label, flow, volume, active, color, maxFlow, sparkline }: {
  label: string; flow: number; volume: number; active: boolean;
  color: "cyan" | "orange"; maxFlow: number; sparkline: number[];
}) {
  const percent = Math.min((flow / maxFlow) * 100, 100);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percent / 100) * circumference * 0.75;
  const strokeColor = color === "cyan" ? "#22d3ee" : "#fb923c";
  const glowColor = color === "cyan" ? "rgba(34,211,238,0.4)" : "rgba(251,146,60,0.4)";
  const bgStroke = "rgba(255,255,255,0.06)";

  return (
    <div className={cn("hud-panel p-3 w-[180px]", active ? "hud-panel-flow" : "")}>
      <div className="flex items-center gap-2 mb-2">
        <Droplets className={cn("w-3 h-3", active ? (color === "cyan" ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]") : "text-[var(--color-adaline-ink)]/30")} />
        <span className="text-[9px] font-bold tracking-widest text-[var(--color-adaline-ink)]/45">{label}</span>
        {active && (
          <span className="ml-auto relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: strokeColor }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: strokeColor }} />
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-[84px] h-[84px] shrink-0">
          <svg viewBox="0 0 84 84" className="w-full h-full -rotate-[135deg]">
            <circle
              cx="42" cy="42" r={radius}
              fill="none" stroke={bgStroke} strokeWidth="5"
              strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
              strokeLinecap="round"
            />
            <circle
              cx="42" cy="42" r={radius}
              fill="none" stroke={strokeColor} strokeWidth="5"
              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
              strokeLinecap="round"
              style={{
                transition: "stroke-dasharray 0.5s ease",
                filter: active ? `drop-shadow(0 0 6px ${glowColor})` : "none",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              "text-xl font-bold font-mono leading-none",
              active ? (color === "cyan" ? "text-[var(--color-valley-green)]" : "text-[var(--color-valley-green)]") : "text-[var(--color-adaline-ink)]/40"
            )}>
              {flow.toFixed(1)}
            </span>
            <span className="text-[8px] text-[var(--color-adaline-ink)]/45 mt-0.5">L/min</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <Sparkline data={sparkline} color={strokeColor} height={32} active={active} />
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <span className="text-[9px] text-[var(--color-adaline-ink)]/45 block">VOLUME</span>
            <span className={cn("text-xs font-mono font-bold", volume > 0.1 ? "text-[var(--color-adaline-ink)]/60" : "text-[var(--color-adaline-ink)]/25")}>
              {volume.toFixed(1)} L
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ SPARKLINE ═══ */
function Sparkline({ data, color, height, active }: {
  data: number[]; color: string; height: number; active: boolean;
}) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <span className="text-[8px] text-[var(--color-adaline-ink)]/40">En attente...</span>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const width = 70;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 2);
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={active ? 0.3 : 0.1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.3}
        style={active ? { filter: `drop-shadow(0 0 3px ${color})` } : {}}
      />
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - (data[data.length - 1] / max) * (height - 2)}
          r="2"
          fill={color}
          opacity={active ? 1 : 0.3}
        />
      )}
    </svg>
  );
}

/* ═══ MINI STAT ═══ */
function MiniStat({ icon, value, label, color }: {
  icon: React.ReactNode; value: string; label: string;
  color: "emerald" | "cyan" | "amber" | "red";
}) {
  const colors = {
    emerald: "text-[var(--color-valley-green)]",
    cyan: "text-[var(--color-valley-green)]",
    amber: "text-[var(--color-valley-green)]",
    red: "text-[var(--color-valley-green)]",
  };

  return (
    <div className="bg-black/30 rounded-lg p-1.5 text-center border border-white/[0.04]">
      <div className={cn("mx-auto w-fit mb-0.5 opacity-50", colors[color])}>{icon}</div>
      <span className={cn("text-xs font-bold font-mono block", colors[color])}>{value}</span>
      <span className="text-[7px] text-[var(--color-adaline-ink)]/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function pointInPolygon(lat: number, lon: number, boundary: [number, number][]): boolean {
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
