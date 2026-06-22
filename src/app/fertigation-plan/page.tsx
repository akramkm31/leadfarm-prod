"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Droplets, MapPin, Grid3x3, Ruler } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { groupFertigation, type LfFertigationLine } from "@/lib/lechehab/fertigation";

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

export default function FertigationPlanPage() {
  const [lines, setLines] = useState<LfFertigationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planMeta, setPlanMeta] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeStation, setActiveStation] = useState<string>("ALL");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/fertigation-plan", { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erreur de chargement");
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setLines(json.data || []);
        setPlanMeta(json.meta?.message ?? null);
      })
      .catch((e) => !cancelled && setError(e?.message || "Erreur de chargement"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const stations = useMemo(() => groupFertigation(lines), [lines]);
  const totalSurface = useMemo(
    () => stations.reduce((sum, s) => sum + s.surface_ha, 0),
    [stations]
  );

  const visibleStations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stations
      .filter((s) => activeStation === "ALL" || s.station === activeStation)
      .map((s) => ({
        ...s,
        sectors: s.sectors
          .map((sec) => ({
            ...sec,
            lines: sec.lines.filter((l) => !q || (l.input_label ?? "").toLowerCase().includes(q)),
          }))
          .filter((sec) => sec.lines.length > 0),
      }))
      .filter((s) => s.sectors.length > 0);
  }, [stations, activeStation, query]);

  return (
    <AppLayout>
      <div className="lf-page-header mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-valley-green)]">Fertigation · Groupe Lechehab</p>
        <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight mt-1">Plan de fertigation</h1>
        <p className="text-sm text-[var(--color-adaline-ink)]/55 mt-1">
          Planification réelle des intrants par station et secteur — Tenira / Pommier (dose × surface).
        </p>
        {planMeta && <p className="text-xs text-amber-700 mt-2">{planMeta}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi icon={<MapPin className="w-4 h-4" />} label="Stations" value={stations.length} />
        <Kpi icon={<Grid3x3 className="w-4 h-4" />} label="Lignes de plan" value={lines.length} />
        <Kpi icon={<Ruler className="w-4 h-4" />} label="Surface totale (ha)" value={totalSurface} format />
        <Kpi icon={<Droplets className="w-4 h-4" />} label="Intrants" value={new Set(lines.map((l) => l.input_label)).size} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-adaline-ink)]/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un intrant…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-stone-moss)] bg-white/70 text-sm outline-none focus:border-[var(--color-valley-green)] focus:ring-2 focus:ring-[var(--color-valley-green)]/10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={activeStation === "ALL"} onClick={() => setActiveStation("ALL")}>Toutes ({stations.length})</Chip>
          {stations.map((s) => (
            <Chip key={s.station} active={activeStation === s.station} onClick={() => setActiveStation(s.station)}>{s.station}</Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-adaline-ink)]/40 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement du plan…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : visibleStations.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-stone-moss)] bg-white/60 p-10 text-center text-[var(--color-adaline-ink)]/40">Aucune ligne ne correspond.</div>
      ) : (
        <div className="space-y-5">
          {visibleStations.map((station) => (
            <div key={station.station} className="rounded-2xl border border-[var(--color-stone-moss)] overflow-hidden bg-white/60">
              <div className="flex items-center justify-between px-4 py-3 bg-black/[0.025] border-b border-[var(--color-stone-moss)]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-valley-green)]" />
                  <h3 className="text-sm font-bold text-[var(--color-adaline-ink)]">{station.station}</h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--color-adaline-ink)]/50">{fmt(station.surface_ha)} ha · {station.lineCount} lignes</span>
              </div>
              <div className="divide-y divide-[var(--color-stone-moss)]/50">
                {station.sectors.map((sec) => (
                  <div key={sec.sector} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--color-adaline-ink)]/60 bg-[var(--color-stone-moss)]/50 px-1.5 py-0.5 rounded">{sec.sector}</span>
                      <span className="text-[10px] text-[var(--color-adaline-ink)]/40">{fmt(sec.surface_ha)} ha</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {sec.lines.map((l) => (
                        <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-stone-moss)]/60 bg-white/70">
                          <span className="text-xs text-[var(--color-adaline-ink)]/75 truncate" title={l.input_label || ""}>{l.input_label || "—"}</span>
                          <span className="text-xs font-mono font-bold text-[var(--color-valley-green)] tabular-nums shrink-0">{fmt(l.dose)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function Kpi({ icon, label, value, format }: { icon: React.ReactNode; label: string; value?: number; format?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-stone-moss)] bg-white/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/45">
        <span className="text-[var(--color-valley-green)]">{icon}</span>{label}
      </div>
      <p className="text-xl font-bold text-[var(--color-adaline-ink)] mt-1 tabular-nums">
        {value === undefined ? "—" : format ? fmt(value) : value}
      </p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
        active ? "bg-[var(--color-valley-green)] text-white border-transparent" : "bg-white/60 text-[var(--color-adaline-ink)]/60 border-[var(--color-stone-moss)] hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}
