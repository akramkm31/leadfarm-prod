"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ClipboardList, FlaskConical, Layers, Scale } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { MagasinierPage } from "@/components/magasinier/MagasinierBranch";
import MagBesoinsPage from "@/components/magasinier/pages/MagBesoinsPage";
import { cn } from "@/lib/utils";
import { fetchLfNeeds, type LfNeed } from "@/lib/lechehab/besoins";

const CATEGORY_META: Record<string, { label: string; cls: string }> = {
  FONGICIDE: { label: "Fongicide", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  HERBICIDE: { label: "Herbicide", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  INSECTICIDE: { label: "Insecticide", cls: "bg-red-100 text-red-700 border-red-200" },
  ENGRAIS: { label: "Engrais", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  FER: { label: "Fer", cls: "bg-pink-100 text-pink-700 border-pink-200" },
  ACIDE: { label: "Acide", cls: "bg-teal-100 text-teal-700 border-teal-200" },
  DORMANCE: { label: "Dormance", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  HORMONE: { label: "Hormone", cls: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  AUTRE: { label: "Autre", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);

export default function BesoinsPage() {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <MagasinierPage mag={MagBesoinsPage} />;
  }
  return <BesoinsContent />;
}

function BesoinsContent() {
  const [needs, setNeeds] = useState<LfNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("ALL");

  useEffect(() => {
    let cancelled = false;
    fetchLfNeeds()
      .then((n) => !cancelled && setNeeds(n))
      .catch((e) => !cancelled && setError(e?.message || "Erreur de chargement"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of needs) c[n.category] = (c[n.category] ?? 0) + 1;
    return c;
  }, [needs]);

  const totalsByUnit = useMemo(() => {
    const t: Record<string, number> = {};
    for (const n of needs) t[n.unit] = (t[n.unit] ?? 0) + (n.quantity_needed || 0);
    return t;
  }, [needs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return needs
      .filter((n) => cat === "ALL" || n.category === cat)
      .filter(
        (n) =>
          !q ||
          (n.product_label ?? "").toLowerCase().includes(q) ||
          (n.active_ingredient_text ?? "").toLowerCase().includes(q)
      );
  }, [needs, query, cat]);

  const orderCats = useMemo(
    () => Object.keys(counts).sort((a, b) => counts[b] - counts[a]),
    [counts]
  );

  return (
    <AppLayout>
      <div className="lf-page-header mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-valley-green)]">Approvisionnement · Groupe Lechehab</p>
        <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight mt-1">Besoins &amp; Appro</h1>
        <p className="text-sm text-[var(--color-adaline-ink)]/55 mt-1">
          Besoins d&apos;approvisionnement réels par matière active — campagne 2026 (RESTE DES BESOINS SBA).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi icon={<ClipboardList className="w-4 h-4" />} label="Lignes de besoin" value={needs.length} />
        <Kpi icon={<Layers className="w-4 h-4" />} label="Catégories" value={Object.keys(counts).length} />
        {Object.entries(totalsByUnit).slice(0, 2).map(([unit, total]) => (
          <Kpi key={unit} icon={<Scale className="w-4 h-4" />} label={`Total ${unit.toUpperCase()}`} value={total} format />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-adaline-ink)]/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit ou une matière active…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-stone-moss)] bg-white/70 text-sm outline-none focus:border-[var(--color-valley-green)] focus:ring-2 focus:ring-[var(--color-valley-green)]/10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={cat === "ALL"} onClick={() => setCat("ALL")}>Tous ({needs.length})</Chip>
          {orderCats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_META[c]?.label ?? c} ({counts[c]})</Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-adaline-ink)]/40 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement des besoins…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-stone-moss)] overflow-hidden bg-white/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-black/[0.025] text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/50">
                  <th className="px-4 py-2.5 font-bold">Produit</th>
                  <th className="px-4 py-2.5 font-bold">Catégorie</th>
                  <th className="px-4 py-2.5 font-bold"><FlaskConical className="w-3 h-3 inline mr-1" />Matière active</th>
                  <th className="px-4 py-2.5 font-bold text-right">Quantité requise</th>
                  <th className="px-4 py-2.5 font-bold text-right">Unité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-stone-moss)]/50">
                {visible.map((n) => {
                  const meta = CATEGORY_META[n.category] ?? CATEGORY_META.AUTRE;
                  return (
                    <tr key={n.id} className="hover:bg-[var(--color-forest-dew)]/20 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-[var(--color-adaline-ink)]">{n.product_label || <span className="text-[var(--color-adaline-ink)]/30">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", meta.cls)}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-adaline-ink)]/70 max-w-[360px] truncate" title={n.active_ingredient_text || ""}>
                        {n.active_ingredient_text || <span className="text-[var(--color-adaline-ink)]/30">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-adaline-ink)] tabular-nums">{fmt(n.quantity_needed)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-valley-green)] uppercase">{n.unit}</td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--color-adaline-ink)]/40">Aucun besoin ne correspond.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-[var(--color-stone-moss)] text-[11px] text-[var(--color-adaline-ink)]/45 bg-black/[0.015]">
            {visible.length} besoin{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Kpi({ icon, label, value, format }: { icon: React.ReactNode; label: string; value?: number; format?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-stone-moss)] bg-white/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/45">
        <span className="text-[var(--color-valley-green)]">{icon}</span>{label}
      </div>
      <p className="text-xl font-bold text-[var(--color-adaline-ink)] mt-1 tabular-nums">
        {value === undefined ? "—" : format ? fmt(value) : value}
      </p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
        active ? "bg-[var(--color-valley-green)] text-white border-transparent" : "bg-white/60 text-[var(--color-adaline-ink)]/60 border-[var(--color-stone-moss)] hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}
