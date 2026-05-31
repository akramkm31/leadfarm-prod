/**
 * CHECKLIST STOCKAGE — MOP.PR6.001
 * Section "Conformit� local" pour v�rifier les 19 points de conformit�
 * du local de stockage des produits phytosanitaires.
 */

"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";

const CHECKLIST_LOCAL = [
  { id: "emballage_origine",     label: "Produits dans leur emballage d'origine" },
  { id: "pas_liquides_dessus",   label: "Liquides ne sont pas stock�s au-dessus des poudres" },
  { id: "etiquette_origine",     label: "�tiquette d'origine pr�sente sur chaque produit" },
  { id: "abri_gel_lumiere",      label: "� l'abri du gel et de la lumi�re" },
  { id: "local_sec",             label: "Local sec, ventil�, propre" },
  { id: "ferme_cle",             label: "Ferm� � cl� en permanence" },
  { id: "sol_retention",         label: "Sol imperm�able avec cuvette de r�tention" },
  { id: "installation_elec",     label: "Installation �lectrique conforme + bon �clairage" },
  { id: "etageres_metal",        label: "�tag�res en m�tal (non absorbant)" },
  { id: "eau_courante",          label: "Eau courante disponible � proximit�" },
  { id: "zone_epi",              label: "Zone s�par�e EPI + trousse urgence" },
  { id: "matieres_absorbantes",  label: "Mati�res absorbantes + pelle + sacs plastiques" },
  { id: "consignes_affiches",    label: "Consignes s�curit� et num�ros urgence affich�s" },
  { id: "extincteur",            label: "Extincteur poudre ABC � proximit�" },
  { id: "panneau_porte",         label: "Panneau � Interdit non-autoris�s � sur la porte" },
  { id: "t_tplus_isoles",        label: "Produits T et T+ isol�s et ferm�s � cl� (🔴)" },
  { id: "cmr_separes",           label: "Produits CMR (R40/R62/R63/R68) sur �tag�res s�par�es (🟠)" },
  { id: "acides_bases_sep",      label: "Acides et bases corrosives dans bacs s�par�s" },
  { id: "comburants_sep",        label: "Comburants et inflammables s�par�s" },
];

export default function StockConformiteTab() {
  const [reponses, setReponses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastVerif, setLastVerif] = useState<string | null>(null);

  useEffect(() => {
    loadLastChecklist();
  }, []);

  async function loadLastChecklist() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("checklist_stockage")
        .select("*")
        .order("date_verification", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setReponses(data.reponses || {});
        setLastVerif(data.date_verification);
      }
    } catch {
      // Pas de checklist existante, valeurs par d�faut
    } finally {
      setLoading(false);
    }
  }

  const total = CHECKLIST_LOCAL.length;
  const checked = Object.values(reponses).filter(Boolean).length;
  const score = total > 0 ? Math.round((checked / total) * 100) : 0;

  const getScoreColor = () => {
    if (score >= 90) return "text-[var(--color-valley-green)]";
    if (score >= 70) return "text-[var(--color-valley-green)]";
    return "text-[var(--color-valley-green)]";
  };

  const getScoreBg = () => {
    if (score >= 90) return "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/20";
    if (score >= 70) return "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/20";
    return "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/20";
  };

  async function sauvegarder() {
    setSaving(true);
    try {
      await supabase.from("checklist_stockage").insert({
        reponses,
        score_pct: score,
        date_verification: new Date().toISOString().split("T")[0],
      });
      setSaved(true);
      setLastVerif(new Date().toISOString().split("T")[0]);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Erreur sauvegarde checklist:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/15 border border-[var(--color-valley-green)]/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <ShieldCheck className="w-7 h-7 text-[var(--color-valley-green)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-adaline-ink)]/90">Conformit� du Local de Stockage</h2>
              <p className="text-xs text-[var(--color-adaline-ink)]/55 mt-0.5">
                R�f�rentiel MOP.PR6.001 &mdash; V�rification des 19 points obligatoires
              </p>
              {lastVerif && (
                <p className="text-[10px] text-[var(--color-valley-green)]/60 mt-2">
                  Derni�re v�rification : {new Date(lastVerif).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          </div>

          {/* Score circular badge */}
          <div className={cn("flex flex-col items-center px-5 py-3 rounded-2xl border", getScoreBg())}>
            <span className={cn("text-3xl font-black font-mono", getScoreColor())}>{score}%</span>
            <span className="text-[10px] text-[var(--color-adaline-ink)]/40 mt-0.5 uppercase tracking-wider">Conformit�</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--color-adaline-ink)]/50">{checked}/{total} points valid�s</span>
            <span className="text-[10px] text-[var(--color-adaline-ink)]/40">
              {score >= 90 ? "✅ Conforme" : score >= 70 ? "⚠️ Am�liorations n�cessaires" : "❌ Non conforme"}
            </span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                score >= 90 ? "bg-emerald-400" : score >= 70 ? "bg-emerald-400" : "bg-emerald-400"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[var(--color-valley-green)] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHECKLIST_LOCAL.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setReponses((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                setSaved(false);
              }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                reponses[item.id]
                  ? "bg-[var(--color-valley-green)]/[0.07] border-[var(--color-valley-green)]/25"
                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                  reponses[item.id]
                    ? "bg-[var(--color-valley-green)] border-emerald-500"
                    : "border-[var(--color-mist-gray)]"
                )}
              >
                {reponses[item.id] ? (
                  <CheckCircle2 className="w-4 h-4 text-black" />
                ) : (
                  <XCircle className="w-4 h-4 text-[var(--color-adaline-ink)]/30" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  reponses[item.id] ? "text-[var(--color-adaline-ink)]/80" : "text-[var(--color-adaline-ink)]/50"
                )}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-between glass-card p-4">
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-valley-green)] bg-[var(--color-valley-green)]/10 px-3 py-1.5 rounded-lg border border-[var(--color-valley-green)]/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sauvegard�
            </span>
          )}
          {checked === total && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-valley-green)] bg-[var(--color-valley-green)]/10 px-3 py-1.5 rounded-lg border border-[var(--color-valley-green)]/20">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Local conforme
            </span>
          )}
        </div>
        <button
          onClick={sauvegarder}
          disabled={saving || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] text-sm font-bold hover:bg-[var(--color-valley-green)]/30 transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Enregistrer la v�rification
        </button>
      </div>
    </div>
  );
}
