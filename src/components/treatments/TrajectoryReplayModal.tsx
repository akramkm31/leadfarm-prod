"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Play, Pause, RotateCcw, Clock, Navigation, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { fetchTreatmentWithPoints } from "@/lib/data-provider";
import { dbPointsToTrajectory } from "@/lib/trajectory-utils";
import { cn } from "@/lib/utils";

const TractorLiveMap = dynamic(() => import("@/components/map/TractorLiveMap"), { ssr: false });

interface TrajectoryReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatmentId: string;
  parcelleName: string;
}

export default function TrajectoryReplayModal({
  isOpen,
  onClose,
  treatmentId,
  parcelleName,
}: TrajectoryReplayModalProps) {
  const [loading, setLoading] = useState(true);
  const [rawPoints, setRawPoints] = useState<any[]>([]);
  const [simIndex, setSimIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(5); // Multiplier

  useEffect(() => {
    if (isOpen && treatmentId) {
      loadTrajectory();
    }
  }, [isOpen, treatmentId]);

  async function loadTrajectory() {
    setLoading(true);
    try {
      const data = await fetchTreatmentWithPoints(treatmentId);
      if (data && data.points) {
        setRawPoints(data.points);
      }
    } catch (err) {
      console.error("Error loading trajectory:", err);
    } finally {
      setLoading(false);
    }
  }

  const trajectory = useMemo(() => dbPointsToTrajectory(rawPoints), [rawPoints]);

  // Replay logic
  useEffect(() => {
    if (!isPlaying || rawPoints.length === 0) return;

    const timer = setTimeout(() => {
      setSimIndex((prev) => {
        if (prev >= rawPoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, Math.max(10, 200 / playbackSpeed));

    return () => clearTimeout(timer);
  }, [isPlaying, simIndex, rawPoints.length, playbackSpeed]);

  const currentPoint = rawPoints[simIndex] || null;
  const currentTrail = useMemo(() =>
    rawPoints.slice(0, simIndex + 1).map(p => ({
      lat: p.lat,
      lon: p.lng,
      flow: ((p.debit1_lpm ?? 0) + (p.debit2_lpm ?? 0)) / 2,
    })),
    [rawPoints, simIndex]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 " onClick={onClose} />

      <div className="relative w-full max-w-6xl h-full max-h-[800px] bg-[#0c0c0c] border border-[var(--color-stone-moss)] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-stone-moss)] bg-black/40">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Trajectoire Réelle: {parcelleName}</h2>
            <p className="text-xs text-[var(--color-adaline-ink)]/40 font-mono">ID: {treatmentId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-stone-moss)] rounded-full transition-colors">
            <X className="w-5 h-5 text-[var(--color-adaline-ink)]/60" />
          </button>
        </div>

        <div className="flex-1 relative flex">
          {/* Map Section */}
          <div className="flex-1 relative bg-[#111]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[var(--color-adaline-ink)]/40">Chargement de la trajectoire...</p>
                </div>
              </div>
            ) : rawPoints.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--color-adaline-ink)]/40 text-sm">
                Aucune donnée de trajectoire disponible pour ce traitement.
              </div>
            ) : (
              <TractorLiveMap
                points={[]}
                trajectory={trajectory}
                livePosition={currentPoint ? { lat: currentPoint[0], lon: currentPoint[1], speed: currentPoint[2] } : null}
                realTrail={currentTrail}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Controls Panel */}
          {!loading && rawPoints.length > 0 && (
            <div className="w-72 border-l border-[var(--color-stone-moss)] bg-black/60 p-5 flex flex-col gap-6">
              {/* Playback Controls */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-[var(--color-adaline-ink)]/30 uppercase tracking-widest">Replay</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      isPlaying ? "bg-[var(--color-valley-green)]/20 text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/30" : "bg-[var(--color-canvas-ice)] text-[var(--color-adaline-ink)]/80 border border-[var(--color-stone-moss)] hover:bg-[var(--color-stone-moss)]"
                    )}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </button>
                  <button
                    onClick={() => { setSimIndex(0); setIsPlaying(false); }}
                    className="w-12 h-12 rounded-2xl bg-[var(--color-canvas-ice)] text-[var(--color-adaline-ink)]/60 border border-[var(--color-stone-moss)] flex items-center justify-center hover:bg-[var(--color-stone-moss)] transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-[var(--color-adaline-ink)]/40">
                    <span>Vitesse</span>
                    <span>{playbackSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-[var(--color-stone-moss)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-[var(--color-adaline-ink)]/40">
                  <span>Progression</span>
                  <span>{Math.round((simIndex / (rawPoints.length - 1)) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={rawPoints.length - 1}
                  value={simIndex}
                  onChange={(e) => { setSimIndex(Number(e.target.value)); setIsPlaying(false); }}
                  className="w-full accent-amber-500 h-1.5 bg-[var(--color-stone-moss)] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Stats Card */}
              <div className="mt-auto space-y-3">
                <div className="hud-panel p-3 bg-white/[0.03] border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                    <span className="text-[10px] font-bold text-[var(--color-adaline-ink)]/60 uppercase">Vitesse</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-adaline-ink)]/90 font-mono">
                    {currentPoint ? currentPoint[2].toFixed(1) : "0.0"} <span className="text-xs text-[var(--color-adaline-ink)]/30">km/h</span>
                  </div>
                </div>

                <div className="hud-panel p-3 bg-white/[0.03] border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                    <span className="text-[10px] font-bold text-[var(--color-adaline-ink)]/60 uppercase">Heure</span>
                  </div>
                  <div className="text-sm font-bold text-[var(--color-adaline-ink)]/80 font-mono">
                    {currentPoint ? new Date(currentPoint[3]).toLocaleTimeString("fr-FR") : "--:--:--"}
                  </div>
                </div>

                <div className="hud-panel p-3 bg-white/[0.03] border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                    <span className="text-[10px] font-bold text-[var(--color-adaline-ink)]/60 uppercase">Points</span>
                  </div>
                  <div className="text-sm font-bold text-[var(--color-adaline-ink)]/80 font-mono">
                    {simIndex + 1} / {rawPoints.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
