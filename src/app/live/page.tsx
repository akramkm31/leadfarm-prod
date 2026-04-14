"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useParcelles } from "@/hooks/useData";
import { fetchTreatments, updateTreatmentStatus } from "@/lib/data-provider";
import { tractorTrajectory } from "@/lib/tractor-trajectory";
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
} from "lucide-react";

const TractorLiveMap = dynamic(() => import("@/components/map/TractorLiveMap"), { ssr: false });

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

type TreatmentData = {
  id: string;
  parcelleName: string;
  type: string;
  status: string;
  plannedDate: string;
  operatorName: string;
  products: { productName: string; quantityUsed: number; unit: string }[];
  volumeBouillie: number | null;
  areaTreatedHectares: number;
  notes?: string;
};

export default function LivePage() {
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
  const [sessionStartVol, setSessionStartVol] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [ending, setEnding] = useState(false);

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
      }
    } catch {
      // silent
    } finally {
      setLoadingTreatments(false);
    }
  }, [sessionStartTime]);

  useEffect(() => {
    fetchLatest();
    loadTreatments();
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
        }
      )
      .subscribe((status: string) => {
        setConnected(status === "SUBSCRIBED");
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [fetchLatest, loadTreatments]);

  const startTreatment = async (treatment: TreatmentData) => {
    try {
      await updateTreatmentStatus(treatment.id, "in_progress", {
        executedDate: new Date().toISOString().split("T")[0],
      });
      const currentVol = latest ? latest.vol1 + latest.vol2 : 0;
      setSessionStartVol(currentVol);
      setSessionStartTime(new Date());
      setActiveTreatment({ ...treatment, status: "in_progress" });
      setShowSelector(false);
      await loadTreatments();
    } catch (err) {
      console.error("Failed to start treatment:", err);
    }
  };

  const endTreatment = async () => {
    if (!activeTreatment) return;
    setEnding(true);
    try {
      const currentVol = latest ? latest.vol1 + latest.vol2 : 0;
      const consumed = Math.max(0, currentVol - sessionStartVol);
      await updateTreatmentStatus(activeTreatment.id, "completed", {
        volumeBouillie: consumed > 0.1 ? consumed : undefined,
      });
      setActiveTreatment(null);
      setSessionStartVol(0);
      setSessionStartTime(null);
      await loadTreatments();
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
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10">
          <TractorLiveMap points={[]} parcelles={parcelleOverlays} trajectory={tractorTrajectory as unknown as { segments: { points: [number, number][]; speed: number; color: string }[]; start: [number, number]; end: [number, number]; startTime: string; endTime: string }} className="w-full h-full" />
        </div>

        {/* ═══ TOP HUD BAR ═══ */}
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between">
          {/* Left: Device identity */}
          <div className="flex items-center gap-2">
            <div className="hud-panel px-3 py-2 flex items-center gap-3">
              <div className="relative">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  connected ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-white/5 border border-white/15"
                )}>
                  <Zap className={cn("w-4 h-4", connected ? "text-emerald-400" : "text-white/40")} />
                </div>
                {connected && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white/90 tracking-wide">LEADFARM</div>
                <div className="text-[9px] text-white/40 font-mono">{latest?.device_id || "NO DEVICE"}</div>
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
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-400/70" />
                  <span className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest">Off</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Time + refresh */}
          <div className="flex items-center gap-2">
            {timeSince != null && (
              <div className="hud-panel px-3 py-1.5 flex items-center gap-2">
                <Clock className="w-3 h-3 text-white/40" />
                <span className={cn(
                  "text-[10px] font-mono font-bold",
                  timeSince < 15 ? "text-emerald-400" : timeSince < 60 ? "text-amber-400" : "text-red-400"
                )}>
                  {timeSince < 60 ? `${timeSince}s` : `${Math.floor(timeSince / 60)}m`}
                </span>
              </div>
            )}
            <button onClick={fetchLatest} className="hud-panel p-2 hover:bg-white/10 transition-colors group">
              <RefreshCw className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
            </button>
          </div>
        </div>

        {/* ═══ TREATMENT SESSION CONTROL — BOTTOM CENTER ═══ */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-24px)] max-w-[520px]">
          {activeTreatment ? (
            /* Active treatment banner */
            <div className="hud-panel p-0 overflow-hidden border-emerald-500/30">
              {/* Green progress strip */}
              <div className="h-1 bg-emerald-500/20">
                <div className="h-full bg-emerald-400 animate-pulse" style={{ width: "100%" }} />
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      {typeIcons[activeTreatment.type] || <Activity className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/90">{activeTreatment.parcelleName}</div>
                      <div className="text-[10px] text-emerald-400/80 font-medium">
                        {typeLabels[activeTreatment.type] || activeTreatment.type} · En cours
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={endTreatment}
                    disabled={ending}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                      "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30",
                      ending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Square className="w-3.5 h-3.5" />
                    {ending ? "..." : "Terminer"}
                  </button>
                </div>

                {/* Live session metrics */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-white/35 block mb-0.5">VOLUME</span>
                    <span className={cn("text-sm font-bold font-mono", sessionVol > 0.1 ? "text-cyan-400" : "text-white/30")}>
                      {sessionVol.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-white/25 ml-0.5">L</span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-white/35 block mb-0.5">DOSE/HA</span>
                    <span className={cn("text-sm font-bold font-mono", dosePerHa > 0.1 ? "text-amber-400" : "text-white/30")}>
                      {dosePerHa.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-white/25 ml-0.5">L</span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-white/35 block mb-0.5">DURÉE</span>
                    <span className="text-sm font-bold font-mono text-white/60">
                      {sessionElapsed < 60
                        ? `${sessionElapsed}s`
                        : `${Math.floor(sessionElapsed / 60)}m`}
                    </span>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.06]">
                    <span className="text-[9px] text-white/35 block mb-0.5">DÉBIT</span>
                    <span className={cn(
                      "text-sm font-bold font-mono",
                      (latest?.flow1 ?? 0) + (latest?.flow2 ?? 0) > 0.1 ? "text-cyan-400" : "text-white/30"
                    )}>
                      {((latest?.flow1 ?? 0) + (latest?.flow2 ?? 0)).toFixed(1)}
                    </span>
                    <span className="text-[8px] text-white/25 ml-0.5">L/m</span>
                  </div>
                </div>

                {/* Products list */}
                {activeTreatment.products.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                    {activeTreatment.products.map((p, i) => (
                      <span key={i} className="text-[9px] bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-0.5 text-white/50">
                        {p.productName} · {p.quantityUsed} {p.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No active treatment — start button */
            <div className="relative">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className={cn(
                  "w-full hud-panel px-4 py-3 flex items-center justify-between transition-all",
                  "hover:bg-white/10 group",
                  showSelector && "rounded-b-none border-b-0"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Play className="w-4 h-4 text-emerald-400 ml-0.5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white/80">Démarrer un traitement</div>
                    <div className="text-[10px] text-white/40">
                      {treatments.length} traitement{treatments.length !== 1 ? "s" : ""} planifié{treatments.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-white/40 transition-transform",
                  showSelector && "rotate-180"
                )} />
              </button>

              {/* Treatment selector dropdown */}
              {showSelector && (
                <div className="hud-panel rounded-t-none border-t border-white/[0.06] max-h-[280px] overflow-y-auto">
                  {loadingTreatments ? (
                    <div className="p-4 text-center">
                      <RefreshCw className="w-4 h-4 text-white/30 animate-spin mx-auto mb-2" />
                      <span className="text-[10px] text-white/30">Chargement...</span>
                    </div>
                  ) : treatments.length === 0 ? (
                    <div className="p-4 text-center">
                      <Beaker className="w-5 h-5 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40">Aucun traitement planifié</p>
                      <p className="text-[10px] text-white/25 mt-1">Planifiez un traitement depuis la page Traitements</p>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {treatments.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => startTreatment(t)}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group/item"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              t.status === "in_progress"
                                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                : "bg-white/[0.06] border border-white/10 text-white/40 group-hover/item:text-white/60"
                            )}>
                              {typeIcons[t.type] || <Activity className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white/80 truncate">{t.parcelleName}</span>
                                {t.status === "in_progress" && (
                                  <span className="shrink-0 text-[8px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                                    EN COURS
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-white/40">
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
                            <Play className="w-3.5 h-3.5 text-white/20 group-hover/item:text-emerald-400 shrink-0 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ LEFT: RADIAL FLOW GAUGES ═══ */}
        <div className="absolute left-3 top-16 z-[500] space-y-2">
          <RadialFlowGauge
            label="DEBIT 1"
            flow={latest?.flow1 ?? 0}
            volume={latest?.vol1 ?? 0}
            active={flow1Active}
            color="cyan"
            maxFlow={30}
            sparkline={flowHistory.map(r => r.flow1)}
          />
          <RadialFlowGauge
            label="DEBIT 2"
            flow={latest?.flow2 ?? 0}
            volume={latest?.vol2 ?? 0}
            active={flow2Active}
            color="orange"
            maxFlow={30}
            sparkline={flowHistory.map(r => r.flow2)}
          />
        </div>

        {/* ═══ RIGHT: VERTICAL HUD STRIP ═══ */}
        <div className="absolute right-3 top-16 z-[500] w-[200px] space-y-2">

          {/* GPS Compass Card */}
          <div className={cn("hud-panel p-3", gpsValid ? "hud-panel-gps" : "")}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center",
                  gpsValid ? "bg-emerald-500/20" : "bg-white/5"
                )}>
                  <Satellite className={cn("w-3.5 h-3.5", gpsValid ? "text-emerald-400" : "text-white/30")} />
                </div>
                <span className="text-[10px] text-white/50 font-bold tracking-widest">GPS</span>
              </div>
              {gpsValid ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-md px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400">FIXE</span>
                </div>
              ) : (
                <span className="text-[9px] text-white/30 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">AUCUN</span>
              )}
            </div>

            {gpsValid && latest ? (
              <div className="space-y-2">
                <div className="bg-black/30 rounded-lg p-2 border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-emerald-400/70" />
                    <span className="text-[10px] font-mono text-white/70">
                      {latest.lat.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-emerald-400/70" />
                    <span className="text-[10px] font-mono text-white/70">
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
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Waves className="w-4 h-4 text-amber-400/50 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-400/60 font-medium">Recherche signal</p>
                  <p className="text-[9px] text-white/30">Module actif</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Parcelle */}
          <div className="hud-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[10px] text-white/50 font-bold tracking-widest">ZONE</span>
            </div>

            {activeParcelle ? (
              <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-sm ring-2 ring-white/10" style={{ backgroundColor: activeParcelle.color }} />
                  <span className="text-xs font-semibold text-white/90">{activeParcelle.name.split(" — ")[1] || activeParcelle.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/45">
                  <span className="bg-white/[0.06] px-1.5 py-0.5 rounded">{activeParcelle.cropType}</span>
                  <span>{activeParcelle.areaHectares} ha</span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-white/35 py-1">
                {gpsValid ? "Hors parcelle" : "GPS requis"}
              </div>
            )}
          </div>

          {/* Session Stats */}
          <div className="hud-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-cyan-500/15 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-[10px] text-white/50 font-bold tracking-widest">SESSION</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.04]">
                <span className={cn("text-sm font-bold font-mono block", gpsPoints.length > 0 ? "text-cyan-400" : "text-white/25")}>
                  {gpsPoints.length}
                </span>
                <span className="text-[8px] text-white/30 uppercase tracking-wider">GPS</span>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.04]">
                <span className="text-sm font-bold font-mono text-white/50 block">{history.length}</span>
                <span className="text-[8px] text-white/30 uppercase tracking-wider">DATA</span>
              </div>
              <div className="bg-black/30 rounded-lg p-2 text-center border border-white/[0.04]">
                <span className={cn(
                  "text-sm font-bold font-mono block",
                  gpsPoints.length > 0
                    ? (gpsPoints.length / Math.max(history.length, 1)) > 0.5 ? "text-emerald-400" : "text-amber-400"
                    : "text-white/25"
                )}>
                  {gpsPoints.length > 0 ? `${((gpsPoints.length / Math.max(history.length, 1)) * 100).toFixed(0)}%` : "—"}
                </span>
                <span className="text-[8px] text-white/30 uppercase tracking-wider">FIX</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ OFFLINE OVERLAY ═══ */}
        {(!latest || isOffline) && (
          <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl">
            <div className="hud-panel p-8 text-center max-w-md border-white/15">
              {!latest ? (
                <>
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                      <Activity className="w-10 h-10 text-amber-400" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/30 animate-ping" />
                  </div>
                  <h3 className="text-lg font-bold text-white/85 mb-2">En attente du capteur</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Connectez l&apos;ESP32 et configurez l&apos;URL API vers <code className="text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">/api/readings</code>
                  </p>
                </>
              ) : lastSessionStats && (
                <>
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                      <WifiOff className="w-10 h-10 text-red-400/80" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white/85 mb-1">Device hors ligne</h3>
                  <p className="text-sm text-white/40 mb-5">
                    {lastSessionStats.daysSince === 0
                      ? "Dernière activité aujourd'hui"
                      : lastSessionStats.daysSince === 1
                        ? "Dernière activité hier"
                        : `Il y a ${lastSessionStats.daysSince} jours`}
                    {" · "}
                    {lastSessionStats.lastActive.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.08]">
                      <span className="text-lg font-bold font-mono text-cyan-400 block">{lastSessionStats.readings}</span>
                      <span className="text-[9px] text-white/35">Lectures</span>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.08]">
                      <span className="text-lg font-bold font-mono text-emerald-400 block">{lastSessionStats.validGps}</span>
                      <span className="text-[9px] text-white/35">GPS pts</span>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.08]">
                      <span className="text-lg font-bold font-mono text-amber-400 block">{lastSessionStats.durationMin}m</span>
                      <span className="text-[9px] text-white/35">Durée</span>
                    </div>
                  </div>

                  <button onClick={fetchLatest} className="hud-panel px-5 py-2.5 text-sm flex items-center gap-2 mx-auto hover:bg-white/10 transition-colors text-white/70 hover:text-white/90">
                    <RefreshCw className="w-4 h-4" /> Vérifier
                  </button>
                </>
              )}
            </div>
          </div>
        )}
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
        <Droplets className={cn("w-3 h-3", active ? (color === "cyan" ? "text-cyan-400" : "text-orange-400") : "text-white/30")} />
        <span className="text-[9px] font-bold tracking-widest text-white/45">{label}</span>
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
              active ? (color === "cyan" ? "text-cyan-400" : "text-orange-400") : "text-white/40"
            )}>
              {flow.toFixed(1)}
            </span>
            <span className="text-[8px] text-white/30 mt-0.5">L/min</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <Sparkline data={sparkline} color={strokeColor} height={32} active={active} />
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <span className="text-[9px] text-white/30 block">VOLUME</span>
            <span className={cn("text-xs font-mono font-bold", volume > 0.1 ? "text-white/60" : "text-white/25")}>
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
        <span className="text-[8px] text-white/20">En attente...</span>
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
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-black/30 rounded-lg p-1.5 text-center border border-white/[0.04]">
      <div className={cn("mx-auto w-fit mb-0.5 opacity-50", colors[color])}>{icon}</div>
      <span className={cn("text-xs font-bold font-mono block", colors[color])}>{value}</span>
      <span className="text-[7px] text-white/25 uppercase tracking-wider">{label}</span>
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
