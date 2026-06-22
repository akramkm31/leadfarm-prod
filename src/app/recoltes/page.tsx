"use client";

import { useMemo, useState } from "react";
import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { PnlCampagne, Recolte, Revenu } from "@/lib/mcd/types";
import {
  TrendingUp, TrendingDown, Wheat, Download,
  DollarSign, Percent, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RecoltesPayload = { recoltes: Recolte[]; revenus: Revenu[] };

function formatDzd(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " DZD";
}

function MarginBadge({ pct }: { pct: number }) {
  const cls =
    pct > 20 ? "bg-emerald-100 text-emerald-700" :
    pct >= 0  ? "bg-amber-100 text-amber-700"   :
                "bg-red-100 text-red-700";
  return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cls)}>{pct.toFixed(1)}%</span>;
}

export default function RecoltesPage() {
  const { data, loading, error } = useMcdResource<RecoltesPayload>("/api/v1/recoltes");
  const pnl = useMcdResource<PnlCampagne[]>("/api/v1/recoltes?view=pnl");

  const recoltes = data?.recoltes ?? [];
  const pnlData  = pnl.data ?? [];

  const [campagneFil, setCampagneFil] = useState("");

  const kpis = useMemo(() => {
    if (!pnlData.length) return null;
    const rev   = pnlData.reduce((s, c) => s + c.revenus_dzd, 0);
    const dep   = pnlData.reduce((s, c) => s + c.depenses_dzd, 0);
    const marge = rev - dep;
    return { rev, dep, marge, pct: rev > 0 ? (marge / rev) * 100 : 0 };
  }, [pnlData]);

  const recoltesFiltered = useMemo(
    () => campagneFil ? recoltes.filter((r) => r.campagne_id === campagneFil) : recoltes,
    [recoltes, campagneFil]
  );

  function exportCSV() {
    const rows = [
      ["Parcelle", "Campagne", "Date", "Quantite", "Unite", "Qualite"],
      ...recoltes.map((r) => [
        r.parcelle_name ?? r.parcelle_id,
        r.campagne_nom ?? r.campagne_id ?? "",
        new Date(r.date_recolte).toLocaleDateString("fr-FR"),
        String(r.quantite),
        r.unite,
        r.qualite ?? "",
      ]),
    ];
    const csv  = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `recoltes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <McdPageShell
      title="Recoltes & P&L"
      subtitle="Resultats de recolte · Revenus & depenses · Marge nette par campagne"
      icon={<Wheat className="w-6 h-6 text-[var(--color-valley-green)]" />}
      action={
        recoltes.length > 0 ? (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-[var(--color-stone-moss)] hover:bg-[var(--color-stone-moss)]/20 text-[var(--color-adaline-ink)]"
          >
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
        ) : undefined
      }
      loading={loading || pnl.loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* KPI Strip */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Revenus totaux",   value: formatDzd(kpis.rev),   Icon: TrendingUp,   color: "text-emerald-600" },
            { label: "Depenses totales", value: formatDzd(kpis.dep),   Icon: TrendingDown, color: "text-red-500" },
            {
              label: "Marge nette",
              value: formatDzd(kpis.marge),
              Icon: DollarSign,
              color: kpis.marge >= 0 ? "text-emerald-600" : "text-red-600",
            },
            {
              label: "Marge %",
              value: `${kpis.pct.toFixed(1)}%`,
              Icon: Percent,
              color: kpis.pct > 20 ? "text-emerald-600" : kpis.pct >= 0 ? "text-amber-600" : "text-red-600",
            },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="glass-card p-4 border border-[var(--color-stone-moss)]">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("w-3.5 h-3.5", color)} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-mist-gray)]">{label}</span>
              </div>
              <p className={cn("text-lg font-black leading-tight", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* P&L par campagne */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> P&L par campagne
        </h2>
        {pnlData.length === 0 ? (
          <div className="glass-card p-8 text-center border border-[var(--color-stone-moss)]">
            <TrendingUp className="w-8 h-8 mx-auto text-[var(--color-mist-gray)] mb-2" />
            <p className="text-sm text-[var(--color-mist-gray)]">Aucune donnee P&L disponible</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pnlData.map((c) => {
              const pct    = c.revenus_dzd > 0 ? (c.marge_dzd / c.revenus_dzd) * 100 : 0;
              const active = campagneFil === c.campagne_id;
              return (
                <button
                  key={c.campagne_id}
                  onClick={() => setCampagneFil(active ? "" : c.campagne_id)}
                  className={cn(
                    "glass-card p-5 border text-left transition-all",
                    active
                      ? "border-[var(--color-valley-green)] bg-[var(--color-valley-green)]/5"
                      : "border-[var(--color-stone-moss)] hover:border-[var(--color-valley-green)]/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="font-bold text-[var(--color-adaline-ink)] text-sm leading-tight">{c.campagne_nom}</p>
                    <MarginBadge pct={pct} />
                  </div>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-mist-gray)]">Revenus</dt>
                      <dd className="font-mono text-emerald-700 font-semibold">{formatDzd(c.revenus_dzd)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-mist-gray)]">Depenses</dt>
                      <dd className="font-mono text-red-600 font-semibold">{formatDzd(c.depenses_dzd)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-[var(--color-stone-moss)] pt-1.5 font-bold text-sm">
                      <dt>Marge</dt>
                      <dd className={cn("font-mono", c.marge_dzd >= 0 ? "text-[var(--color-valley-green)]" : "text-red-600")}>
                        {formatDzd(c.marge_dzd)}
                      </dd>
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--color-mist-gray)] pt-0.5">
                      <span>{c.nb_recoltes} recolte{c.nb_recoltes !== 1 ? "s" : ""}</span>
                      <span>{c.nb_traitements} traitement{c.nb_traitements !== 1 ? "s" : ""}</span>
                    </div>
                  </dl>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Recoltes table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] flex items-center gap-2">
            <Wheat className="w-4 h-4" /> Recoltes
            {campagneFil && (
              <span className="normal-case font-normal text-[var(--color-valley-green)]">— filtrees</span>
            )}
          </h2>
          {campagneFil && (
            <button
              onClick={() => setCampagneFil("")}
              className="flex items-center gap-1 text-[10px] text-[var(--color-mist-gray)] hover:text-[var(--color-adaline-ink)]"
            >
              <X className="w-3 h-3" /> Reinitialiser
            </button>
          )}
        </div>
        {recoltesFiltered.length === 0 ? (
          <div className="glass-card p-8 text-center border border-[var(--color-stone-moss)]">
            <Wheat className="w-8 h-8 mx-auto text-[var(--color-mist-gray)] mb-2" />
            <p className="text-sm text-[var(--color-mist-gray)]">Aucune recolte enregistree</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-stone-moss)]">
            <table className="glass-table w-full text-sm">
              <thead>
                <tr>
                  <th>Parcelle</th>
                  <th>Campagne</th>
                  <th>Date</th>
                  <th>Quantite</th>
                  <th>Qualite</th>
                </tr>
              </thead>
              <tbody>
                {recoltesFiltered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-[var(--color-adaline-ink)]/80">{r.parcelle_name ?? "—"}</td>
                    <td className="text-xs text-[var(--color-mist-gray)]">{r.campagne_nom ?? "—"}</td>
                    <td>{new Date(r.date_recolte).toLocaleDateString("fr-FR")}</td>
                    <td className="font-mono">{r.quantite} {r.unite}</td>
                    <td>
                      {r.qualite ? (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          r.qualite === "A" ? "bg-emerald-100 text-emerald-700" :
                          r.qualite === "B" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {r.qualite}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </McdPageShell>
  );
}
