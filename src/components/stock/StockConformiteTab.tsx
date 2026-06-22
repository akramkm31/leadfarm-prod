"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAccessContext } from "@/components/auth/AccessProvider";
import {
  CHECKLIST_SECTIONS,
  CHECKLIST_ITEMS,
  CHECKLIST_TOTAL,
  scoreFromReponses,
  scoreStatus,
  SCORE_META,
  SEVERITY_META,
} from "@/lib/stock/checklist-local";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
  ClipboardCheck,
  Printer,
  History,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

const LOCAL_STORAGE_KEY = "leadfarm_checklist_local_draft";

type HistoryEntry = {
  id: string;
  reponses: Record<string, boolean>;
  score_pct: number | null;
  date_verification: string;
  observations?: string | null;
  created_at?: string;
};

function stripMeta(reponses: Record<string, boolean>): Record<string, boolean> {
  const next = { ...reponses };
  delete (next as Record<string, unknown>)["__observations"];
  return next;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function StockConformiteTab() {
  const { can } = useAccessContext();
  const canEdit = can("stock.edit");

  const [reponses, setReponses] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVerif, setLastVerif] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const score = useMemo(() => scoreFromReponses(reponses), [reponses]);
  const status = scoreStatus(score);
  const meta = SCORE_META[status];
  const checked = CHECKLIST_ITEMS.filter((i) => reponses[i.id]).length;
  const pendingCritical = CHECKLIST_ITEMS.filter(
    (i) => i.severity === "critical" && !reponses[i.id]
  ).length;

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/stock/checklist?limit=8", { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);

      const rows = (body.data ?? []) as HistoryEntry[];
      setHistory(rows);

      const latest = body.latest as HistoryEntry | null;
      if (latest?.reponses) {
        setReponses(stripMeta(latest.reponses));
        setObservations(latest.observations || "");
        setLastVerif(latest.date_verification);
      } else {
        const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (draft) {
          const parsed = JSON.parse(draft) as { reponses?: Record<string, boolean>; observations?: string };
          if (parsed.reponses) setReponses(parsed.reponses);
          if (parsed.observations) setObservations(parsed.observations);
        }
      }
    } catch (err) {
      const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as { reponses?: Record<string, boolean>; observations?: string };
          if (parsed.reponses) setReponses(parsed.reponses);
          if (parsed.observations) setObservations(parsed.observations);
        } catch {
          /* ignore */
        }
      }
      setError(err instanceof Error ? err.message : "Impossible de charger la checklist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ reponses, observations, updatedAt: new Date().toISOString() })
    );
  }, [reponses, observations, loading]);

  const toggleItem = (id: string) => {
    if (!canEdit) return;
    setReponses((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const setSection = (sectionId: string, value: boolean) => {
    if (!canEdit) return;
    const section = CHECKLIST_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    setReponses((prev) => {
      const next = { ...prev };
      for (const item of section.items) next[item.id] = value;
      return next;
    });
    setSaved(false);
  };

  async function sauvegarder() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/stock/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reponses, observations: observations.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);

      setSaved(true);
      setLastVerif(body.date_verification || new Date().toISOString().split("T")[0]);
      setHistory((prev) => [body as HistoryEntry, ...prev.filter((h) => h.id !== body.id)].slice(0, 8));
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  function loadFromHistory(entry: HistoryEntry) {
    setReponses(stripMeta(entry.reponses));
    setObservations(entry.observations || "");
    setLastVerif(entry.date_verification);
    setSaved(false);
    setShowHistory(false);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header */}
      <div className={cn("glass-card p-5 border", meta.border)}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#203b14]/10 border border-[#203b14]/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#203b14]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]">
                Conformité du local de stockage
              </h2>
              <p className="text-xs text-[#31200b]/65 mt-0.5">
                Référentiel MOP.PR6.001 — {CHECKLIST_TOTAL} points obligatoires (phyto)
              </p>
              {lastVerif && (
                <p className="text-[11px] text-[#31200b]/55 mt-2">
                  Dernière vérification enregistrée : {formatDate(lastVerif)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className={cn("flex flex-col items-center px-5 py-3 rounded-xl border min-w-[100px]", meta.badge)}>
              <span className={cn("text-3xl font-black font-mono tabular-nums", meta.text)}>{score}%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 opacity-80">
                {meta.label}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void loadChecklist()}
                disabled={loading}
                className="p-2 rounded-lg border border-[var(--color-stone-moss)] hover:bg-[#f4f7ef] text-[#31200b]/60 transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-lg border border-[var(--color-stone-moss)] hover:bg-[#f4f7ef] text-[#31200b]/60 transition-colors print:hidden"
                title="Imprimer"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Validés", value: `${checked}/${CHECKLIST_TOTAL}`, ok: checked === CHECKLIST_TOTAL },
            { label: "Critiques restants", value: String(pendingCritical), ok: pendingCritical === 0 },
            { label: "Statut", value: meta.label, ok: status === "conforme" },
            { label: "Historique", value: `${history.length} fiche${history.length !== 1 ? "s" : ""}`, ok: history.length > 0 },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-[var(--color-stone-moss)] bg-[#f8faf5] px-3 py-2"
            >
              <p className="text-[10px] text-[#31200b]/55 uppercase tracking-wide">{s.label}</p>
              <p className={cn("text-sm font-bold mt-0.5", s.ok ? "text-emerald-700" : "text-[var(--color-adaline-ink)]")}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="h-2.5 bg-[#e8ede0] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", meta.bar)}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOnlyPending((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              showOnlyPending
                ? "bg-[#203b14]/8 border-[#203b14]/25 text-[#203b14]"
                : "border-[var(--color-stone-moss)] text-[#31200b]/65 hover:bg-[#f4f7ef]"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {showOnlyPending ? "Tous les points" : "Points non validés"}
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-stone-moss)] text-[#31200b]/65 hover:bg-[#f4f7ef]"
          >
            <History className="w-3.5 h-3.5" />
            Historique
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {!canEdit && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            Lecture seule — profil sans droit stock.edit
          </span>
        )}
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="glass-card p-4 print:hidden">
          <h3 className="text-xs font-bold text-[#31200b]/70 uppercase tracking-wider mb-3">
            Vérifications précédentes
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {history.map((h) => {
              const hScore = h.score_pct ?? scoreFromReponses(stripMeta(h.reponses));
              const hStatus = scoreStatus(hScore);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => loadFromHistory(h)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--color-stone-moss)] hover:bg-[#f4f7ef] text-left transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--color-adaline-ink)]">
                      {formatDate(h.date_verification)}
                    </span>
                    {h.observations && (
                      <p className="text-[10px] text-[#31200b]/55 mt-0.5 line-clamp-1">{h.observations}</p>
                    )}
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-md border shrink-0", SCORE_META[hStatus].badge)}>
                    {hScore}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sections */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#203b14] animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {CHECKLIST_SECTIONS.map((section) => {
            const sectionItems = showOnlyPending
              ? section.items.filter((i) => !reponses[i.id])
              : section.items;
            if (sectionItems.length === 0) return null;

            const sectionChecked = section.items.filter((i) => reponses[i.id]).length;
            const isCollapsed = collapsed[section.id];

            return (
              <div key={section.id} className="glass-card overflow-hidden">
                <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--color-stone-moss)] bg-[#f8faf5]">
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--color-adaline-ink)]">{section.title}</h3>
                      <span className="text-[10px] font-mono text-[#31200b]/50">
                        {sectionChecked}/{section.items.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-[#31200b]/40" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-[#31200b]/40" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#31200b]/55 mt-0.5">{section.description}</p>
                  </button>
                  {canEdit && !isCollapsed && (
                    <div className="flex gap-1 shrink-0 print:hidden">
                      <button
                        type="button"
                        onClick={() => setSection(section.id, true)}
                        className="text-[10px] px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Tout OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setSection(section.id, false)}
                        className="text-[10px] px-2 py-1 rounded-md border border-[var(--color-stone-moss)] text-[#31200b]/55 hover:bg-white"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {sectionItems.map((item) => {
                      const ok = !!reponses[item.id];
                      const sev = SEVERITY_META[item.severity];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                            ok
                              ? "bg-emerald-50/80 border-emerald-200"
                              : "bg-white border-[var(--color-stone-moss)] hover:border-[#203b14]/25 hover:bg-[#f8faf5]",
                            !canEdit && "cursor-default opacity-90"
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5",
                              ok ? "bg-emerald-600 border-emerald-600" : sev.ring
                            )}
                          >
                            {ok ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <XCircle className="w-4 h-4 text-[#31200b]/25" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "text-sm leading-snug",
                                  ok ? "text-[var(--color-adaline-ink)] font-medium" : "text-[#31200b]/75"
                                )}
                              >
                                {item.label}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-[#31200b]/45">
                                <span className={cn("w-1.5 h-1.5 rounded-full", sev.dot)} />
                                {sev.label}
                              </span>
                            </div>
                            {item.hint && (
                              <p className="text-[10px] text-[#31200b]/50 mt-1">{item.hint}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Observations */}
      <div className="glass-card p-4">
        <label className="text-xs font-semibold text-[#31200b]/70 uppercase tracking-wider block mb-2">
          Observations & actions correctives
        </label>
        <textarea
          className="glass-input w-full px-3 py-2.5 text-sm min-h-[80px] resize-y"
          placeholder="Ex : Remplacer l'extincteur expiré, repeindre le panneau de sécurité..."
          value={observations}
          onChange={(e) => {
            setObservations(e.target.value);
            setSaved(false);
          }}
          disabled={!canEdit}
        />
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 glass-card p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Vérification enregistrée
            </span>
          )}
          {checked === CHECKLIST_TOTAL && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Local conforme — 19/19
            </span>
          )}
          {pendingCritical > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              {pendingCritical} point{pendingCritical > 1 ? "s" : ""} critique{pendingCritical > 1 ? "s" : ""} non validé{pendingCritical > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void sauvegarder()}
            disabled={saving || loading}
            className="glass-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer la vérification
          </button>
        )}
      </div>
    </div>
  );
}
