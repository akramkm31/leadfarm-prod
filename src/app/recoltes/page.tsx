"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { PnlCampagne, Recolte, Revenu } from "@/lib/mcd/types";
import { TrendingUp, Wheat } from "lucide-react";

type RecoltesPayload = { recoltes: Recolte[]; revenus: Revenu[] };

function formatDzd(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " DZD";
}

export default function RecoltesPage() {
  const { data, loading, error } = useMcdResource<RecoltesPayload>("/api/v1/recoltes");
  const pnl = useMcdResource<PnlCampagne[]>("/api/v1/recoltes?view=pnl");

  return (
    <McdPageShell
      title="Récoltes & P&L"
      subtitle="RÉCOLTE · REVENU · marge par campagne (Revenu − Dépense)"
      icon={<Wheat className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={loading || pnl.loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> P&L par campagne
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(pnl.data || []).map((c) => (
            <div key={c.campagne_id} className="glass-card p-5 border border-[var(--color-stone-moss)]">
              <p className="font-bold text-[var(--color-adaline-ink)]">{c.campagne_nom}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-mist-gray)]">Revenus</dt>
                  <dd className="font-mono text-emerald-700">{formatDzd(c.revenus_dzd)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-mist-gray)]">Dépenses</dt>
                  <dd className="font-mono text-red-700">{formatDzd(c.depenses_dzd)}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--color-stone-moss)] pt-2 font-semibold">
                  <dt>Marge</dt>
                  <dd className="font-mono text-[var(--color-valley-green)]">{formatDzd(c.marge_dzd)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Récoltes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-mist-gray)] text-xs uppercase">
                <th className="pb-2">Parcelle</th>
                <th className="pb-2">Date</th>
                <th className="pb-2">Quantité</th>
                <th className="pb-2">Qualité</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recoltes || []).map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-stone-moss)]">
                  <td className="py-2 font-medium">{r.parcelle_name}</td>
                  <td className="py-2">{new Date(r.date_recolte).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 font-mono">{r.quantite} {r.unite}</td>
                  <td className="py-2">{r.qualite || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </McdPageShell>
  );
}
