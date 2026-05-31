"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { MicroZone } from "@/lib/mcd/types";
import { Layers } from "lucide-react";
import Link from "next/link";

export default function MicroZonesPage() {
  const { data, loading, error } = useMcdResource<MicroZone[]>("/api/v1/micro-zones");

  return (
    <McdPageShell
      title="Micro-zones"
      subtitle="Subdivision parcelle · humidité sol · stress hydrique · conductivité (CE)"
      icon={<Layers className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {(data || []).map((z) => (
          <div key={z.id} className="glass-card p-5 border border-[var(--color-stone-moss)]">
            <h3 className="font-bold text-[var(--color-adaline-ink)]">{z.nom}</h3>
            <p className="text-xs text-[var(--color-mist-gray)] mt-1">{z.parcelle_name || z.parcelle_id}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-[var(--color-mist-gray)]">Humidité</dt>
                <dd className="font-mono font-semibold">{z.humidite_pourcentage ?? "—"} %</dd>
              </div>
              <div>
                <dt className="text-[var(--color-mist-gray)]">Stress hydrique</dt>
                <dd className="font-mono font-semibold">{z.stress_hydrique ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[var(--color-mist-gray)]">CE sol</dt>
                <dd className="font-mono font-semibold">{z.conductivite_electrique_ds_m ?? "—"} dS/m</dd>
              </div>
            </dl>
            <Link href={`/parcelles?select=${z.parcelle_id}`} className="text-xs text-[var(--color-valley-green)] font-semibold mt-3 inline-block hover:underline">
              Voir sur la carte →
            </Link>
          </div>
        ))}
      </div>
    </McdPageShell>
  );
}
