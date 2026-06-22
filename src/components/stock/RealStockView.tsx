"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, Boxes, AlertTriangle, FlaskConical, Layers,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RotateCcw, Warehouse, Plus, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchLfStock, fetchLfMovements, type LfStockLevel, type LfMovement } from "@/lib/lechehab/stock";
import { useAccessContext } from "@/components/auth/AccessProvider";

const CAT_META: Record<string, { label: string; cls: string; dot: string }> = {
  FONGICIDE: { label: "Fongicide", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "#10b981" },
  HERBICIDE: { label: "Herbicide", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "#f59e0b" },
  INSECTICIDE: { label: "Insecticide", cls: "bg-red-100 text-red-700 border-red-200", dot: "#ef4444" },
  ENGRAIS: { label: "Engrais", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "#3b82f6" },
  FER: { label: "Fer", cls: "bg-orange-100 text-orange-700 border-orange-200", dot: "#ea580c" },
  ACIDE: { label: "Acide", cls: "bg-violet-100 text-violet-700 border-violet-200", dot: "#8b5cf6" },
  AUTRE: { label: "Autre", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "#94a3b8" },
};
const ORDER = ["FONGICIDE", "INSECTICIDE", "HERBICIDE", "ENGRAIS", "FER", "ACIDE", "AUTRE"];

const FLOW_META: Record<string, { Icon: typeof ArrowDownLeft; cls: string; label: string }> = {
  entree: { Icon: ArrowDownLeft, cls: "text-emerald-600 bg-emerald-50", label: "Entrée" },
  sortie: { Icon: ArrowUpRight, cls: "text-amber-600 bg-amber-50", label: "Sortie" },
  transfert: { Icon: ArrowLeftRight, cls: "text-blue-600 bg-blue-50", label: "Transfert" },
  retour: { Icon: RotateCcw, cls: "text-emerald-600 bg-emerald-50", label: "Retour" },
  stock_initial: { Icon: Warehouse, cls: "text-slate-600 bg-slate-100", label: "Stock initial" },
};

const fmt = (n: number) => n.toLocaleString("fr-DZ", { maximumFractionDigits: 1 });

