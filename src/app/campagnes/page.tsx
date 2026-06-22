"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ModalPortal from "@/components/ui/ModalPortal";
import { useTreatments, useParcelles } from "@/hooks/useData";
import {
  CalendarDays, Loader2, Plus, RefreshCw, Pencil, Trash2, X,
  Clock, CheckCircle, PauseCircle, TrendingUp, Copy, AlertTriangle,
  ArrowLeft, FlaskConical, Target, Droplets, Wrench, MapPin,
  Layers, Users, CheckCircle2, ChevronDown, Wheat, MessageCircle, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type CampagneRow = {
  id: string;
  exploitation_id: string;
  nom: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: "PLANNING" | "ACTIVE" | "RÉCOLTE" | "CLÔTURÉE" | "ARCHIVÉE" | string;
  description?: string | null;
  couleur?: string | null;
  culture?: string | null;
  marche_destination?: "ALGERIE" | "EXPORT_UE" | "EXPORT_GOLF" | "MIXTE" | null;
  ggn?: string | null;
  rendement_cible_kg_ha?: number | null;
  qualite_cible_cat1_pct?: number | null;
  ift_cible?: number | null;
  created_at?: string;
};

type FormState = {
  nom: string; date_debut: string; date_fin: string;
  statut: string; description: string; couleur: string;
  culture: string; marche_destination: string; ggn: string;
  rendement_cible_kg_ha: string; qualite_cible_cat1_pct: string; ift_cible: string;
};

/* ── Constants ──────────────────────────────────────────────────────────────── */

const STATUTS = [
  { value: "PLANNING", label: "Planification" },
  { value: "ACTIVE",   label: "Active"        },
  { value: "RÉCOLTE",  label: "En récolte"    },
  { value: "CLÔTURÉE", label: "Clôturée"      },
  { value: "ARCHIVÉE", label: "Archivée"      },
] as const;

const STATUT_STYLE: Record<string, string> = {
  PLANNING:  "bg-blue-50   text-blue-700  border border-blue-200",
  ACTIVE:    "bg-teal-50   text-teal-700  border border-teal-200",
  RÉCOLTE:   "bg-amber-50  text-amber-700 border border-amber-200",
  CLÔTURÉE:  "bg-gray-100  text-gray-500  border border-gray-200",
  ARCHIVÉE:  "bg-slate-100 text-slate-400 border border-slate-200",
  planifie:  "bg-blue-50   text-blue-700  border border-blue-200",
  en_cours:  "bg-teal-50   text-teal-700  border border-teal-200",
  termine:   "bg-gray-100  text-gray-500  border border-gray-200",
  suspendu:  "bg-amber-50  text-amber-700 border border-amber-200",
};

const STATUT_ICON: Record<string, React.ElementType> = {
  PLANNING: Clock, ACTIVE: TrendingUp, RÉCOLTE: Wheat, CLÔTURÉE: CheckCircle, ARCHIVÉE: PauseCircle,
  planifie: Clock, en_cours: TrendingUp, termine: CheckCircle, suspendu: PauseCircle,
};

const MARCHES = [
  { value: "ALGERIE",    label: "Marché local (Algérie)" },
  { value: "EXPORT_UE",  label: "Export UE"              },
  { value: "EXPORT_GOLF",label: "Export Golfe"           },
  { value: "MIXTE",      label: "Mixte"                  },
];

const TX_STATUS: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
  completed:   { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20", label: "Terminé"   },
  evaluated:   { dot: "bg-teal-500",    bg: "bg-teal-500/10",    text: "text-teal-700",    border: "border-teal-500/20",    label: "Évalué"    },
  in_progress: { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700",   border: "border-amber-500/20",   label: "En cours"  },
  approved:    { dot: "bg-indigo-500",  bg: "bg-indigo-500/10",  text: "text-indigo-700",  border: "border-indigo-500/20",  label: "Approuvé"  },
  planned:     { dot: "bg-sky-500",     bg: "bg-sky-500/10",     text: "text-sky-700",     border: "border-sky-500/20",     label: "Planifié"  },
  draft:       { dot: "bg-slate-400",   bg: "bg-slate-500/10",   text: "text-slate-600",   border: "border-slate-500/20",   label: "Brouillon" },
  default:     { dot: "bg-slate-400",   bg: "bg-slate-500/10",   text: "text-slate-600",   border: "border-slate-500/20",   label: "—"         },
};

const PALETTE = ["#00D4AA","#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444","#06B6D4","#6B7280"];
const EMPTY_FORM: FormState = {
  nom: "", date_debut: "", date_fin: "", statut: "PLANNING", description: "", couleur: "#00D4AA",
  culture: "pommier", marche_destination: "", ggn: "",
  rendement_cible_kg_ha: "", qualite_cible_cat1_pct: "", ift_cible: "",
};

const BBCH_STAGES = [
  { code: "09", label: "Débourrement" },
  { code: "60", label: "Floraison"    },
  { code: "71", label: "Nouaison"     },
  { code: "81", label: "Véraison"     },
  { code: "87", label: "Récolte"      },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const fmtDate = (d: string | null) => !d ? "—" : new Date(d).toLocaleDateString("fr-FR");

function progressPct(debut: string | null, fin: string | null) {
  if (!debut || !fin) return 0;
  const s = new Date(debut).getTime(), e = new Date(fin).getTime(), n = Date.now();
  if (n <= s) return 0; if (n >= e) return 100;
  return Math.round(((n - s) / (e - s)) * 100);
}

function daysRemaining(fin: string | null) {
  if (!fin) return null;
  return Math.ceil((new Date(fin).getTime() - Date.now()) / 86_400_000);
}

function shiftYear(d: string) {
  try { const dt = new Date(d); dt.setFullYear(dt.getFullYear() + 1); return dt.toISOString().slice(0, 10); } catch { return d; }
}

function lea(message: string) {
  window.dispatchEvent(new CustomEvent("assistant:inject", { detail: { message } }));
}

function StatutBadge({ statut }: { statut: string }) {
  const label = STATUTS.find(s => s.value === statut)?.label ?? statut;
  return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUT_STYLE[statut] ?? STATUT_STYLE.PLANNING)}>{label}</span>;
}

/* ── Main page ──────────────────────────────────────────────────────────────── */

export default function CampagnesPage() {
  const [rows, setRows]                   = useState<CampagneRow[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [modal, setModal]                 = useState<"create" | "edit" | null>(null);
  const [editing, setEditing]             = useState<CampagneRow | null>(null);
  const [form, setForm]                   = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [formErr, setFormErr]             = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CampagneRow | null>(null);
  const [selected, setSelected]           = useState<CampagneRow | null>(null);
  const [expandedTx, setExpandedTx]       = useState<Set<string>>(new Set());
  const firstInput                        = useRef<HTMLInputElement>(null);

  const toggleTx = (id: string) =>
    setExpandedTx(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const { data: allTreatmentsRaw } = useTreatments();
  const { data: parcellesRaw }     = useParcelles();
  const allTreatments = (allTreatmentsRaw || []) as any[];
  const parcelles     = (parcellesRaw     || []) as any[];

  const campaignTreatments = useMemo(() => {
    if (!selected?.date_debut || !selected?.date_fin) return [];
    const debut = new Date(selected.date_debut).getTime();
    const fin   = new Date(selected.date_fin).getTime() + 86_399_999;
    return allTreatments
      .filter(t => {
        const d = t.plannedDate || t.executedDate || t.planned_date || t.dateReelle || t.date_reelle;
        if (!d) return false;
        return new Date(d).getTime() >= debut && new Date(d).getTime() <= fin;
      })
      .sort((a, b) => new Date(b.plannedDate || b.planned_date || b.dateReelle || "").getTime() - new Date(a.plannedDate || a.planned_date || a.dateReelle || "").getTime());
  }, [selected, allTreatments]);

  const campaignStats = useMemo(() => ({
    total:      campaignTreatments.length,
    done:       campaignTreatments.filter(t => ["completed","evaluated"].includes(t.status)).length,
    parcelles:  new Set(campaignTreatments.map(t => t.parcelleName || t.site_name).filter(Boolean)).size,
    operateurs: new Set(campaignTreatments.map(t => t.operatorName).filter(Boolean)).size,
  }), [campaignTreatments]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/v1/campagnes?limit=200", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? res.statusText); setRows([]); return; }
      setRows(json.data ?? []); setTotal(json.total ?? json.data?.length ?? 0);
    } catch { setError("Erreur réseau"); setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setFormErr(null); setModal("create"); setTimeout(() => firstInput.current?.focus(), 50); };
  const openEdit   = (r: CampagneRow) => {
    setEditing(r);
    setForm({
      nom: r.nom, date_debut: r.date_debut ?? "", date_fin: r.date_fin ?? "",
      statut: r.statut ?? "PLANNING", description: r.description ?? "", couleur: r.couleur ?? "#00D4AA",
      culture: r.culture ?? "pommier", marche_destination: r.marche_destination ?? "", ggn: r.ggn ?? "",
      rendement_cible_kg_ha:  r.rendement_cible_kg_ha  != null ? String(r.rendement_cible_kg_ha)  : "",
      qualite_cible_cat1_pct: r.qualite_cible_cat1_pct != null ? String(r.qualite_cible_cat1_pct) : "",
      ift_cible:              r.ift_cible               != null ? String(r.ift_cible)              : "",
    });
    setFormErr(null); setModal("edit"); setTimeout(() => firstInput.current?.focus(), 50);
  };
  const duplicate = (r: CampagneRow) => {
    const newDebut = r.date_debut ? shiftYear(r.date_debut) : "";
    const year = newDebut ? newDebut.slice(0, 4) : "";
    const prev = r.date_debut ? r.date_debut.slice(0, 4) : "";
    setForm({
      nom: r.nom.replace(prev, year) || `${r.nom} (copie)`,
      date_debut: newDebut, date_fin: r.date_fin ? shiftYear(r.date_fin) : "",
      statut: "PLANNING", description: r.description ?? "", couleur: r.couleur ?? "#00D4AA",
      culture: r.culture ?? "pommier", marche_destination: r.marche_destination ?? "", ggn: "",
      rendement_cible_kg_ha:  r.rendement_cible_kg_ha  != null ? String(r.rendement_cible_kg_ha)  : "",
      qualite_cible_cat1_pct: r.qualite_cible_cat1_pct != null ? String(r.qualite_cible_cat1_pct) : "",
      ift_cible:              r.ift_cible               != null ? String(r.ift_cible)              : "",
    });
    setFormErr(null); setModal("create"); setTimeout(() => firstInput.current?.focus(), 50);
  };
  const closeModal = () => { setModal(null); setEditing(null); setFormErr(null); };

  useEffect(() => {
    if (!modal && !confirmDelete) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { closeModal(); setConfirmDelete(null); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [modal, confirmDelete]); // eslint-disable-line

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim())             { setFormErr("Le nom est requis"); return; }
    if (!form.date_debut)             { setFormErr("La date de début est requise"); return; }
    if (!form.date_fin)               { setFormErr("La date de fin est requise"); return; }
    if (form.date_debut >= form.date_fin) { setFormErr("La date de fin doit être après la date de début"); return; }
    setSaving(true); setFormErr(null);
    try {
      const payload = {
        nom: form.nom.trim(), date_debut: form.date_debut, date_fin: form.date_fin,
        statut: form.statut, description: form.description.trim() || null, couleur: form.couleur,
        culture: form.culture.trim() || null,
        marche_destination: form.marche_destination || null,
        ggn: form.ggn.trim() || null,
        rendement_cible_kg_ha:  form.rendement_cible_kg_ha  ? Number(form.rendement_cible_kg_ha)  : null,
        qualite_cible_cat1_pct: form.qualite_cible_cat1_pct ? Number(form.qualite_cible_cat1_pct) : null,
        ift_cible:              form.ift_cible               ? Number(form.ift_cible)              : null,
      };
      const url    = modal === "edit" ? `/api/v1/campagnes/${editing!.id}` : "/api/v1/campagnes";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const json   = await res.json();
      if (!res.ok) {
        if (json.error === "CAMPAIGN_OVERLAP")      setFormErr("Cette période chevauche une campagne existante.");
        else if (json.error === "CAMPAIGN_CLOSED")  setFormErr("Une campagne clôturée ne peut plus être modifiée.");
        else if (json.error === "INVALID_TRANSITION") setFormErr(json.message ?? "Transition de statut invalide.");
        else setFormErr(json.error ?? res.statusText);
        return;
      }
      closeModal(); await load();
    } catch { setFormErr("Erreur réseau"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/v1/campagnes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok && res.status !== 204) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Suppression impossible"); return; }
      setRows(prev => prev.filter(r => r.id !== id)); setTotal(prev => prev - 1);
      if (selected?.id === id) setSelected(null);
      setConfirmDelete(null);
    } catch { setError("Erreur réseau"); }
    finally { setDeleting(null); }
  };

  const activeRow = rows.find(r => r.statut === "ACTIVE" || r.statut === "en_cours");
  const daysLeft  = activeRow ? daysRemaining(activeRow.date_fin) : null;

  /* ── Render ── */
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-8 space-y-5">

        {error && (
          <div className="glass-card p-3 text-sm text-red-700 bg-red-50 border border-red-200 flex items-center justify-between gap-2">
            <span>{error}</span><button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ══════════════ CAMPAIGN DETAIL VIEW ══════════════ */}
        {selected ? (
          <div className="space-y-5">

            {/* Back + actions header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-[var(--surface-recessed)]" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
                <ArrowLeft className="w-3.5 h-3.5" />Toutes les campagnes
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => lea(`[Campagne "${selected.nom}"] Statut : ${STATUTS.find(s => s.value === selected.statut)?.label ?? selected.statut}. Culture : ${selected.culture ?? "pommier"}. Marché : ${MARCHES.find(m => m.value === selected.marche_destination)?.label ?? "non défini"}. Objectifs : rendement ${selected.rendement_cible_kg_ha ?? "—"} kg/ha, qualité CAT I ${selected.qualite_cible_cat1_pct ?? "—"}%, IFT cible ${selected.ift_cible ?? "—"}. Explique-moi cette campagne et ses enjeux agronomiques en 3 points avec emoji.`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-[var(--surface-recessed)]"
                  style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
                  title="Analyser cette campagne avec Léa"
                >
                  <MessageCircle className="w-3.5 h-3.5" />Analyser
                </button>
                <button onClick={() => openEdit(selected)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-[var(--surface-recessed)]" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
                  <Pencil className="w-3.5 h-3.5" />Modifier
                </button>
                <button onClick={() => duplicate(selected)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-[var(--surface-recessed)]" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
                  <Copy className="w-3.5 h-3.5" />Dupliquer
                </button>
                <button onClick={() => setConfirmDelete(selected)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Archiver
                </button>
              </div>
            </div>

            {/* Campaign header card */}
            <div className="glass-card p-6" style={{ borderLeft: `4px solid ${selected.couleur || "#00D4AA"}` }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow-md shrink-0" style={{ background: selected.couleur || "#00D4AA" }} />
                  <div>
                    <h1 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>{selected.nom}</h1>
                    <div className="flex items-center flex-wrap gap-2 mt-0.5">
                      <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {fmtDate(selected.date_debut)} → {fmtDate(selected.date_fin)}
                      </p>
                      {selected.culture && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 capitalize">{selected.culture}</span>
                      )}
                      {selected.marche_destination && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {MARCHES.find(m => m.value === selected.marche_destination)?.label ?? selected.marche_destination}
                        </span>
                      )}
                      {selected.ggn && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                          GGN: {selected.ggn}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(() => { const Icon = STATUT_ICON[selected.statut] ?? Clock; return <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />; })()}
                  <StatutBadge statut={selected.statut} />
                </div>
              </div>

              {/* Progress bar */}
              {selected.date_debut && selected.date_fin && (() => {
                const totalDays = Math.round((new Date(selected.date_fin).getTime() - new Date(selected.date_debut).getTime()) / 86_400_000);
                const pct  = progressPct(selected.date_debut, selected.date_fin);
                const left = daysRemaining(selected.date_fin);
                const isDone = ["CLÔTURÉE","ARCHIVÉE","termine"].includes(selected.statut);
                const isSusp = selected.statut === "ARCHIVÉE";
                return (
                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-secondary)" }}>{totalDays} jours au total</span>
                      <span className={cn("font-semibold", isDone ? "text-gray-500" : left != null && left <= 30 ? "text-amber-600" : "text-teal-600")}>
                        {isDone ? "Terminée" : left != null && left > 0 ? `${left} jours restants` : left === 0 ? "Dernier jour" : "Échéance dépassée"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                      <div className={cn("h-full rounded-full transition-all", isDone ? "bg-gray-400" : isSusp ? "bg-amber-400 opacity-60" : "")}
                        style={{ width: `${pct}%`, background: isDone || isSusp ? undefined : "var(--primary)" }} />
                    </div>
                  </div>
                );
              })()}

              {selected.description && (
                <p className="mt-4 text-xs italic px-3 py-2 rounded-lg" style={{ background: "var(--surface-recessed)", color: "var(--text-secondary)" }}>
                  {selected.description}
                </p>
              )}
            </div>

            {/* Stats KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Layers,      label: "Interventions", value: campaignStats.total,      cls: "text-teal-600"   },
                { icon: CheckCircle2,label: "Terminées",     value: campaignStats.done,        cls: "text-emerald-600"},
                { icon: MapPin,      label: "Parcelles",     value: campaignStats.parcelles,   cls: "text-blue-600"   },
                { icon: Users,       label: "Opérateurs",    value: campaignStats.operateurs,  cls: "text-violet-600" },
              ].map(({ icon: Icon, label, value, cls }) => (
                <div key={label} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--primary-015)" }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "var(--text-secondary)" }}>{label}</p>
                    <p className={cn("text-xl font-black leading-tight", cls)}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Objectifs agronomiques */}
            {(selected.rendement_cible_kg_ha != null || selected.qualite_cible_cat1_pct != null || selected.ift_cible != null) && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Objectifs agronomiques</span>
                  </div>
                  <button
                    onClick={() => lea(`[Objectifs agronomiques campagne "${selected.nom}"] Rendement cible : ${selected.rendement_cible_kg_ha ?? "—"} kg/ha. Qualité CAT I : ${selected.qualite_cible_cat1_pct ?? "—"}%. IFT cible : ${selected.ift_cible ?? "—"}. Explique-moi ces objectifs, leur pertinence pour une exploitation pommière, et comment les atteindre en 3 points avec emoji.`)}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-recessed)] transition-colors cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                    title="Expliquer les objectifs avec Léa"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-6 py-5 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Rendement cible</p>
                    <p className="text-2xl font-black" style={{ color: "var(--primary)" }}>
                      {selected.rendement_cible_kg_ha != null ? selected.rendement_cible_kg_ha.toLocaleString("fr-FR") : "—"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>kg/ha</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Qualité CAT I</p>
                    <p className="text-2xl font-black text-emerald-600">
                      {selected.qualite_cible_cat1_pct != null ? `${selected.qualite_cible_cat1_pct}%` : "—"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>objectif</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>IFT cible</p>
                    <p className="text-2xl font-black text-amber-600">
                      {selected.ift_cible != null ? selected.ift_cible : "—"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>indice/ha</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phénologie BBCH */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Phénologie BBCH</span>
                </div>
                <button
                  onClick={() => lea("[Phénologie pommier BBCH] Explique-moi les stades phénologiques BBCH pour le pommier : débourrement (09), floraison (60), nouaison (71), véraison (81) et récolte (87). Quel est l'intérêt agronomique de ce suivi et comment ça aide à planifier les traitements ?")}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-recessed)] transition-colors cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                  title="Expliquer la phénologie avec Léa"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-start gap-0">
                  {BBCH_STAGES.map((stage, i) => (
                    <div key={stage.code} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-center">
                        {i > 0 && <div className="h-0.5 flex-1" style={{ background: "var(--glass-border)" }} />}
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 shrink-0"
                          style={{ background: "var(--primary-015)", borderColor: "var(--primary)", color: "var(--primary)" }}>
                          {stage.code}
                        </div>
                        {i < BBCH_STAGES.length - 1 && <div className="h-0.5 flex-1" style={{ background: "var(--glass-border)" }} />}
                      </div>
                      <p className="text-[9px] font-semibold mt-1.5 text-center" style={{ color: "var(--text-secondary)" }}>{stage.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: "var(--text-secondary)" }}>Prévu: —</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Treatment timeline */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Interventions phytosanitaires</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-015)", color: "var(--primary)" }}>
                  {campaignTreatments.length} enregistrement{campaignTreatments.length !== 1 ? "s" : ""}
                </span>
              </div>

              {campaignTreatments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <FlaskConical className="w-10 h-10 opacity-15" style={{ color: "var(--text-secondary)" }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Aucune intervention pour cette campagne</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      Les traitements entre {fmtDate(selected.date_debut)} et {fmtDate(selected.date_fin)} apparaîtront ici.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
                  {campaignTreatments.map((t: any, idx: number) => {
                    const st       = TX_STATUS[t.status] ?? TX_STATUS.default;
                    const produits = t.produitsDetail?.length ? t.produitsDetail : (t.products || []);
                    const dateStr  = t.plannedDate || t.executedDate || t.planned_date || "";
                    const dateLabel = dateStr ? new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
                    const pColor   = parcelles.find((p: any) => p.name === (t.parcelleName || t.site_name))?.color || "#10b981";
                    const txKey    = t.id ?? String(idx);
                    const isOpen   = expandedTx.has(txKey);

                    return (
                      <div key={txKey} style={{ borderBottom: idx < campaignTreatments.length - 1 ? "1px solid var(--glass-border)" : undefined }}>
                        <button type="button" onClick={() => toggleTx(txKey)} className="w-full flex gap-4 px-6 py-4 hover:bg-[var(--surface-recessed)]/40 transition-colors text-left">
                          <div className="flex flex-col items-center shrink-0 w-8 pt-1">
                            <span className="font-mono text-[9px] font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-sm", st.dot)} />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pColor }} />
                              <span className="text-sm font-extrabold truncate" style={{ color: "var(--text-primary)" }}>{t.parcelleName || t.site_name || "—"}</span>
                              {t.type && <span className="text-[11px] font-medium hidden sm:block" style={{ color: "var(--text-secondary)" }}>· {t.type}</span>}
                              <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                                <CalendarDays className="w-3 h-3 inline mr-0.5" />{dateLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn("inline-flex items-center text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border", st.text, st.bg, st.border)}>{st.label}</span>
                              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen ? "rotate-180" : "")} style={{ color: "var(--text-secondary)" }} />
                            </div>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-6 pb-4 pl-[4.5rem] space-y-2.5">
                            {(t.type || t.cible) && (
                              <div className="flex flex-wrap items-center gap-3">
                                {t.type && <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{t.type}</span>}
                                {t.cible && <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}><Target className="w-3 h-3 text-red-400" />{t.cible}</span>}
                              </div>
                            )}
                            {produits.filter((p: any) => p.nom_commercial || p.productName || p.name).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {produits.filter((p: any) => p.nom_commercial || p.productName || p.name).slice(0, 5).map((p: any, pi: number) => (
                                  <span key={pi} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ background: "var(--primary-015)", color: "var(--primary)", borderColor: "var(--primary-025)" }}>
                                    <FlaskConical className="w-2.5 h-2.5 shrink-0" />
                                    {p.nom_commercial || p.productName || p.name}
                                    {p.dose_hl && <span className="opacity-60">{p.dose_hl} L/hl</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {t.areaTreatedHectares > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">{t.areaTreatedHectares} ha</span>
                              )}
                              {t.volumeBouillie > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                  <Droplets className="w-3 h-3" />{t.volumeBouillie} L
                                </span>
                              )}
                              {t.operatorName && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <div className="w-4 h-4 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center shrink-0">
                                    <span className="text-[7px] font-black text-stone-600 uppercase">{t.operatorName[0]}</span>
                                  </div>
                                  {t.operatorName}
                                </span>
                              )}
                              {t.materiel && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <Wrench className="w-3 h-3" />{t.materiel}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        ) : (
        /* ══════════════ LIST VIEW ══════════════ */
        <>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-015)", border: "1px solid var(--primary-025)" }}>
                <CalendarDays className="w-5 h-5" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Campagnes agricoles</h1>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {total} campagne{total !== 1 ? "s" : ""} · saisons culturales & plans agronomiques
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => lea("Explique-moi le module Campagnes de LeadFarm en 3 points : à quoi sert une campagne agricole, comment fonctionne le cycle de vie (PLANNING → ACTIVE → RÉCOLTE → CLÔTURÉE), et comment les objectifs agronomiques (rendement, CAT I, IFT) aident à piloter une saison pommière ?")}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-[var(--surface-recessed)]"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
                title="Expliquer le module Campagnes"
              >
                <MessageCircle className="w-3.5 h-3.5" />Léa
              </button>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />Actualiser
              </button>
              <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: "var(--primary)" }}>
                <Plus className="w-3.5 h-3.5" />Nouvelle campagne
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Campagne active", value: activeRow?.nom.replace(/campagne\s*/i,"").trim() || activeRow?.nom || "—", sub: daysLeft != null && activeRow ? (daysLeft > 0 ? `${daysLeft}j restants` : "Échéance dépassée") : activeRow ? "" : "Aucune en cours", cls: activeRow ? "text-teal-700" : "text-gray-400", small: true },
              { label: "Actives",       value: rows.filter(r => r.statut === "ACTIVE"   || r.statut === "en_cours").length,  cls: "text-teal-600" },
              { label: "Planification", value: rows.filter(r => r.statut === "PLANNING" || r.statut === "planifie").length,  cls: "text-blue-600" },
              { label: "Clôturées",     value: rows.filter(r => ["CLÔTURÉE","ARCHIVÉE","termine"].includes(r.statut)).length, cls: "text-gray-500" },
            ].map((k: any) => (
              <div key={k.label} className="glass-card p-3 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>{k.label}</span>
                <span className={cn(k.small ? "text-base font-bold leading-tight" : "text-2xl font-black leading-none", k.cls)}>{k.value}</span>
                {k.sub && <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{k.sub}</span>}
              </div>
            ))}
          </div>

          {/* List */}
          {loading && !rows.length ? (
            <div className="glass-card p-12 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Chargement…</span>
            </div>
          ) : !rows.length ? (
            <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-015)" }}>
                <CalendarDays className="w-8 h-8" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Votre première campagne</p>
                <p className="text-xs mt-1 max-w-xs" style={{ color: "var(--text-secondary)" }}>
                  Une campagne représente une saison agricole — elle regroupe tous vos traitements, récoltes et plans agronomiques pour une période donnée.
                </p>
              </div>
              <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl text-white" style={{ background: "var(--primary)" }}>
                <Plus className="w-3.5 h-3.5" />Créer ma première campagne
              </button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                    <th className="py-3 px-4 font-semibold">Nom</th>
                    <th className="py-3 px-4 font-semibold">Période</th>
                    <th className="py-3 px-4 font-semibold">Marché</th>
                    <th className="py-3 px-4 font-semibold">Statut</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} onClick={() => setSelected(r)} className="transition-colors cursor-pointer hover:bg-[var(--surface-recessed)]" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-sm" style={{ background: r.couleur || "#00D4AA" }} />
                          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.nom}</span>
                          {r.culture && <span className="text-[10px] capitalize" style={{ color: "var(--text-secondary)" }}>{r.culture}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {fmtDate(r.date_debut)} → {fmtDate(r.date_fin)}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {r.marche_destination ? MARCHES.find(m => m.value === r.marche_destination)?.label ?? r.marche_destination : "—"}
                      </td>
                      <td className="py-3 px-4"><StatutBadge statut={r.statut} /></td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[var(--surface-recessed)] transition-colors" style={{ color: "var(--text-secondary)" }}><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
        )}

      </div>

      {/* ── Create / Edit modal ── */}
      {modal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={e => e.target === e.currentTarget && closeModal()}>
            <form onSubmit={handleSubmit} className="glass-card w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface-pure)" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{modal === "create" ? "Nouvelle campagne" : "Modifier la campagne"}</h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-[var(--surface-recessed)]" style={{ color: "var(--text-secondary)" }}><X className="w-4 h-4" /></button>
              </div>
              {formErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formErr}</p>}

              {/* Identité */}
              <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Nom <span className="text-red-500">*</span>
                <input ref={firstInput} type="text" maxLength={100} required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="ex. Campagne 2026-2027" className="px-3 py-2 rounded-xl border text-sm font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Date début <span className="text-red-500">*</span>
                  <input type="date" required value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} className="px-3 py-2 rounded-xl border text-sm font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Date fin <span className="text-red-500">*</span>
                  <input type="date" required value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} className="px-3 py-2 rounded-xl border text-sm font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Statut
                <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className="px-3 py-2 rounded-xl border text-sm font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>

              {/* Culture & Marché */}
              <div className="border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "var(--text-secondary)" }}>Culture & Marché</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Culture
                    <input type="text" value={form.culture} onChange={e => setForm(f => ({ ...f, culture: e.target.value }))} placeholder="pommier" className="px-3 py-2 rounded-xl border text-sm font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Destination marché
                    <select value={form.marche_destination} onChange={e => setForm(f => ({ ...f, marche_destination: e.target.value }))} className="px-3 py-2 rounded-xl border text-sm font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }}>
                      <option value="">— Non défini —</option>
                      {MARCHES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-semibold mt-3" style={{ color: "var(--text-secondary)" }}>
                  GGN (GlobalG.A.P. Number)
                  <input type="text" value={form.ggn} onChange={e => setForm(f => ({ ...f, ggn: e.target.value }))} placeholder="ex. 4049928350195" maxLength={20} className="px-3 py-2 rounded-xl border text-sm font-mono font-normal" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                </label>
              </div>

              {/* Objectifs agronomiques */}
              <div className="border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "var(--text-secondary)" }}>Objectifs agronomiques</p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Rendement (kg/ha)
                    <input type="number" min="0" max="200000" step="100" value={form.rendement_cible_kg_ha} onChange={e => setForm(f => ({ ...f, rendement_cible_kg_ha: e.target.value }))} placeholder="40000" className="px-3 py-2 rounded-xl border text-sm font-normal font-mono" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    CAT I (%)
                    <input type="number" min="0" max="100" step="1" value={form.qualite_cible_cat1_pct} onChange={e => setForm(f => ({ ...f, qualite_cible_cat1_pct: e.target.value }))} placeholder="70" className="px-3 py-2 rounded-xl border text-sm font-normal font-mono" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    IFT cible
                    <input type="number" min="0" max="100" step="0.1" value={form.ift_cible} onChange={e => setForm(f => ({ ...f, ift_cible: e.target.value }))} placeholder="12.5" className="px-3 py-2 rounded-xl border text-sm font-normal font-mono" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                  </label>
                </div>
              </div>

              {/* Notes & Couleur */}
              <div className="border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
                <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Notes (optionnel)
                  <textarea maxLength={500} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Particularités de cette saison…" rows={2} className="px-3 py-2 rounded-xl border text-sm font-normal resize-none" style={{ borderColor: "var(--glass-border)", background: "var(--surface-canvas)", color: "var(--text-primary)" }} />
                  <span className="text-[10px] text-right" style={{ color: "var(--text-secondary)" }}>{form.description.length}/500</span>
                </label>
                <div className="flex flex-col gap-2 mt-3">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Couleur</span>
                  <div className="flex gap-2 flex-wrap">
                    {PALETTE.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, couleur: c }))} className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: form.couleur === c ? "var(--text-primary)" : "transparent", boxShadow: form.couleur === c ? `0 0 0 2px white, 0 0 0 3px ${c}` : undefined }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{modal === "create" ? "Créer" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
            <div className="glass-card w-full max-w-sm p-6 flex flex-col gap-4 shadow-2xl" style={{ background: "var(--surface-pure)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Archiver la campagne</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Cette action est irréversible depuis l'interface.</p>
                </div>
              </div>
              <div className="rounded-xl p-3 border" style={{ background: "var(--surface-recessed)", borderColor: "var(--glass-border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: confirmDelete.couleur || "#00D4AA" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{confirmDelete.nom}</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{fmtDate(confirmDelete.date_debut)} → {fmtDate(confirmDelete.date_fin)}</p>
                {(confirmDelete.statut === "ACTIVE" || confirmDelete.statut === "en_cours") && (
                  <p className="text-xs text-amber-600 font-semibold mt-1.5">⚠ Cette campagne est actuellement active.</p>
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>La campagne sera archivée — ses données resteront sécurisées mais ne seront plus visibles dans l'interface.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 text-sm rounded-xl border font-medium" style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}>Annuler</button>
                <button onClick={() => handleDelete(confirmDelete.id)} disabled={deleting === confirmDelete.id} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {deleting === confirmDelete.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}Archiver
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </AppLayout>
  );
}
