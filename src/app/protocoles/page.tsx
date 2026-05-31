"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { Protocole } from "@/lib/mcd/types";
import { ScrollText } from "lucide-react";

export default function ProtocolesPage() {
  const { data, loading, error } = useMcdResource<Protocole[]>("/api/v1/protocoles");

  return (
    <McdPageShell
      title="Protocoles agronomiques"
      subtitle="Itinéraires techniques · étapes J+n · types d'événement normalisés"
      icon={<ScrollText className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {(data || []).map((p) => (
          <div key={p.id} className="glass-card p-6 border border-[var(--color-stone-moss)]">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-adaline-ink)]">{p.nom}</h3>
                <p className="text-xs text-[var(--color-mist-gray)]">
                  {p.type_culture} {p.variete_culture ? `· ${p.variete_culture}` : ""}
                </p>
              </div>
              {p.actif && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--color-forest-dew)] text-[var(--color-valley-green)]">
                  Actif
                </span>
              )}
            </div>
            {p.description && <p className="text-sm text-[var(--color-mist-gray)] mb-4">{p.description}</p>}
            <ol className="space-y-2 border-l-2 border-[var(--color-valley-green)]/30 pl-4">
              {(p.etapes || []).map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="font-mono text-[10px] text-[var(--color-mist-gray)]">J+{e.jours_apres_plantation ?? "?"}</span>
                  <span className="font-semibold text-[var(--color-adaline-ink)] ml-2">{e.type_action}</span>
                  {e.type_evenement_code && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{e.type_evenement_code}</span>
                  )}
                  {e.description && <p className="text-xs text-[var(--color-mist-gray)] mt-0.5">{e.description}</p>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </McdPageShell>
  );
}
