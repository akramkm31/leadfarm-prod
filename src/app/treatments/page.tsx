"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import { PageScreen, PageHero, AdalineButton } from "@/components/adaline/PageScreen";
import PlanifierTraitementModal from "@/components/treatments/PlanifierTraitementModal";
import EditTraitementModal from "@/components/treatments/EditTraitementModal";
import TrajectoryReplayModal from "@/components/treatments/TrajectoryReplayModal";
import { useTreatments, useParcelles } from "@/hooks/useData";
import {
  fetchTreatmentWithPoints,
  transitionTreatmentStatus,
  canTransition,
  deleteTreatment,
} from "@/lib/data-provider";
import { dbPointsToTrajectory } from "@/lib/trajectory-utils";
import {
  treatmentTypeLabels,
  type Treatment,
  type TreatmentStatus,
  type Parcelle,
} from "@/lib/mock-data";

const TractorLiveMap = dynamic(() => import("@/components/map/TractorLiveMap"), { ssr: false });
import { cn, formatHectares } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";
import InlineBanner from "@/components/ui/InlineBanner";
import {
  Droplets, Plus, Calendar, User, MapPin, FlaskConical,
  Clock, CheckCircle, Circle, Play, XCircle, ChevronRight,
  ArrowRight, Package, Navigation, Send, ThumbsUp, Loader2,
  FileDown, AlertTriangle, Star, RotateCcw, CheckCircle2, FileText,
  Pencil, Trash2, Eye, GitBranch,
} from "lucide-react";

import { genererOrdreTraitementPDF } from "@/lib/pdf/ordreTraitement";
import { genererRegistreMensuelPDF, type RegistreEntry } from "@/lib/pdf/registreMensuel";
import FeatureGate from "@/components/auth/FeatureGate";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { MagasinierPage } from "@/components/magasinier/MagasinierBranch";
import MagTreatmentsPage from "@/components/magasinier/pages/MagTreatmentsPage";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  badgeClass: string;
}> = {
  draft:            { label: "Brouillon",          icon: Circle,       color: "text-[#31200b]",  badgeClass: "badge-neutral"  },
  pending_approval: { label: "En attente appro.",  icon: Clock,        color: "text-amber-600",                    badgeClass: "badge-warning"  },
  approved:         { label: "Approuvé",           icon: ThumbsUp,     color: "text-[var(--color-valley-green)]",   badgeClass: "badge-info"     },
  planned:          { label: "Planifié",           icon: Calendar,     color: "text-[var(--color-valley-green)]",   badgeClass: "badge-info"     },
  in_progress:      { label: "En cours",           icon: Play,         color: "text-[#203b14]",  badgeClass: "badge-success"  },
  completed:        { label: "Terminé",            icon: CheckCircle,  color: "text-[#203b14]",  badgeClass: "badge-success"  },
  evaluated:        { label: "Évalué",             icon: Star,         color: "text-[var(--color-valley-green)]", badgeClass: "badge-neutral"  },
  cancelled:        { label: "Annulé",             icon: XCircle,      color: "text-red-500",                      badgeClass: "badge-danger"   },
};

const ALL_STATUSES = ["all", "draft", "pending_approval", "approved", "planned", "in_progress", "completed", "evaluated", "cancelled"] as const;
type FilterStatus = typeof ALL_STATUSES[number];

// ─── Workflow transitions available per status ─────────────────────────────────

const WORKFLOW_ACTIONS: Record<string, { to: string; label: string; icon: React.ElementType; danger?: boolean }[]> = {
  draft:            [{ to: "pending_approval", label: "Soumettre pour approbation", icon: Send }],
  pending_approval: [
    { to: "approved", label: "Approuver", icon: ThumbsUp },
    { to: "draft",    label: "Renvoyer en brouillon", icon: RotateCcw },
  ],
  approved:         [{ to: "in_progress", label: "Démarrer", icon: Play }],
  in_progress:      [{ to: "completed",   label: "Clôturer", icon: CheckCircle2 }],
  completed:        [{ to: "evaluated",   label: "Évaluer", icon: Star }],
};

// ─── Magasinier read-only notice ──────────────────────────────────────────────

