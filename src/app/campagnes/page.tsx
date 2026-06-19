"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ModalPortal from "@/components/ui/ModalPortal";
import { CalendarDays, Loader2, Plus, RefreshCw, Pencil, Trash2, X, ChevronRight, Clock, CheckCircle, PauseCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type CampagneRow = {
  id: string;
  exploitation_id: string;
  nom: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: "planifie" | "en_cours" | "termine" | "suspendu" | string;
  created_at?: string;
};

type FormState = {
  nom: string;
  date_debut: string;
  date_fin: string;
  statut: string;
};

const STATUTS = [
  { value: "planifie",  label: "Planifié" },
  { value: "en_cours",  label: "En cours" },
  { value: "termine",   label: "Terminé" },
  { value: "suspendu",  label: "Suspendu" },
] as const;

const STATUT_STYLE: Record<string, string> = {
  planifie:  "bg-amber-50  text-amber-700  border border-amber-200",
  en_cours:  "bg-blue-50   text-blue-700   border border-blue-200",
  termine:   "bg-green-50  text-green-700  border border-green-200",
  suspendu:  "bg-gray-100  text-gray-500   border border-gray-200",
};

const STATUT_ICON = {
  planifie: Clock,
  en_cours: TrendingUp,
  termine:  CheckCircle,
  suspendu: PauseCircle,
} as const;

const EMPTY_FORM: FormState = { nom: "", date_debut: "", date_fin: "", statut: "en_cours" };

function fmtDate(d: string | null) {
  if (!d) return "—";
  return d.slice(0, 10);
}

function durationDays(debut: string | null, fin: string | null): number | null {
  if (!debut || !fin) return null;
  return Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 86_400_000);
}

function progressPct(debut: string | null, fin: string | null): number {
  if (!debut || !fin) return 0;
  const start = new Date(debut).getTime(), end = new Date(fin).getTime(), now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function StatutBadge({ statut }: { statut: string }) {
  const label = STATUTS.find(s => s.value === statut)?.label ?? statut;
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUT_STYLE[statut] ?? STATUT_STYLE.suspendu)}>
      {label}
    </span>
  );
}

