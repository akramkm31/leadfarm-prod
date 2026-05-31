"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { DonneesMeteo } from "@/lib/mcd/types";
import { CloudRain, Thermometer, Wind } from "lucide-react";

export default function MeteoPage() {
  const { data, loading, error } = useMcdResource<DonneesMeteo[]>("/api/v1/meteo");

  return (
    <McdPageShell
      title="Données météo"
      subtitle="DONNÉES_MÉTÉO par zone · températures · pluie · vent"
      icon={<CloudRain className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid gap-3">
        {(data || []).map((m) => (
          <div key={m.id} className="glass-card p-4 border border-[var(--color-stone-moss)] flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-[var(--color-mist-gray)]">{m.zone_label || "Zone"}</p>
              <p className="font-bold">{new Date(m.date_mesure).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <span className="font-mono">{m.temperature_min_c}° – {m.temperature_max_c}°C</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CloudRain className="w-4 h-4 text-blue-500" />
              <span className="font-mono">{m.pluviometrie_mm ?? 0} mm</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wind className="w-4 h-4 text-slate-500" />
              <span className="font-mono">{m.vitesse_vent_kmh ?? "—"} km/h</span>
            </div>
            <span className="text-xs text-[var(--color-mist-gray)]">HR {m.humidite_pourcentage ?? "—"}%</span>
          </div>
        ))}
      </div>
    </McdPageShell>
  );
}
