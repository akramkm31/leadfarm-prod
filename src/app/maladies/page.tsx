"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { EvenementMaladie, Maladie } from "@/lib/mcd/types";
import { Bug } from "lucide-react";
import Link from "next/link";

type MaladiesPayload = { maladies: Maladie[]; evenements: EvenementMaladie[] };

const SEV_COLOR: Record<string, string> = {
  faible: "bg-slate-100 text-slate-600",
  moderee: "bg-amber-100 text-amber-800",
  elevee: "bg-orange-100 text-orange-800",
  critique: "bg-red-100 text-red-800",
};

export default function MaladiesPage() {
  const { data, loading, error } = useMcdResource<MaladiesPayload>("/api/v1/maladies?events=1");

  return (
    <McdPageShell
      title="Maladies & observations"
      subtitle="Référentiel pathogènes · événements maladie · lien parcelle / vision IA"
      icon={<Bug className="w-6 h-6 text-[var(--color-valley-green)]" />}
      action={
        <Link href="/vision" className="text-xs font-semibold px-4 py-2 rounded-full bg-[var(--color-valley-green)] text-white hover:opacity-90">
          Diagnostic IA →
        </Link>
      }
      loading={loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Référentiel</h2>
          <div className="space-y-2">
            {(data?.maladies || []).map((m) => (
              <div key={m.id} className="glass-card p-4 border border-[var(--color-stone-moss)]">
                <p className="font-semibold text-[var(--color-adaline-ink)]">{m.nom}</p>
                <p className="text-xs text-[var(--color-mist-gray)]">{m.type_pathogene} · {(m.cultures_cibles || []).join(", ")}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Observations récentes</h2>
          <div className="space-y-2">
            {(data?.evenements || []).map((e) => (
              <div key={e.id} className="glass-card p-4 border border-[var(--color-stone-moss)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{e.maladie_nom || e.maladie_id}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_COLOR[e.severite] || SEV_COLOR.moderee}`}>
                    {e.severite}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-mist-gray)] mt-1">
                  {e.parcelle_name} · {new Date(e.date_observation).toLocaleDateString("fr-FR")} · {e.source}
                </p>
                {e.parcelle_id && (
                  <Link href={`/parcelles?select=${e.parcelle_id}`} className="text-xs text-[var(--color-valley-green)] font-semibold mt-2 inline-block">
                    Localiser →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </McdPageShell>
  );
}
