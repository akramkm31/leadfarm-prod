"use client";

import { useState, useMemo } from "react";
import McdPageShell from "@/components/mcd/McdPageShell";
import ModalPortal from "@/components/ui/ModalPortal";
import AiDetectPanel, { type DetectResult } from "@/components/maladies/AiDetectPanel";
import { useMcdResource } from "@/hooks/useMcd";
import type { EvenementMaladie, Maladie } from "@/lib/mcd/types";
import {
  Bug, Plus, X, AlertTriangle, Bot, MapPin,
  Microscope, Calendar, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type MaladiesPayload = { maladies: Maladie[]; evenements: EvenementMaladie[] };

const SEV = {
  faible:   { label: "Faible",   cls: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
  moderee:  { label: "Modérée",  cls: "bg-amber-100 text-amber-800",   dot: "bg-amber-400" },
  elevee:   { label: "Élevée",   cls: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  critique: { label: "Critique", cls: "bg-red-100 text-red-800",       dot: "bg-red-500" },
} as const;

const PATH_ICON: Record<string, string> = {
  fongique: "🍄", bacterien: "🦠", viral: "🔬", acarien: "🕷️", ravageur: "🐛",
};

type SevKey = keyof typeof SEV;
type SourceType = "terrain" | "IA";

const INIT_FORM = {
  maladie_id: "",
  parcelle_id: "",
  severite: "moderee" as SevKey,
  date_observation: new Date().toISOString().split("T")[0],
  source: "terrain" as SourceType,
  notes: "",
};

export default function MaladiesPage() {
  const { data, loading, error, refetch } = useMcdResource<MaladiesPayload>("/api/v1/maladies?events=1");
  const maladies = data?.maladies ?? [];
  const evenements = data?.evenements ?? [];

  const [showModal, setShowModal] = useState(false);
  const [showAI, setShowAI]       = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [parcelles, setParcelles] = useState<{ id: string; name: string }[]>([]);

  const stats = useMemo(() => ({
    total: maladies.length,
    obs: evenements.length,
    alerte: evenements.filter((e) => e.severite === "critique" || e.severite === "elevee").length,
    lastDate: evenements[0]?.date_observation,
  }), [maladies, evenements]);

  const DISEASE_TERMS: Record<number, string[]> = {
    0: ["tavelure", "scab"],
    1: ["rouille", "rust"],
    2: ["oïdium", "oidium", "mildiou", "powdery"],
    3: ["pourriture", "black rot", "black_rot"],
  };

  async function loadParcelles() {
    if (parcelles.length) return;
    try {
      const res = await fetch("/api/v1/parcelles", { credentials: "include" });
      const j = await res.json();
      setParcelles((j.data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    } catch { /* ok */ }
  }

  async function handleDetected(result: DetectResult) {
    await loadParcelles();
    const terms = DISEASE_TERMS[result.classIdx] ?? [];
    const matched = maladies.find(m => terms.some(t => m.nom.toLowerCase().includes(t)));
    setForm({
      maladie_id: matched?.id ?? "",
      parcelle_id: "",
      severite: result.severite as typeof INIT_FORM.severite,
      date_observation: new Date().toISOString().split("T")[0],
      source: "IA",
      notes: `Détectée par IA : ${result.nameFr} (${(result.confidence * 100).toFixed(1)}% confiance)`,
    });
    setFormErr(null);
    setShowAI(false);
    setShowModal(true);
  }

  async function openModal() {
    setShowModal(true);
    setFormErr(null);
    setForm(INIT_FORM);
    await loadParcelles();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.maladie_id) { setFormErr("Sélectionnez une maladie."); return; }
    setSaving(true);
    setFormErr(null);
    try {
      const res = await fetch("/api/v1/maladies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maladie_id: form.maladie_id,
          parcelle_id: form.parcelle_id || null,
          severite: form.severite,
          date_observation: form.date_observation,
          source: form.source,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
      setShowModal(false);
      refetch();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <McdPageShell
      title="Maladies & Observations"
      subtitle="Référentiel pathogènes · Suivi observations terrain & IA · Traçabilité SCD2"
      icon={<Bug className="w-6 h-6 text-[var(--color-valley-green)]" />}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAI(v => !v)}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full transition-colors",
              showAI
                ? "bg-purple-600 text-white"
                : "border border-purple-300 text-purple-700 hover:bg-purple-50"
            )}
          >
            <Bot className="w-3.5 h-3.5" /> Détection IA
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-[var(--color-valley-green)] text-white hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> Nouvelle observation
          </button>
        </div>
      }
      loading={loading}
    >
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* AI Detection Panel */}
      {showAI && (
        <div className="mb-4">
          <AiDetectPanel onDetected={handleDetected} onClose={() => setShowAI(false)} />
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pathogènes", value: stats.total, Icon: Microscope, danger: false },
          { label: "Observations", value: stats.obs, Icon: Calendar, danger: false },
          { label: "Critiques / Élevées", value: stats.alerte, Icon: AlertTriangle, danger: stats.alerte > 0 },
          {
            label: "Dernière obs.",
            value: stats.lastDate ? new Date(stats.lastDate).toLocaleDateString("fr-FR") : "—",
            Icon: Bug,
            danger: false,
          },
        ].map(({ label, value, Icon, danger }) => (
          <div key={label} className="glass-card p-4 border border-[var(--color-stone-moss)]">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={cn("w-3.5 h-3.5", danger ? "text-red-500" : "text-[var(--color-valley-green)]")} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-mist-gray)]">{label}</span>
            </div>
            <p className={cn("text-xl font-black", danger ? "text-red-600" : "text-[var(--color-adaline-ink)]")}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Référentiel */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Référentiel pathogènes</h2>
          {maladies.length === 0 ? (
            <div className="glass-card p-8 text-center border border-[var(--color-stone-moss)]">
              <Leaf className="w-8 h-8 mx-auto text-[var(--color-mist-gray)] mb-2" />
              <p className="text-sm text-[var(--color-mist-gray)]">Aucun pathogène enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {maladies.map((m) => (
                <div key={m.id} className="glass-card p-4 border border-[var(--color-stone-moss)]">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{PATH_ICON[m.type_pathogene ?? ""] ?? "🔬"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--color-adaline-ink)]">{m.nom}</p>
                      <p className="text-xs text-[var(--color-mist-gray)] capitalize mt-0.5">{m.type_pathogene ?? "—"}</p>
                      {(m.cultures_cibles ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(m.cultures_cibles ?? []).map((c) => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-valley-green)]/10 text-[var(--color-valley-green)] font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                      m.actif !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {m.actif !== false ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Observations */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Observations récentes</h2>
          {evenements.length === 0 ? (
            <div className="glass-card p-8 text-center border border-[var(--color-stone-moss)]">
              <AlertTriangle className="w-8 h-8 mx-auto text-[var(--color-mist-gray)] mb-2" />
              <p className="text-sm text-[var(--color-mist-gray)] mb-3">Aucune observation enregistrée</p>
              <button
                onClick={openModal}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--color-valley-green)] text-white hover:opacity-90"
              >
                Première observation
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {evenements.map((e) => {
                const sev = SEV[(e.severite as SevKey) ?? "moderee"] ?? SEV.moderee;
                return (
                  <div key={e.id} className="glass-card p-4 border border-[var(--color-stone-moss)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", sev.dot)} />
                        <p className="font-semibold text-sm text-[var(--color-adaline-ink)] truncate">
                          {e.maladie_nom ?? e.maladie_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", sev.cls)}>
                          {sev.label}
                        </span>
                        <span className={cn(
                          "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          e.source === "IA" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {e.source === "IA" ? <Bot className="w-2.5 h-2.5" /> : <Microscope className="w-2.5 h-2.5" />}
                          {e.source ?? "terrain"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-mist-gray)]">
                      {e.parcelle_name && e.parcelle_id && (
                        <Link
                          href={`/parcelles?select=${e.parcelle_id}`}
                          className="hover:text-[var(--color-valley-green)] flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" /> {e.parcelle_name}
                        </Link>
                      )}
                      <span>{new Date(e.date_observation).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {e.notes && (
                      <p className="text-xs text-[var(--color-mist-gray)] mt-1.5 italic border-t border-[var(--color-stone-moss)]/50 pt-1.5">
                        {e.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[var(--color-stone-moss)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-stone-moss)]">
                <h3 className="font-bold text-[var(--color-adaline-ink)]">Nouvelle observation</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formErr && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {formErr}
                  </p>
                )}

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--color-mist-gray)] mb-1 block">
                    Maladie *
                  </label>
                  <select
                    required
                    value={form.maladie_id}
                    onChange={(e) => setForm((f) => ({ ...f, maladie_id: e.target.value }))}
                    className="w-full glass-input px-3 py-2 text-sm rounded-xl"
                  >
                    <option value="">— Sélectionner —</option>
                    {maladies.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>

                {parcelles.length > 0 && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--color-mist-gray)] mb-1 block">
                      Parcelle
                    </label>
                    <select
                      value={form.parcelle_id}
                      onChange={(e) => setForm((f) => ({ ...f, parcelle_id: e.target.value }))}
                      className="w-full glass-input px-3 py-2 text-sm rounded-xl"
                    >
                      <option value="">— Aucune —</option>
                      {parcelles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--color-mist-gray)] mb-1 block">
                      Sévérité *
                    </label>
                    <select
                      value={form.severite}
                      onChange={(e) => setForm((f) => ({ ...f, severite: e.target.value as SevKey }))}
                      className="w-full glass-input px-3 py-2 text-sm rounded-xl"
                    >
                      <option value="faible">Faible</option>
                      <option value="moderee">Modérée</option>
                      <option value="elevee">Élevée</option>
                      <option value="critique">Critique</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--color-mist-gray)] mb-1 block">
                      Source *
                    </label>
                    <select
                      value={form.source}
                      onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as SourceType }))}
                      className="w-full glass-input px-3 py-2 text-sm rounded-xl"
                    >
                      <option value="terrain">Terrain</option>
                      <option value="IA">IA</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--color-mist-gray)] mb-1 block">
                    Date d'observation *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date_observation}
                    onChange={(e) => setForm((f) => ({ ...f, date_observation: e.target.value }))}
                    className="w-full glass-input px-3 py-2 text-sm rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--color-mist-gray)] mb-1 block">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Observations complémentaires, photos référencées..."
                    className="w-full glass-input px-3 py-2 text-sm rounded-xl resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-[var(--color-stone-moss)] text-sm font-semibold text-[var(--color-adaline-ink)] hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 rounded-xl btn-lf-primary text-sm font-bold disabled:opacity-40"
                  >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </McdPageShell>
  );
}
