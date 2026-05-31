"use client";

import { useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useMcdResource } from "@/hooks/useMcd";
import type { DonneesSatellite } from "@/lib/mcd/types";
import {
  Satellite,
  Layers,
  TrendingUp,
  Droplets,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function statusFromNdvi(ndvi: number) {
  if (ndvi >= 0.7) return "Excellent";
  if (ndvi >= 0.55) return "Sain";
  return "Stress";
}

export default function SatellitePage() {
  const { data, loading, error, refetch } = useMcdResource<DonneesSatellite[]>("/api/v1/satellite-data");
  const rows = data || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const selected = useMemo(() => {
    if (!rows.length) return null;
    const id = selectedId || rows[0].id;
    return rows.find((r) => r.id === id) || rows[0];
  }, [rows, selectedId]);

  const handleSync = () => {
    setSyncing(true);
    refetch().finally(() => setTimeout(() => setSyncing(false), 800));
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--green-010)] border border-[var(--green-020)] flex items-center justify-center">
              <Satellite className="w-7 h-7 text-[var(--interactive-green)]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[var(--text-primary)]">Imagerie Satellite</h1>
              <p className="text-sm text-[var(--text-tertiary)] mt-0.5 font-medium">
                DONNÉES_SATELLITE · NDVI & NDWI (Sentinel-2)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--green-010)] border border-[var(--green-020)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--leaf-green)]" />
              <span className="text-[10px] font-bold text-[var(--leaf-green)] uppercase tracking-wider">API MCD</span>
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--color-adaline-ink)] text-sm font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50"
            >
              <RefreshCcw className={cn("w-4 h-4", syncing && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading && <p className="text-sm text-[var(--text-tertiary)] mb-4">Chargement des indices…</p>}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)]">Aucune acquisition — appliquez la migration 019 et importez des données.</p>
        )}

        {selected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-black text-[var(--text-tertiary)] uppercase tracking-widest px-2">Parcelles</h3>
              {rows.map((p) => {
                const ndvi = p.indice_ndvi ?? 0;
                const ndwi = p.indice_ndwi ?? 0;
                const status = statusFromNdvi(ndvi);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "w-full text-left p-5 rounded-[28px] border transition-all duration-300",
                      selected.id === p.id
                        ? "bg-[var(--surface-pure)] border-[var(--green-020)] shadow-xl shadow-emerald-500/5 ring-1 ring-[var(--green-010)]"
                        : "bg-[var(--black-004)] border-transparent hover:bg-[var(--black-006)]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-tighter">
                        {new Date(p.date_acquisition).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[var(--green-010)] border border-[var(--green-020)] text-[var(--leaf-green)]">
                        {status}
                      </span>
                    </div>
                    <h4 className="font-bold text-[var(--text-primary)] mb-4">{p.parcelle_name || p.parcelle_id}</h4>
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">NDVI</span>
                        <span className="text-sm font-black text-[var(--interactive-green)]">{ndvi.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">NDWI</span>
                        <span className="text-sm font-black text-[var(--text-primary)]">{ndwi.toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="aspect-[16/9] rounded-[32px] bg-[var(--surface-canvas)] border border-[var(--black-008)] relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-amber-900/20" />
                <div className="absolute top-6 left-6 px-4 py-2 rounded-2xl bg-white/90 shadow-lg border flex items-center gap-3">
                  <Layers className="w-4 h-4 text-[var(--interactive-green)]" />
                  <span className="text-xs font-bold">NDVI · {selected.source_satellite || "Sentinel-2"}</span>
                </div>
                <Link
                  href={`/parcelles?select=${selected.parcelle_id}`}
                  className="absolute bottom-6 left-6 text-xs font-bold text-white bg-[var(--color-valley-green)] px-4 py-2 rounded-full"
                >
                  Ouvrir la parcelle →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-[32px] border bg-[var(--surface-pure)] shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Droplets className="w-4 h-4 text-[var(--interactive-green)]" />
                    <h4 className="text-sm font-black">NDWI</h4>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Indice {(selected.indice_ndwi ?? 0).toFixed(2)} — stress hydrique foliaire.
                  </p>
                </div>
                <div className="p-6 rounded-[32px] border bg-[var(--green-010)]/20 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-4 h-4 text-[var(--leaf-green)]" />
                    <h4 className="text-sm font-black">NDVI</h4>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Vigueur {Math.round((selected.indice_ndvi ?? 0) * 100)}%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