export default function CampagnesPage() {
  const [rows, setRows]         = useState<CampagneRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [modal, setModal]       = useState<"create" | "edit" | null>(null);
  const [editing, setEditing]   = useState<CampagneRow | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<CampagneRow | null>(null);
  const firstInput              = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/v1/campagnes?limit=200", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? res.statusText); setRows([]); return; }
      setRows(json.data ?? []);
      setTotal(json.total ?? json.data?.length ?? 0);
    } catch { setError("Erreur réseau"); setRows([]); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM); setFormErr(null); setModal("create");
    setTimeout(() => firstInput.current?.focus(), 50);
  };

  const openEdit = (r: CampagneRow) => {
    setEditing(r);
    setForm({ nom: r.nom, date_debut: r.date_debut ?? "", date_fin: r.date_fin ?? "", statut: r.statut ?? "en_cours" });
    setFormErr(null); setModal("edit");
    setTimeout(() => firstInput.current?.focus(), 50);
  };

  const closeModal = () => { setModal(null); setEditing(null); setFormErr(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) { setFormErr("Le nom est requis"); return; }
    if (form.date_debut && form.date_fin && form.date_debut > form.date_fin) {
      setFormErr("La date de fin doit être après la date de début"); return;
    }
    setSaving(true); setFormErr(null);
    try {
      const payload = {
        nom: form.nom.trim(),
        date_debut: form.date_debut || null,
        date_fin: form.date_fin || null,
        statut: form.statut,
      };
      const url    = modal === "edit" ? `/api/v1/campagnes/${editing!.id}` : "/api/v1/campagnes";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const json   = await res.json();
      if (!res.ok) { setFormErr(json.error ?? res.statusText); return; }
      closeModal(); await load();
    } catch { setFormErr("Erreur réseau"); }
    finally  { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res  = await fetch(`/api/v1/campagnes/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Suppression impossible"); return; }
      setRows(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev - 1);
      if (selected?.id === id) setSelected(null);
    } catch { setError("Erreur réseau lors de la suppression"); }
    finally { setDeleting(null); }
  };

  const kpis = {
    total,
    en_cours: rows.filter(r => r.statut === "en_cours").length,
    planifie: rows.filter(r => r.statut === "planifie").length,
    termine:  rows.filter(r => r.statut === "termine").length,
  };

  return (
    <AppLayout>
      <div className={cn("mx-auto pb-8", selected ? "max-w-6xl" : "max-w-5xl")}>
        <div className={cn("flex flex-col gap-5", selected && "lg:grid lg:grid-cols-7 lg:items-start lg:gap-5")}>
        <div className={cn("flex flex-col gap-5 min-w-0", selected && "lg:col-span-4")}>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-015)", border: "1px solid var(--primary-025)" }}>
              <CalendarDays className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Campagnes agricoles</h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {total} campagne{total !== 1 ? "s" : ""} — saisons culturales liées aux plantations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Actualiser
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: "var(--primary)" }}>
              <Plus className="w-3.5 h-3.5" />
              Nouvelle campagne
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: kpis.total, cls: "" },
            { label: "En cours", value: kpis.en_cours, cls: "text-blue-600" },
            { label: "Planifiées", value: kpis.planifie, cls: "text-amber-600" },
            { label: "Terminées", value: kpis.termine, cls: "text-green-600" },
          ].map(k => (
            <div key={k.label} className="glass-card p-3 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>{k.label}</span>
              <span className={cn("text-2xl font-black leading-none", k.cls) } style={k.cls ? {} : { color: "var(--text-primary)" }}>{k.value}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-3 text-sm text-red-700 bg-red-50 border border-red-200 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Table */}
        {loading && !rows.length ? (
          <div className="glass-card p-12 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Chargement…</span>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                  <th className="py-3 px-4 font-semibold">Nom</th>
                  <th className="py-3 px-4 font-semibold">Période</th>
                  <th className="py-3 px-4 font-semibold">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const isSelected = selected?.id === r.id;
                  return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(isSelected ? null : r)}
                    className={cn("transition-colors cursor-pointer", isSelected ? "bg-[var(--primary-015)]" : "hover:bg-[var(--surface-recessed)]")}
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isSelected && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary)" }} />}
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.nom}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                      {fmtDate(r.date_debut)} → {fmtDate(r.date_fin)}
                    </td>
                    <td className="py-3 px-4"><StatutBadge statut={r.statut} /></td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(r)} title="Modifier" className="p-1.5 rounded-lg hover:bg-[var(--surface-recessed)] transition-colors" style={{ color: "var(--text-secondary)" }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          title="Supprimer"
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400 hover:text-red-600 disabled:opacity-40"
                        >
                          {deleting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && !loading && (
              <div className="p-12 flex flex-col items-center gap-3">
                <CalendarDays className="w-10 h-10 opacity-20" style={{ color: "var(--primary)" }} />
                <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                  Aucune campagne enregistrée
                </p>
                <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white" style={{ background: "var(--primary)" }}>
                  <Plus className="w-3.5 h-3.5" />
                  Créer la première campagne
                </button>
              </div>
            )}
          </div>
        )}

        </div>{/* end left col */}

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-3">
            <div className="glass-card p-5 flex flex-col gap-4 sticky top-4" style={{ background: "var(--surface-pure)" }}>

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>Campagne</span>
                  <h2 className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{selected.nom}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[var(--surface-recessed)] flex-shrink-0 transition-colors" style={{ color: "var(--text-secondary)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = STATUT_ICON[selected.statut as keyof typeof STATUT_ICON] ?? Clock;
                  return <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />;
                })()}
                <StatutBadge statut={selected.statut} />
              </div>

              {/* Period + progress */}
              <div className="flex flex-col gap-3 p-3 rounded-xl" style={{ background: "var(--surface-recessed)" }}>
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>Période</p>
                    <p className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                      {fmtDate(selected.date_debut)} → {fmtDate(selected.date_fin)}
                    </p>
                  </div>
                </div>

                {durationDays(selected.date_debut, selected.date_fin) !== null && (() => {
                  const days = durationDays(selected.date_debut, selected.date_fin)!;
                  const pct  = progressPct(selected.date_debut, selected.date_fin);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: "var(--text-secondary)" }}>{days} jours au total</span>
                        {selected.statut === "en_cours" && (
                          <span className="font-semibold text-blue-600">{pct}% écoulé</span>
                        )}
                      </div>
                      {selected.statut === "en_cours" && (
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--primary)" }} />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Created */}
              {selected.created_at && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Créée le {new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--glass-border)" }}>
                <button
                  onClick={() => { setSelected(null); openEdit(selected); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl border transition-colors hover:bg-[var(--surface-recessed)]"
                  style={{ borderColor: "var(--glass-border)", color: "var(--text-primary)" }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleting === selected.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting === selected.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        </div>{/* end grid */}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={e => e.target === e.currentTarget && closeModal()}>
            <form onSubmit={handleSubmit} className="glass-card w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl" style={{ background: "var(--surface-pure)" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  {modal === "create" ? "Nouvelle campagne" : "Modifier la campagne"}
                </h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-[var(--surface-recessed)]" style={{ color: "var(--text-secondary)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formErr}</p>}

              <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Nom <span className="text-red-500">*</span>
                <input ref={firstInput} type="text" maxLength={255} required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="ex. Campagne 2026-2027"
                  className="mt-0.5 px-3 py-2 rounded-xl border text-sm font-normal"
                  style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Date début
                  <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    className="px-3 py-2 rounded-xl border text-sm font-normal"
                    style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Date fin
                  <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                    className="px-3 py-2 rounded-xl border text-sm font-normal"
                    style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Statut
                <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                  className="px-3 py-2 rounded-xl border text-sm font-normal"
                  style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modal === "create" ? "Créer" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </AppLayout>
  );
}
