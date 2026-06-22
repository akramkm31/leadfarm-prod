"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useParcelles, useTreatments } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import { GitBranch, MapPin, Loader2, ChevronRight, Sprout, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export default function TraceLandingPage() {
  const router = useRouter();
  const { data: parcellesRaw, loading } = useParcelles();
  const { data: allTreatments } = useTreatments();
  const parcelles = (parcellesRaw || []) as Parcelle[];
  const treatments = (allTreatments || []) as Record<string, unknown>[];

  const countByParcelle = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of treatments) {
      const id = String(t.parcelleId || t.parcelle_id || "");
      const name = String(t.parcelleName || t.site_name || "");
      if (id) m[id] = (m[id] ?? 0) + 1;
      if (name) m[name] = (m[name] ?? 0) + 1;
    }
    return m;
  }, [treatments]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--primary-025)]" style={{ background: "var(--primary-015)" }}>
            <GitBranch className="w-6 h-6" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>Traçabilité parcellaire</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {parcelles.length} parcelle{parcelles.length !== 1 ? "s" : ""} — sélectionnez pour ouvrir la fiche complète
            </p>
          </div>
        </div>

        {loading ? (
          <div className="glass-card p-16 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Chargement des parcelles…</span>
          </div>
        ) : parcelles.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-2">
            <MapPin className="w-10 h-10 mx-auto opacity-20" style={{ color: "var(--text-secondary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Aucune parcelle disponible</p>
            <button onClick={() => router.push("/parcelles")} className="text-xs font-semibold mt-1" style={{ color: "var(--primary)" }}>
              Créer une parcelle →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parcelles.map((p) => {
              const count = countByParcelle[p.id] || countByParcelle[p.name] || 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => router.push(`/trace/${p.id}`)}
                  className="glass-card p-4 text-left flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
                >
                  {/* Top: color + name */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full border-2 border-white shadow-md shrink-0 mt-0.5"
                        style={{ background: p.color }}
                      />
                      <span className="text-sm font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
                        {p.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" style={{ color: "var(--text-secondary)" }} />
                  </div>

                  {/* Middle: crop + area */}
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <span className="inline-flex items-center gap-1">
                      <Sprout className="w-3 h-3" />
                      {[p.cropType, p.variete].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <span className="font-mono">{p.areaHectares} ha</span>
                  </div>

                  {/* Bottom: treatment count */}
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--glass-border)" }}>
                    <BarChart3 className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                      {count} intervention{count !== 1 ? "s" : ""}
                    </span>
                    {p.zone && (
                      <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-015)", color: "var(--primary)" }}>
                        {p.zone}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
