"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, MessageSquare, X, SprayCan, Droplets,
  ArrowUpRight, ArrowDownLeft, ShoppingCart, Bug, Hammer, Info, FlaskConical,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { fetchWaMessages, type WaMessage } from "@/lib/lechehab/journal";

const CAT_META: Record<string, { label: string; cls: string; Icon: typeof Info }> = {
  traitement:   { label: "Traitement",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: SprayCan },
  fertigation:  { label: "Fertigation",  cls: "bg-blue-100 text-blue-700 border-blue-200",          Icon: Droplets },
  sortie:       { label: "Sortie",       cls: "bg-amber-100 text-amber-700 border-amber-200",        Icon: ArrowUpRight },
  entree:       { label: "Entrée",       cls: "bg-teal-100 text-teal-700 border-teal-200",           Icon: ArrowDownLeft },
  bon_commande: { label: "Bon commande", cls: "bg-violet-100 text-violet-700 border-violet-200",     Icon: ShoppingCart },
  statut:       { label: "Statut phyto", cls: "bg-red-100 text-red-700 border-red-200",              Icon: Bug },
  travaux:      { label: "Travaux",      cls: "bg-orange-100 text-orange-700 border-orange-200",     Icon: Hammer },
  info:         { label: "Info",         cls: "bg-slate-100 text-slate-600 border-slate-200",        Icon: Info },
  autre:        { label: "Autre",        cls: "bg-slate-100 text-slate-500 border-slate-200",        Icon: Info },
};
const ORDER = ["traitement", "fertigation", "sortie", "entree", "bon_commande", "statut", "travaux", "info", "autre"];

const fmtDate = (m: WaMessage) => {
  const d = m.op_date || m.sent_at;
  if (!d) return m.raw_date || "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

export default function JournalPage() {
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("ALL");
  const load = () => {
    setLoading(true);
    fetchWaMessages()
      .then(setMessages)
      .catch((e) => setError(e?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of messages) c[m.category] = (c[m.category] ?? 0) + 1;
    return c;
  }, [messages]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages
      .filter((m) => cat === "ALL" || m.category === cat)
      .filter((m) =>
        !q ||
        (m.summary ?? "").toLowerCase().includes(q) ||
        (m.body ?? "").toLowerCase().includes(q) ||
        (m.zone ?? "").toLowerCase().includes(q) ||
        (m.author ?? "").toLowerCase().includes(q) ||
        m.products.some((p) => p.name.toLowerCase().includes(q))
      );
  }, [messages, query, cat]);

  return (
    <AppLayout>
      <div className="lf-page-header mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-valley-green)]">Journal terrain · Agent IA</p>
          <h1 className="text-2xl font-bold text-[var(--color-adaline-ink)] tracking-tight mt-1">Journal WhatsApp</h1>
          <p className="text-sm text-[var(--color-adaline-ink)]/55 mt-1">
            Messages consultant ↔ ingénieurs structurés automatiquement : traitements, fertigation, mouvements de stock, statut phytosanitaire.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi icon={<MessageSquare className="w-4 h-4" />} label="Messages" value={messages.length} />
        <Kpi icon={<SprayCan className="w-4 h-4" />} label="Traitements" value={counts.traitement ?? 0} />
        <Kpi icon={<ArrowUpRight className="w-4 h-4" />} label="Sorties / entrées" value={(counts.sortie ?? 0) + (counts.entree ?? 0)} />
        <Kpi icon={<Bug className="w-4 h-4" />} label="Statuts phyto" value={counts.statut ?? 0} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-adaline-ink)]/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher produit, zone, auteur…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-stone-moss)] bg-white/70 text-sm outline-none focus:border-[var(--color-valley-green)] focus:ring-2 focus:ring-[var(--color-valley-green)]/10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={cat === "ALL"} onClick={() => setCat("ALL")}>Tous ({messages.length})</Chip>
          {ORDER.filter((c) => counts[c]).map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CAT_META[c]?.label ?? c} ({counts[c]})</Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--color-adaline-ink)]/40 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement du journal…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : visible.length === 0 ? (
        <EmptyState hasData={messages.length > 0} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((m) => <MessageCard key={m.id} m={m} />)}
        </div>
      )}

    </AppLayout>
  );
}

function MessageCard({ m }: { m: WaMessage }) {
  const meta = CAT_META[m.category] ?? CAT_META.autre;
  const Icon = meta.Icon;
  return (
    <div className="rounded-2xl border border-[var(--color-stone-moss)] bg-white/70 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border", meta.cls)}>
          <Icon className="w-3 h-3" /> {meta.label}
        </span>
        <span className="text-[11px] font-mono text-[var(--color-adaline-ink)]/45">{fmtDate(m)}</span>
      </div>

      <p className="text-sm font-semibold text-[var(--color-adaline-ink)] leading-snug">{m.summary || m.body.slice(0, 160)}</p>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {m.zone && <Tag>{m.zone}</Tag>}
        {m.culture && <Tag>{m.culture}</Tag>}
        {m.variete && <Tag>{m.variete}</Tag>}
        {m.methode && <Tag>Méthode {m.methode}</Tag>}
        {m.volume_bouillie != null && <Tag>{m.volume_bouillie} L/ha</Tag>}
        {m.ph != null && <Tag>pH {m.ph}</Tag>}
        {m.effectif != null && <Tag>{m.effectif} ouvriers</Tag>}
      </div>

      {m.products.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.products.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] rounded-lg border border-[var(--color-stone-moss)] bg-[var(--color-forest-dew)]/30 px-2 py-1">
              <FlaskConical className="w-3 h-3 text-[var(--color-valley-green)]" />
              <span className="font-medium text-[var(--color-adaline-ink)]/80">{p.name}</span>
              {(p.quantity != null || p.unit || p.dose_per_1000l) && (
                <span className="font-mono text-[var(--color-adaline-ink)]/55">
                  {p.dose_per_1000l ? p.dose_per_1000l : `${p.quantity ?? ""} ${p.unit ?? ""}`.trim()}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {m.statut && <p className="mt-2 text-xs text-red-600">⚠ {m.statut}</p>}

      <div className="mt-2 text-[10px] text-[var(--color-adaline-ink)]/40">{m.author}</div>
    </div>
  );
}

function EmptyState({ hasData }: { hasData: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-stone-moss)] bg-white/50 p-12 text-center">
      <MessageSquare className="w-10 h-10 mx-auto text-[var(--color-adaline-ink)]/25 mb-3" />
      <p className="text-sm text-[var(--color-adaline-ink)]/50">
        {hasData ? "Aucun message pour ce filtre." : "Aucun message terrain enregistré."}
      </p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] rounded-md bg-black/[0.04] border border-[var(--color-stone-moss)] px-1.5 py-0.5 text-[var(--color-adaline-ink)]/60">{children}</span>;
}
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-stone-moss)] bg-white/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-adaline-ink)]/45">
        <span className="text-[var(--color-valley-green)]">{icon}</span>{label}
      </div>
      <p className="text-xl font-bold text-[var(--color-adaline-ink)] mt-1 tabular-nums">{value}</p>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
        active ? "bg-[var(--color-valley-green)] text-white border-transparent" : "bg-white/60 text-[var(--color-adaline-ink)]/60 border-[var(--color-stone-moss)] hover:bg-white")}>
      {children}
    </button>
  );
}
