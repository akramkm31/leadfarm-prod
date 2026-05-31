"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useParcelles } from "@/hooks/useData";
import type { Parcelle } from "@/lib/mock-data";
import Link from "next/link";
import { GitBranch, ArrowRight, MapPin, Loader2 } from "lucide-react";

export default function TraceLandingPage() {
  const router = useRouter();
  const { data: parcellesRaw, loading } = useParcelles();
  const parcelles = (parcellesRaw || []) as Parcelle[];

  function openParcelle(id: string) {
    router.push(`/trace/${id}`);
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary-015)", border: "1px solid var(--primary-025)" }}
            >
              <GitBranch className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Traçabilité
              </h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Choisir une parcelle pour ouvrir la fiche traçabilité.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des parcelles…
            </div>
          ) : parcelles.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>
              Aucune parcelle disponible.{" "}
              <button
                type="button"
                onClick={() => router.push("/parcelles")}
                className="underline"
                style={{ color: "var(--primary)" }}
              >
                Créer une parcelle
              </button>
            </p>
          ) : (
            <ul className="space-y-2 max-h-[min(60vh,420px)] overflow-y-auto">
              {parcelles.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openParcelle(p.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors hover:bg-[var(--black-004)]"
                    style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
                  >
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{p.name}</span>
                      {(p.variete || p.cropType) && (
                        <span className="text-[10px] block truncate" style={{ color: "var(--text-tertiary)" }}>
                          {[p.cropType, p.variete].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
