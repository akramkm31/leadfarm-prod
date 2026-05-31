"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { Apprentissage, IaDecision, MesureAgregee, Resultat } from "@/lib/mcd/types";
import { BarChart3, Brain, Radio } from "lucide-react";

type IaPayload = { decisions: IaDecision[]; apprentissages: Apprentissage[] };

export default function ResultatsPage() {
  const resultats = useMcdResource<Resultat[]>("/api/v1/resultats");
  const iot = useMcdResource<MesureAgregee[]>("/api/v1/resultats?scope=iot");
  const ia = useMcdResource<IaPayload>("/api/v1/resultats?scope=ia");

  const loading = resultats.loading || iot.loading || ia.loading;

  return (
    <McdPageShell
      title="Résultats & efficacité"
      subtitle="RÉSULTAT post-traitement · MESURE_AGRÉGÉE IoT · DECISION & APPRENTISSAGE"
      icon={<BarChart3 className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={loading}
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Efficacité traitements</h2>
          <div className="space-y-2">
            {(resultats.data || []).map((r) => (
              <div key={r.id} className="glass-card p-4 border border-[var(--color-stone-moss)] flex justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{r.parcelle_name || r.parcelle_id}</p>
                  <p className="text-xs text-[var(--color-mist-gray)]">
                    {r.date_evaluation ? new Date(r.date_evaluation).toLocaleDateString("fr-FR") : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-[var(--color-valley-green)]">
                    {r.taux_efficacite != null ? `${(r.taux_efficacite * 100).toFixed(0)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-[var(--color-mist-gray)]">
                    {r.rendement_observe != null ? `${r.rendement_observe} ${r.unite_rendement}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3 flex items-center gap-1">
            <Radio className="w-3 h-3" /> Agrégats IoT
          </h2>
          <div className="space-y-2 mb-6">
            {(iot.data || []).slice(0, 4).map((a) => (
              <div key={a.id} className="text-xs glass-card p-3 border border-[var(--color-stone-moss)]">
                <span className="font-bold">{a.type_mesure}</span> · {a.periode}
                <p className="font-mono mt-1">μ={a.valeur_moyenne?.toFixed(2)} ({a.nb_echantillons} pts)</p>
              </div>
            ))}
          </div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3 flex items-center gap-1">
            <Brain className="w-3 h-3" /> IA & apprentissage
          </h2>
          {(ia.data?.decisions || []).map((d) => (
            <div key={d.id} className="glass-card p-3 border border-[var(--color-stone-moss)] mb-2 text-sm">
              <p>{d.recommandation}</p>
              <p className="text-[10px] text-[var(--color-mist-gray)] mt-1">
                confiance {(d.score_confiance ?? 0) * 100}% · {d.statut}
              </p>
            </div>
          ))}
          {(ia.data?.apprentissages || []).map((a) => (
            <p key={a.id} className="text-[10px] text-[var(--color-mist-gray)]">
              Feedback {a.source_feedback} · perf {a.score_performance} · modèle {a.version_modele}
            </p>
          ))}
        </section>
      </div>
    </McdPageShell>
  );
}