export default function RealStockView({ onEntree, onSortie }: { onEntree?: (name: string) => void; onSortie?: (name: string) => void }) {
  const { can } = useAccessContext();
  const canEdit = can('stock.edit');
  const [stock, setStock] = useState<LfStockLevel[]>([]);
  const [movements, setMovements] = useState<LfMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("ALL");
  const [group, setGroup] = useState<"cat" | "ma">("cat");
  const [negOnly, setNegOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLfStock(), fetchLfMovements(60)])
      .then(([s, m]) => { if (!cancelled) { setStock(s); setMovements(m); } })
      .catch((e) => !cancelled && setError(e?.message || "Erreur de chargement"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const withStock = useMemo(() => stock.filter((s) => Number(s.reste) !== 0), [stock]);
  const negatives = useMemo(() => stock.filter((s) => s.is_negative), [stock]);
  const base = showAll ? stock : withStock;
  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of base) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [base]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base
      .filter((s) => cat === "ALL" || s.category === cat)
      .filter((s) => !negOnly || s.is_negative)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.active_ingredient ?? "").toLowerCase().includes(q));
  }, [base, cat, negOnly, query]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: LfStockLevel[] }>();
    for (const s of visible) {
      const key = group === "cat" ? s.category : (s.active_ingredient || "— Sans matière active —");
      const label = group === "cat" ? (CAT_META[s.category]?.label ?? s.category) : key;
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(s);
    }
    const arr = [...map.values()];
    arr.forEach((g) => g.items.sort((a, b) => Number(b.reste) - Number(a.reste)));
    return arr.sort((a, b) =>
      group === "cat" ? ORDER.indexOf(a.key) - ORDER.indexOf(b.key) : b.items.length - a.items.length || a.label.localeCompare(b.label)
    );
  }, [visible, group]);

  if (loading) return <div className="flex items-center justify-center py-20 text-[var(--color-adaline-ink)]/40 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Chargement du stock réel…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 xl:col-span-8 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={<Boxes className="w-4 h-4" />} label="Produits en stock" value={withStock.length} />
          <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Stocks négatifs" value={negatives.length} tone={negatives.length ? "red" : "ok"} />
          <Kpi icon={<Layers className="w-4 h-4" />} label="Catégories" value={Object.keys(catCounts).length} />
          <Kpi icon={<FlaskConical className="w-4 h-4" />} label="Mat. actives" value={new Set(withStock.map((s) => s.active_ingredient).filter(Boolean)).size} />
        </div>

        {/* Negative-stock alert (data quality — never silently fix) */}
        {negatives.length > 0 && (
          <button
            type="button"
            onClick={() => { setNegOnly((v) => !v); setCat("ALL"); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-left text-sm transition-colors",
              negOnly ? "bg-red-100 border-red-300" : "bg-red-50 border-red-200 hover:bg-red-100"
            )}
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-red-700">
              <b>{negatives.length} stocks négatifs</b> — anomalies de saisie à réconcilier (sortie &gt; entrée enregistrée).
            </span>
            <span className="ml-auto text-[11px] font-bold text-red-600">{negOnly ? "Tout afficher" : "Filtrer"}</span>
          </button>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-adaline-ink)]/35" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Produit ou matière active…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-stone-moss)] bg-white/70 text-sm outline-none focus:border-[var(--color-valley-green)]" />
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-stone-moss)] bg-white/60">
            <Seg active={group === "cat"} onClick={() => setGroup("cat")}>Par catégorie</Seg>
            <Seg active={group === "ma"} onClick={() => setGroup("ma")}>Par matière active</Seg>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-stone-moss)] bg-white/60">
            <Seg active={!showAll} onClick={() => setShowAll(false)}>En stock ({withStock.length})</Seg>
            <Seg active={showAll} onClick={() => setShowAll(true)}>Tout le catalogue ({stock.length})</Seg>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={cat === "ALL"} onClick={() => setCat("ALL")}>Tous ({base.length})</Chip>
          {ORDER.filter((c) => catCounts[c]).map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CAT_META[c]?.label ?? c} ({catCounts[c]})</Chip>
          ))}
        </div>

        {/* Grouped table */}
        <div className="rounded-2xl border border-[var(--color-stone-moss)] overflow-hidden bg-white/60">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-black/[0.025] text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/50">
                <th className="px-4 py-2.5 font-bold">Produit</th>
                <th className="px-4 py-2.5 font-bold">Matière active</th>
                <th className="px-4 py-2.5 font-bold text-right">Reste</th>
                <th className="px-4 py-2.5 font-bold">Unité</th>
                {canEdit && <th className="px-4 py-2.5 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-stone-moss)]/50">
              {groups.map((g) => (
                <RowGroup key={g.key} g={g} groupBy={group} canEdit={canEdit} onEntree={onEntree} onSortie={onSortie} />
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={canEdit ? 5 : 4} className="px-4 py-10 text-center text-[var(--color-adaline-ink)]/40">Aucun produit en stock pour ce filtre.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent ledger */}
      <div className="col-span-12 xl:col-span-4">
        <div className="rounded-2xl border border-[var(--color-stone-moss)] bg-white/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight className="w-4 h-4 text-[var(--color-valley-green)]" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-adaline-ink)]/70">Derniers mouvements</h3>
          </div>
          <ul className="space-y-1.5 max-h-[560px] overflow-y-auto">
            {movements.map((m) => {
              const fm = FLOW_META[m.flow] ?? FLOW_META.entree;
              const out = m.flow === "sortie" || m.flow === "transfert";
              return (
                <li key={m.id} className="flex items-center gap-2.5">
                  <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", fm.cls)}><fm.Icon className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--color-adaline-ink)] truncate">{m.lf_products?.name ?? "—"}</span>
                      <span className={cn("text-xs font-bold font-mono shrink-0", out ? "text-amber-600" : "text-emerald-600")}>{out ? "−" : "+"}{fmt(Number(m.quantity))} {m.unit}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[9px] text-[var(--color-adaline-ink)]/45">
                      <span className="truncate">{fm.label}{m.site_name ? ` · ${m.site_name}` : ""}</span>
                      <span className="shrink-0">{new Date(m.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RowGroup({ g, groupBy, canEdit, onEntree, onSortie }: { g: { key: string; label: string; items: LfStockLevel[] }; groupBy: "cat" | "ma"; canEdit: boolean; onEntree?: (name: string) => void; onSortie?: (name: string) => void }) {
  return (
    <>
      <tr className="bg-black/[0.02]">
        <td colSpan={canEdit ? 5 : 4} className="px-4 py-1.5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-adaline-ink)]/55">
            {groupBy === "cat" && <span className="w-2 h-2 rounded-full" style={{ background: CAT_META[g.key]?.dot ?? "#94a3b8" }} />}
            {g.label}
            <span className="text-[var(--color-adaline-ink)]/30 font-mono">{g.items.length}</span>
          </span>
        </td>
      </tr>
      {g.items.map((s) => {
        const meta = CAT_META[s.category] ?? CAT_META.AUTRE;
        const reste = Number(s.reste);
        return (
          <tr key={s.product_id} className={cn("hover:bg-[var(--color-forest-dew)]/20 transition-colors", s.is_negative && "bg-red-50/60")}>
            <td className="px-4 py-2 font-semibold text-[var(--color-adaline-ink)]">
              <span className="inline-flex items-center gap-2">
                {groupBy === "ma" && <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", meta.cls)}>{meta.label}</span>}
                {s.name}
              </span>
            </td>
            <td className="px-4 py-2 text-[var(--color-adaline-ink)]/60 max-w-[260px] truncate" title={s.active_ingredient || ""}>
              {s.active_ingredient || <span className="text-[var(--color-adaline-ink)]/25">—</span>}
            </td>
            <td className={cn("px-4 py-2 text-right font-mono font-bold tabular-nums", s.is_negative ? "text-red-600" : reste > 0 ? "text-[var(--color-adaline-ink)]" : "text-[var(--color-adaline-ink)]/40")}>
              {fmt(reste)}
            </td>
            <td className="px-4 py-2 font-mono text-[var(--color-adaline-ink)]/45 uppercase">{s.unit}</td>
            {canEdit && (
              <td className="px-4 py-2">
                <div className="flex items-center justify-end gap-1">
                  {onEntree && (
                    <button
                      type="button"
                      onClick={() => onEntree(s.name)}
                      title="Nouvelle entrée"
                      className="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                  {onSortie && (
                    <button
                      type="button"
                      onClick={() => onSortie(s.name)}
                      title="Sortie de stock"
                      className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "red" | "ok" }) {
  const v = tone === "red" ? "text-red-600" : tone === "ok" ? "text-[var(--color-valley-green)]" : "text-[var(--color-adaline-ink)]";
  return (
    <div className="rounded-xl border border-[var(--color-stone-moss)] bg-white/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/45"><span className={v}>{icon}</span>{label}</div>
      <p className={cn("text-xl font-bold mt-1 tabular-nums", v)}>{value}</p>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors", active ? "bg-[var(--color-valley-green)] text-white border-transparent" : "bg-white/60 text-[var(--color-adaline-ink)]/60 border-[var(--color-stone-moss)] hover:bg-white")}>{children}</button>;
}
function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors", active ? "bg-[var(--color-valley-green)] text-white" : "text-[var(--color-adaline-ink)]/55 hover:bg-white")}>{children}</button>;
}