function MagasinierReadOnlyBanner() {
  const { can } = useAccessContext();
  if (can("treatments.plan") || !can("treatments.view")) return null;
  return (
    <InlineBanner tone="info">
      <strong>Lecture seule — préparation produits.</strong>{" "}
      Vous consultez les traitements pour préparer les produits. La planification reste au directeur d'exploitation.
    </InlineBanner>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TreatmentsPage() {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <MagasinierPage mag={MagTreatmentsPage} />;
  }
  return <TreatmentsContent />;
}

function TreatmentsContent() {
  const searchParams = useSearchParams();
  const { data: treatmentsRaw, loading, refetch } = useTreatments();
  const { data: parcellesRaw } = useParcelles();
  const treatments = (treatmentsRaw || []) as any[];
  const parcelles = (parcellesRaw || []) as Parcelle[];

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [trajectoryOpen, setTrajectoryOpen] = useState(false);
  const [selectedTrajectory, setSelectedTrajectory] = useState<any>(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const pdfLoadingRef = useRef(false);
  const [completedBanner, setCompletedBanner] = useState<Treatment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam && ALL_STATUSES.includes(statusParam as FilterStatus)) {
      setFilter(statusParam as FilterStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading || treatments.length === 0) return;
    const idParam = searchParams.get("id");
    if (!idParam) return;
    const match = treatments.find((t) => t.id === idParam);
    if (match) setSelectedTreatment(match);
  }, [searchParams, treatments, loading]);

  // Load trajectory when treatment selected
  useEffect(() => {
    if (!selectedTreatment?.id || selectedTreatment.status !== "completed") {
      setSelectedTrajectory(null);
      return;
    }
    setLoadingTrajectory(true);
    fetchTreatmentWithPoints(selectedTreatment.id).then((data: any) => {
      if (data?.points?.length > 0) setSelectedTrajectory(dbPointsToTrajectory(data.points));
      else setSelectedTrajectory(null);
      setLoadingTrajectory(false);
    });
  }, [selectedTreatment?.id, selectedTreatment?.status]);

  // Keep selected treatment in sync after refetch
  useEffect(() => {
    if (!selectedTreatment) return;
    const updated = treatments.find(t => t.id === selectedTreatment.id);
    if (updated) setSelectedTreatment(updated);
  }, [treatments]);

  async function telechargerOrdre(treatmentId: string) {
    if (pdfLoadingRef.current) return;
    const t = treatments.find(t => t.id === treatmentId);
    if (!t) return;
    pdfLoadingRef.current = true;
    try {
      // Méthode 1 : utiliser l'API serveur (fiable, charge depuis Supabase directement)
      const res = await fetch(`/api/v1/treatments/${treatmentId}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FOR.PR6.003_${treatmentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      
      // Méthode 2 : fallback client-side si l'API échoue
      console.warn("API PDF non disponible, fallback génération locale");
      const raw = t as any;

      // Extraire les données FOR.PR6.003 depuis l'objet React
      // (mappé par mapTreatment depuis `notes`)
      const culture = raw.culture || "";
      const variete = raw.variete || "";
      const cible = raw.cible || "";
      const modeApp = raw.mode_application || "Pulverisation";
      const materiel = raw.materiel || "";
      const vitesseKmh = raw.vitesse_kmh || 0;
      const pressionBar = raw.pression_bar || 0;
      const diamPastilles = raw.diametre_pastilles_mm || 0;

      const produits = (raw.produitsDetail || []).map((p: any) => ({
        nom_commercial: p.nom_commercial || "",
        matiere_active: p.matiere_active || "",
        dose_hl: p.dose_hl || "",
        quantite_sortir: p.quantite_sortir || "",
      }));

      const pdfBlob = await genererOrdreTraitementPDF({
        site: "Domaine Khelifa",
        n_traitement: t.id.slice(0, 8).toUpperCase(),
        date_prevue: t.plannedDate || "",
        parcelle_nom: t.parcelleName || "",
        superficie_ha: t.areaTreatedHectares || undefined,
        culture,
        variete,
        cible,
        mode_application: modeApp,
        materiel_utilise: materiel,
        vitesse_avancement_kmh: (vitesseKmh && vitesseKmh > 0) ? vitesseKmh : undefined,
        pression_service_bar: (pressionBar && pressionBar > 0) ? pressionBar : undefined,
        diametre_pastilles_mm: (diamPastilles && diamPastilles > 0) ? diamPastilles : undefined,
        produits,
        operateur_nom: t.operatorName || "",
        date_reelle: raw.date_reelle || t.executedDate || undefined,
        heure_debut: raw.heure_debut || undefined,
        heure_fin: raw.heure_fin || undefined,
        quantite_utilisee: raw.quantite_utilisee || undefined,
        bouillon_citerne_l: raw.bouillon_citerne_l || undefined,
        nb_citernes: raw.nb_citernes || undefined,
        date_reentree: raw.date_reentree || undefined,
        dar_jours: (raw.dar_jours && raw.dar_jours > 0) ? raw.dar_jours : undefined,
        efficacite: raw.efficacite || "",
        visa_rt: raw.visa_rt || "",
        signe: ["completed", "evaluated", "approved"].includes(t.status),
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FOR.PR6.003_${treatmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur génération PDF:", err);
    } finally {
      pdfLoadingRef.current = false;
    }
  }

  const filtered = treatments.filter(t => {
    const matchStatus = filter === "all" || t.status === filter;
    const matchSearch = !search ||
      (t.parcelleName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      t.operatorName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  async function doTransition(treatmentId: string, newStatus: string) {
    setTransitioning(newStatus);
    setActionError(null);
    try {
      await transitionTreatmentStatus(treatmentId, newStatus);
      await refetch?.();
      // When a treatment is clôturé → show Global GAP certificate banner
      if (newStatus === "completed") {
        const updated = treatments.find(t => t.id === treatmentId);
        if (updated) setCompletedBanner(updated);
      }
    } catch (err) {
      console.error(err);
      setActionError("Échec du changement de statut. Réessayez ou contactez l'administrateur.");
    } finally {
      setTransitioning(null);
    }
  }

  async function doDelete(id: string) {
    setDeleting(true);
    try {
      await deleteTreatment(id);
      setDeleteConfirmId(null);
      if (selectedTreatment?.id === id) setSelectedTreatment(null);
      await refetch?.();
    } catch (err) {
      console.error("Erreur suppression:", err);
      setActionError("Impossible de supprimer ce traitement.");
    } finally {
      setDeleting(false);
    }
  }

  async function exportRegistrePDF() {
    setExportingPdf(true);
    try {
      const now = new Date();
      const mois = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const annee = now.getFullYear();
      const campagne = `${annee - 1}-${annee}`;

      const done = treatments.filter(t => ["completed","evaluated","approved","in_progress"].includes(t.status));

      const entries: RegistreEntry[] = done.map((t, i) => {
        const raw = t as any;
        const prodList: any[] = raw.produits || t.products || [];
        const produitsStr = prodList.map((p: any) =>
          p.nom_commercial || p.productName || p.tradeName || ""
        ).filter(Boolean).join(" + ") || "";

        const darJ = raw.dar_jours || raw.darJours || 21;
        const dateExec = t.executedDate || t.plannedDate || "";
        let dateRecolte = raw.dar_date_recolte_autorisee || "";
        if (!dateRecolte && dateExec) {
          const d = new Date(dateExec);
          d.setDate(d.getDate() + darJ);
          dateRecolte = d.toLocaleDateString("fr-FR");
        }

        return {
          n: i + 1,
          date_application: dateExec ? new Date(dateExec).toLocaleDateString("fr-FR") : "",
          parcelle: t.parcelleName || "",
          cible: raw.cible_maladie || raw.cibleMaladie || "",
          produits: produitsStr,
          dar: darJ ? `${darJ} j` : "",
          date_recolte_permise: dateRecolte,
          quantite_melange: t.volumeBouillie ? `${t.volumeBouillie} L` : "",
          dose: prodList[0]?.dose_hl || (prodList[0]?.dosePerHectare ? `${prodList[0].dosePerHectare} ${prodList[0].unit}/ha` : ""),
          quantite_produit: prodList.map((p: any) =>
            p.quantite_prevue ? `${p.quantite_prevue} ${p.unite||""}` :
            p.quantityUsed    ? `${p.quantityUsed} ${p.unit||""}` : ""
          ).filter(Boolean).join(" + "),
          materiel: raw.materiel || raw.materiel_utilise || "Tracteur",
          operateurs: t.operatorName || raw.operateur_nom || "",
        };
      });

      const blob = await genererRegistreMensuelPDF({
        site: "Domaine Khelifa",
        mois,
        campagne,
        entries,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FOR.PR6.004_Registre_${mois.replace(" ","_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur registre PDF:", err);
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) return <AppLayout><PageSkeleton /></AppLayout>;

  const counts = {
    all: treatments.length,
    draft: treatments.filter(t => t.status === "draft").length,
    pending_approval: treatments.filter(t => t.status === "pending_approval").length,
    approved: treatments.filter(t => t.status === "approved").length,
    planned: treatments.filter(t => t.status === "planned").length,
    in_progress: treatments.filter(t => t.status === "in_progress").length,
    completed: treatments.filter(t => t.status === "completed").length,
    evaluated: treatments.filter(t => t.status === "evaluated").length,
    cancelled: treatments.filter(t => t.status === "cancelled").length,
  };

  return (
    <AppLayout>
      <PageScreen className="!py-8 !overflow-y-auto">
          <PageHero
            eyebrow="PILOTAGE · TRAITEMENTS"
            title="Ordres de traitement"
            lede={`${treatments.length} traitements · ${counts.in_progress} en cours · ${counts.pending_approval} en attente d'approbation`}
            actions={
              <>
                <AdalineButton variant="tertiary" onClick={exportRegistrePDF} disabled={exportingPdf}>
                  {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  Registre FOR.PR6.004
                </AdalineButton>
                <FeatureGate feature="treatments.plan">
                  <AdalineButton variant="primary" onClick={() => setScheduleOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Planifier
                  </AdalineButton>
                </FeatureGate>
              </>
            }
          />

          <div className="space-y-6 max-w-7xl">

          <MagasinierReadOnlyBanner />

          {actionError && (
            <InlineBanner tone="error" onDismiss={() => setActionError(null)}>
              {actionError}
            </InlineBanner>
          )}

          {/* Workflow pipeline */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(["draft", "pending_approval", "approved", "planned", "in_progress", "completed"] as const).map((s, i) => {
              const cfg = STATUS_CONFIG[s];
              const count = counts[s];
              return (
                <div key={s} className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setFilter(filter === s ? "all" : s)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all",
                      filter === s
                        ? "bg-[#203b14]/10 border-[#203b14]/40 text-[#203b14]"
                        : "bg-[#fbfdf6] border-[#e0e5d5] text-[#31200b] hover:text-[var(--color-adaline-ink)]/70"
                    )}
                  >
                    <cfg.icon className="w-3.5 h-3.5" />
                    {cfg.label}
                    {count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                        filter === s ? "bg-[#203b14]/20 text-[#203b14]" : "bg-[var(--color-stone-moss)] text-[var(--color-adaline-ink)]/50"
                      )}>{count}</span>
                    )}
                  </button>
                  {i < 5 && <ArrowRight className="w-3 h-3 text-[var(--color-adaline-ink)]/10 flex-shrink-0" />}
                </div>
              );
            })}
            <div className="ml-auto flex gap-1">
              {(["evaluated", "cancelled"] as const).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(filter === s ? "all" : s)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all",
                      filter === s ? "bg-[var(--color-stone-moss)] border-[var(--color-mist-gray)] text-[var(--color-adaline-ink)]/70" : "border-[#e0e5d5] text-[#31200b] hover:text-[var(--color-adaline-ink)]/50"
                    )}
                  >
                    <cfg.icon className="w-3 h-3" />
                    {cfg.label}
                    {counts[s] > 0 && <span className="text-[10px] opacity-60">{counts[s]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="Rechercher par parcelle ou opérateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input w-full max-w-sm px-4 py-2.5 text-sm rounded-xl"
          />

          {/* Content */}
          <div
            className={cn(
              "grid gap-6",
              selectedTreatment ? "grid-cols-1 lg:grid-cols-7" : "grid-cols-1"
            )}
          >

            {/* List */}
            <div className={cn("space-y-2", selectedTreatment ? "lg:col-span-4" : "col-span-1")}>
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] p-16 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Droplets className="w-8 h-8 text-[var(--color-adaline-ink)]/20" />
                  </div>
                  <div>
                    <p className="text-[var(--color-adaline-ink)]/50 font-semibold">Aucun traitement trouvé</p>
                    <p className="text-xs text-[#31200b] mt-1">
                      {filter !== "all" ? "Changez le filtre ou " : ""}
                      <FeatureGate feature="treatments.plan"><button onClick={() => setScheduleOpen(true)} className="text-[#203b14] hover:underline">planifiez un traitement</button></FeatureGate>
                    </p>
                  </div>
                </div>
              ) : (
                filtered.map(t => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.planned;
                  const StatusIcon = cfg.icon;
                  const isSelected = selectedTreatment?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTreatment(isSelected ? null : t)}
                      className={cn(
                        "rounded-2xl border p-4 cursor-pointer transition-all",
                        isSelected
                          ? "bg-[#203b14]/[0.04] border-[#203b14]/25"
                          : "bg-[#fbfdf6] border-[#e0e5d5] hover:border-white/15"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StatusIcon className={cn("w-4 h-4 flex-shrink-0", cfg.color)} />
                          <span className="text-sm font-bold text-[var(--color-adaline-ink)]/90 truncate">
                            {t.sousParcelleName || t.parcelleName}
                          </span>
                          <span className={cn("badge text-[10px] flex-shrink-0", cfg.badgeClass)}>{cfg.label}</span>
                          <span className="badge badge-neutral text-[10px] hidden sm:inline-flex">
                            {treatmentTypeLabels[t.type] || t.type}
                          </span>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            title="Voir le détail"
                            onClick={() => setSelectedTreatment(isSelected ? null : t)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-stone-moss)] text-[#31200b] hover:text-[var(--color-valley-green)] hover:border-emerald-400/40 hover:bg-emerald-400/10 transition-all"
                          ><Eye className="w-3.5 h-3.5" /></button>
                          <FeatureGate feature="treatments.plan">
                            <button
                              title="Modifier"
                              onClick={() => { setEditTreatment(t); setEditOpen(true); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-stone-moss)] text-[#31200b] hover:text-[#203b14] hover:border-[#203b14]/40 hover:bg-[#203b14]/10 transition-all"
                            ><Pencil className="w-3.5 h-3.5" /></button>
                            <button
                              title="Supprimer"
                              onClick={() => setDeleteConfirmId(t.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-stone-moss)] text-[#31200b] hover:text-[var(--color-valley-green)] hover:border-emerald-400/40 hover:bg-emerald-400/10 transition-all"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </FeatureGate>
                          <ChevronRight className={cn("w-4 h-4 text-[var(--color-adaline-ink)]/30 flex-shrink-0 transition-transform", isSelected && "rotate-90")} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MetaItem icon={<User className="w-3 h-3 text-[#31200b]" />} value={t.operatorName} />
                        <MetaItem icon={<Calendar className="w-3 h-3 text-[#31200b]" />} value={new Date(t.plannedDate).toLocaleDateString("fr-FR")} />
                        <MetaItem icon={<MapPin className="w-3 h-3 text-[var(--color-valley-green)]" />} value={formatHectares(t.areaTreatedHectares)} amber />
                        <MetaItem icon={<FlaskConical className="w-3 h-3 text-[var(--color-valley-green)]" />} value={`${t.products.length} produit${t.products.length !== 1 ? "s" : ""}`} />
                      </div>

                      {t.products.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
                          {t.products.map((p: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] text-[#31200b]">
                              <FlaskConical className="w-2.5 h-2.5 text-[#203b14]" />
                              {p.productName}: <span className="text-[var(--color-adaline-ink)]/60 font-mono">{p.quantityUsed}{p.unit}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {(t.parcelleId || t.id) && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]" onClick={(e) => e.stopPropagation()}>
                          {t.parcelleId && (
                            <Link
                              href={`/trace/${t.parcelleId}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border border-[var(--color-stone-moss)] text-[#31200b] hover:text-[#203b14] hover:border-[#203b14]/30 transition-colors"
                            >
                              <GitBranch className="w-3 h-3" />
                              Traçabilité
                            </Link>
                          )}
                          <Link
                            href="/registre"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border border-[var(--color-stone-moss)] text-[#31200b] hover:text-[var(--color-valley-green)] hover:border-emerald-400/30 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Registre
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Detail panel */}
            {selectedTreatment && (
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] p-5 sticky top-4 space-y-5 max-h-[calc(100vh-120px)] overflow-y-auto">

                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-black text-[var(--color-adaline-ink)]/90">{selectedTreatment.parcelleName}</h3>
                      <p className="text-[10px] text-[#31200b] font-mono mt-0.5">#{selectedTreatment.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    {selectedTreatment.status === "completed" && (
                      <button
                        onClick={() => setTrajectoryOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203b14]/10 border border-[#203b14]/30 text-[#203b14] text-[10px] font-bold uppercase tracking-wider hover:bg-[#203b14]/20 transition-all"
                      >
                        <Play className="w-3 h-3" /> Replay Trajet
                      </button>
                    )}
                  </div>

                  {/* Map preview */}
                  {selectedTreatment.status === "completed" && (
                    <div className="rounded-xl overflow-hidden border border-white/[0.06] h-48 relative group bg-black/40">
                      {loadingTrajectory ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-[#203b14] animate-spin" />
                        </div>
                      ) : selectedTrajectory ? (
                        <>
                          <TractorLiveMap points={[]} trajectory={selectedTrajectory} className="w-full h-full" />
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
                          <button onClick={() => setTrajectoryOpen(true)} className="absolute bottom-2 right-2 glass-button px-2.5 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                            Agrandir
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-adaline-ink)]/20 gap-2">
                          <Navigation className="w-6 h-6" />
                          <span className="text-[10px] uppercase tracking-widest">Aucun tracé GPS</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ══ TRACABILITÉ COMPLÈTE ══ */}
                  {(() => { const t = selectedTreatment as any; return (
                  <>

                  {/* QUI */}
                  <Section label="👤 Qui" icon={<User className="w-3 h-3"/>}>
                    <TRow label="Opérateur" val={t.operatorName || "—"} bold />
                    <TRow label="ID opérateur" val={t.operatorId || "—"} mono />
                    {t.visa_rt && <TRow label="Visa RT" val={t.visa_rt} accent />}
                    {t.efficacite && <TRow label="Efficacité évaluée" val={t.efficacite} />}
                  </Section>

                  {/* QUAND */}
                  <Section label="📅 Quand" icon={<Calendar className="w-3 h-3"/>}>
                    <TRow label="Date planifiée" val={new Date(t.plannedDate).toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"long", year:"numeric" })} />
                    {t.executedDate && (
                      <TRow label="Date réelle" val={new Date(t.executedDate).toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"long", year:"numeric" })}
                        accent={t.executedDate !== t.plannedDate} />
                    )}
                    {t.date_reelle && <TRow label="Date déclarée" val={new Date(t.date_reelle).toLocaleDateString("fr-FR")} />}
                    {t.heure_debut && <TRow label="Heure début" val={t.heure_debut} mono />}
                    {t.heure_fin && <TRow label="Heure fin" val={t.heure_fin} mono />}
                    {t.heure_debut && t.heure_fin && (() => {
                      try {
                        const [h1, m1] = t.heure_debut.split(":").map(Number);
                        const [h2, m2] = t.heure_fin.split(":").map(Number);
                        const dur = (h2 * 60 + m2) - (h1 * 60 + m1);
                        if (dur > 0) return <TRow label="Durée" val={`${Math.floor(dur / 60)}h${String(dur % 60).padStart(2,"0")}`} mono />;
                      } catch {}
                      return null;
                    })()}
                  </Section>

                  {/* OÙ */}
                  <Section label="📍 Où" icon={<MapPin className="w-3 h-3"/>}>
                    <TRow label="Parcelle" val={t.parcelleName || "—"} bold />
                    {t.culture && <TRow label="Culture" val={t.culture} />}
                    {t.variete && <TRow label="Variété" val={t.variete} accent />}
                    <TRow label="Surface traitée" val={formatHectares(t.areaTreatedHectares)} accent />
                    {t.treesCount && <TRow label="Arbres traités" val={String(t.treesCount)} mono />}
                  </Section>

                  {/* COMMENT */}
                  <Section label="⚙️ Comment" icon={<FlaskConical className="w-3 h-3"/>}>
                    <TRow label="Type" val={treatmentTypeLabels[t.type] || t.type} />
                    {t.cible && <TRow label="Cible (ravageur)" val={t.cible} accent />}
                    {t.mode_application && <TRow label="Mode application" val={t.mode_application} />}
                    {t.materiel && <TRow label="Matériel" val={t.materiel} />}
                    {t.vitesse_kmh && <TRow label="Vitesse avancement" val={`${t.vitesse_kmh} km/h`} mono />}
                    {t.pression_bar && <TRow label="Pression service" val={`${t.pression_bar} bar`} mono />}
                    {t.diametre_pastilles_mm && <TRow label="Ø pastilles" val={`${t.diametre_pastilles_mm} mm`} mono />}
                    {t.volumeBouillie && <TRow label="Volume bouillie" val={`${t.volumeBouillie} ${t.volumeBouillieUnit || "L"}`} mono />}
                    {t.bouillon_citerne_l && <TRow label="Vol./citerne" val={`${t.bouillon_citerne_l} L`} mono />}
                    {t.nb_citernes && <TRow label="Nb citernes" val={String(t.nb_citernes)} mono />}
                    {t.quantite_utilisee && <TRow label="Qté totale utilisée" val={String(t.quantite_utilisee)} mono />}
                  </Section>

                  {/* PRODUITS — tracabilité totale: prévu vs réel vs reste */}
                  {(t.products?.length > 0 || t.produitsDetail?.length > 0) && (
                    <div className="pt-3 border-t border-[#e0e5d5]">
                      <p className="text-[10px] text-[#31200b] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <FlaskConical className="w-3 h-3 text-[#203b14]" /> Produits phytosanitaires
                      </p>
                      <div className="space-y-2">
                        {(() => {
                          const prods = (t.products || []).map((p: any) => {
                            const detail = (t.produitsDetail || []).find((d: any) =>
                              d.nom_commercial?.toLowerCase() === p.productName?.toLowerCase() || d.productId === p.productId
                            );
                            return { ...p, matiere_active: detail?.matiere_active || "", dose_hl: detail?.dose_hl || "", quantite_sortir: detail?.quantite_sortir || null, dar_jours: detail?.dar_jours || null };
                          });
                          if (prods.length === 0 && t.produitsDetail?.length > 0) {
                            return (t.produitsDetail || []).map((p: any) => ({
                              productName: p.nom_commercial, matiere_active: p.matiere_active || "", dose_hl: p.dose_hl || "",
                              quantityUsed: null, quantite_sortir: p.quantite_sortir || null, unit: "L", dosePerHectare: null, dar_jours: p.dar_jours
                            }));
                          }
                          return prods;
                        })().map((p: any, i: number) => {
                          const sortir = p.quantite_sortir ? parseFloat(p.quantite_sortir) : null;
                          const used   = p.quantityUsed  ? parseFloat(p.quantityUsed)   : null;
                          const reste  = sortir !== null && used !== null ? (sortir - used) : null;
                          return (
                            <div key={i} className="rounded-xl border border-[#e0e5d5] bg-[#f9fbf5] p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="text-xs font-bold text-[var(--color-adaline-ink)]/90">{p.productName || "—"}</p>
                                  {p.matiere_active && <p className="text-[10px] text-[#31200b] italic">{p.matiere_active}</p>}
                                </div>
                                {p.dar_jours && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">DAR {p.dar_jours}j</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                {p.dosePerHectare && <ProdCell label="Dose/ha" val={`${p.dosePerHectare} ${p.unit || "L"}/ha`} />}
                                {p.dose_hl && <ProdCell label="Dose/hl" val={p.dose_hl} />}
                                {sortir !== null && <ProdCell label="Prévu (sorti)" val={`${sortir} ${p.unit || "L"}`} />}
                                {used !== null && <ProdCell label="Utilisé (réel)" val={`${used} ${p.unit || "L"}`} warn />}
                                {reste !== null && <ProdCell label="Reste stock" val={`${reste >= 0 ? "+" : ""}${reste.toFixed(2)} ${p.unit || "L"}`} good={reste >= 0} bad={reste < 0} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DAR — Délai Avant Récolte */}
                  {(t.dar_jours || t.date_reentree) && (
                    <div className="pt-3 border-t border-[#e0e5d5]">
                      <p className="text-[10px] text-[#31200b] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> DAR & Réentrée
                      </p>
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                        {t.dar_jours && (() => {
                          const refDate = t.executedDate || t.plannedDate;
                          const recolteDate = refDate ? new Date(new Date(refDate).getTime() + t.dar_jours * 86400000) : null;
                          const daysLeft = recolteDate ? Math.ceil((recolteDate.getTime() - Date.now()) / 86400000) : null;
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-amber-700 font-semibold">DAR : {t.dar_jours} jours</span>
                                {recolteDate && (
                                  <span className="text-[9px] font-mono text-amber-600">Récolte autorisée après le {recolteDate.toLocaleDateString("fr-FR")}</span>
                                )}
                              </div>
                              {daysLeft !== null && (
                                <div className={cn("text-[10px] font-bold",
                                  daysLeft > 0 ? "text-amber-700" : "text-emerald-700"
                                )}>
                                  {daysLeft > 0 ? `⏳ Encore ${daysLeft} jour(s) avant récolte autorisée` : "✅ DAR expiré — récolte autorisée"}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        {t.date_reentree && (
                          <div className="text-[10px] text-amber-700">
                            🚧 Réentrée champs : {new Date(t.date_reentree).toLocaleDateString("fr-FR")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {t.parcelleId && (
                      <Link
                        href={`/trace/${t.parcelleId}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-[#203b14]/25 text-[#203b14] hover:bg-[#203b14]/10 transition-colors"
                      >
                        <GitBranch className="w-3 h-3" />
                        Traçabilité parcelle
                      </Link>
                    )}
                    <Link
                      href="/registre"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-[var(--color-valley-green)]/25 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/10 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      Registre phytosanitaire
                    </Link>
                  </div>

                  </> ); })(/* end t=selectedTreatment as any */)}

                  {/* Workflow actions */}
                  <FeatureGate feature="treatments.plan">
                  {WORKFLOW_ACTIONS[selectedTreatment.status] && (
                    <div className="pt-3 border-t border-[#e0e5d5] space-y-2">
                      <p className="text-[10px] text-[#31200b] uppercase tracking-widest">Actions</p>
                      {WORKFLOW_ACTIONS[selectedTreatment.status].map(action => {
                        const ActionIcon = action.icon;
                        const isLoading = transitioning === action.to;
                        return (
                          <button
                            key={action.to}
                            onClick={() => doTransition(selectedTreatment.id, action.to)}
                            disabled={!!transitioning || !canTransition(selectedTreatment.status, action.to)}
                            className={cn(
                              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                              action.to === "approved" || action.to === "in_progress" || action.to === "completed"
                                ? "btn-lf-primary"
                                : action.to === "pending_approval"
                                ? "bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/25"
                                : "bg-white/[0.04] border border-white/[0.08] text-[#31200b] hover:text-[var(--color-adaline-ink)]/70",
                              "disabled:opacity-40 disabled:cursor-not-allowed"
                            )}
                          >
                            {isLoading
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <ActionIcon className="w-4 h-4" />}
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </FeatureGate>

                  {/* Télécharger FOR.PR6.003 */}
                  <div className="pt-3 border-t border-[#e0e5d5]">
                    <button
                      onClick={() => telechargerOrdre(selectedTreatment.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all bg-[var(--color-valley-green)]/15 border border-[var(--color-valley-green)]/30 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/25"
                    >
                      <FileText className="w-4 h-4" />
                      Télécharger FOR.PR6.003
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageScreen>

      <PlanifierTraitementModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSave={() => refetch?.()}
      />
      <EditTraitementModal
        open={editOpen}
        treatment={editTreatment}
        onClose={() => { setEditOpen(false); setEditTreatment(null); }}
        onSaved={async () => { setEditOpen(false); setEditTreatment(null); await refetch?.(); }}
      />
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-adaline-ink)]/90">Supprimer ce traitement ?</p>
                <p className="text-xs text-[#31200b] mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-[var(--color-stone-moss)] text-[#31200b] hover:bg-[var(--color-stone-moss)]/30 transition-colors"
              >Annuler</button>
              <button
                disabled={deleting}
                onClick={() => doDelete(deleteConfirmId)}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedTreatment && (
        <TrajectoryReplayModal
          isOpen={trajectoryOpen}
          onClose={() => setTrajectoryOpen(false)}
          treatmentId={selectedTreatment.id}
          parcelleName={selectedTreatment.parcelleName}
        />
      )}

      {/* ── Global GAP Certificate Banner ── */}
      {completedBanner && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCompletedBanner(null)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl animate-[slide-up_0.25s_ease]"
               style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#fefce8 100%)", border: "1.5px solid #86efac" }}>
            {/* Green header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-[#166534] text-white">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Traitement clôturé ✓</p>
                <p className="text-[11px] text-white/70">{completedBanner.parcelleName} · {new Date(completedBanner.plannedDate).toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => setCompletedBanner(null)} className="ml-auto p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-[13px] font-bold text-[#166534] mb-1">Préparez votre dossier Global GAP</p>
              <p className="text-[11px] text-[#374151] leading-relaxed mb-4">
                Ce traitement est terminé. Générez l'Ordre de Traitement <span className="font-mono font-bold">FOR.PR6.003</span> pour constituer votre certificat de traçabilité phytosanitaire conforme Global GAP.
              </p>

              {/* Checklist */}
              <div className="space-y-1.5 mb-4">
                {[
                  { done: true,  label: "Traitement exécuté & clôturé" },
                  { done: !!(completedBanner as any).operatorName, label: "Opérateur renseigné" },
                  { done: !!(completedBanner as any).areaTreatedHectares, label: "Surface traitée enregistrée" },
                  { done: ((completedBanner as any).products?.length ?? 0) > 0, label: "Produits phytosanitaires enregistrés" },
                  { done: !!(completedBanner as any).dar_jours, label: "DAR (Délai Avant Récolte) défini" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[11px]">
                    <span className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black",
                      item.done ? "bg-emerald-500 text-white" : "bg-amber-100 border border-amber-300 text-amber-600"
                    )}>
                      {item.done ? "✓" : "!"}
                    </span>
                    <span className={item.done ? "text-[#374151]" : "text-amber-700 font-medium"}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => { await telechargerOrdre(completedBanner.id); setCompletedBanner(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#166534] text-white text-sm font-bold hover:bg-[#14532d] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Générer FOR.PR6.003
                </button>
                <button
                  onClick={() => setCompletedBanner(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#d1fae5] text-[#166534] text-sm font-medium hover:bg-[#f0fdf4] transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaItem({ icon, value, amber }: { icon: React.ReactNode; value: string; amber?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className={cn("text-xs truncate", amber ? "text-[var(--color-valley-green)] font-mono" : "text-[#31200b]")}>{value}</span>
    </div>
  );
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pt-3 border-t border-[#e0e5d5]">
      <p className="text-[10px] text-[#31200b] uppercase tracking-widest mb-2 flex items-center gap-1.5 font-semibold">
        <span className="text-[#203b14]">{icon}</span>{label}
      </p>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function TRow({ label, val, accent, bold, mono }: { label: string; val: string; accent?: boolean; bold?: boolean; mono?: boolean }) {
  if (!val || val === "—") return null;
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#f0f2eb] last:border-0">
      <span className="text-[10px] text-[#31200b] shrink-0">{label}</span>
      <span className={cn(
        "text-[11px] text-right max-w-[55%] truncate",
        bold ? "font-bold text-[var(--color-adaline-ink)]/90" : "text-[var(--color-adaline-ink)]/70",
        accent ? "text-[#203b14] font-semibold" : "",
        mono ? "font-mono" : ""
      )}>{val}</span>
    </div>
  );
}

function ProdCell({ label, val, warn, good, bad }: { label: string; val: string; warn?: boolean; good?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-white border border-[#e8edd8] px-2 py-1.5">
      <p className="text-[8.5px] text-[#31200b] font-medium">{label}</p>
      <p className={cn(
        "text-[11px] font-bold font-mono",
        warn ? "text-amber-700" : good ? "text-emerald-700" : bad ? "text-red-600" : "text-[var(--color-adaline-ink)]/80"
      )}>{val}</p>
    </div>
  );
}
