"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { MagasinierPage } from "@/components/magasinier/MagasinierBranch";
import MagReportsPage from "@/components/magasinier/pages/MagReportsPage";
import { useTreatments } from "@/hooks/useData";
import { treatmentTypeLabels, type Treatment } from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  FileText,
  Download,
  Printer,
  Shield,
  CheckCircle,
  Search,
  ExternalLink,
} from "lucide-react";
import { genererOrdreTraitementPDF } from "@/lib/pdf/ordreTraitement";

const typeColors: Record<string, string> = {
  pulverisation: "border-l-cyan-400",
  fertilisation: "border-l-green-400",
  desherbage: "border-l-amber-400",
  semis: "border-l-violet-400",
};

export default function ReportsPage() {
  const { profile } = useAccessContext();
  if (profile?.role === "magasinier") {
    return <MagasinierPage mag={MagReportsPage} />;
  }
  return <ReportsContent />;
}

function ReportsContent() {
  const { data: treatmentsRaw, loading } = useTreatments();
  const treatments = (treatmentsRaw || []) as any[];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportError, setExportError] = useState("");

  const buildPdfBlob = (treatment: any) =>
    genererOrdreTraitementPDF({
      site: "Domaine Khelifa",
      n_traitement: treatment.id,
      date_prevue: treatment.plannedDate,
      date_reelle: treatment.dateReelle ?? treatment.executedDate ?? undefined,
      parcelle_nom: treatment.parcelleName,
      superficie_ha: treatment.areaTreatedHectares,
      culture: treatment.culture || "",
      variete: treatment.variete || "",
      cible: treatment.cible || "",
      mode_application: treatment.modeApplication || "",
      materiel_utilise: treatment.materiel || "",
      operateur_nom: treatment.operatorName,
      heure_debut: treatment.heureDebut ?? undefined,
      heure_fin: treatment.heureFin ?? undefined,
      vitesse_avancement_kmh: treatment.vitesseKmh ?? undefined,
      pression_service_bar: treatment.pressionBar ?? undefined,
      dar_jours: treatment.darJours ?? undefined,
      date_reentree: treatment.dateReentree ?? undefined,
      visa_rt: treatment.visaRt || "",
      efficacite: treatment.efficacite || "",
      produits: treatment.products.map((p: any) => ({
        nom_commercial: p.productName,
        matiere_active: "",
        dose_hl: p.dosePerHectare ? `${p.dosePerHectare} L/ha` : "",
        quantite_sortir: p.quantityUsed != null ? `${p.quantityUsed} ${p.unit}` : "",
      })),
      signe: true,
    });

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async (treatment: any) => {
    setDownloading(treatment.id);
    setExportError("");
    try {
      const blob = await buildPdfBlob(treatment);
      downloadBlob(blob, `FOR_PR6_003_${treatment.id}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setExportError("Erreur lors de la génération du PDF.");
    } finally {
      setDownloading(null);
    }
  };

  const handleExportAll = async (list: any[]) => {
    if (!list.length) return;
    setExportingAll(true);
    setExportError("");
    try {
      for (const treatment of list) {
        const blob = await buildPdfBlob(treatment);
        downloadBlob(blob, `FOR_PR6_003_${treatment.id}.pdf`);
      }
    } catch (error) {
      console.error("Failed to export all PDFs:", error);
      setExportError("Erreur lors de l'export groupé. Certaines fiches n'ont pas été générées.");
    } finally {
      setExportingAll(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  const completedTreatments = treatments.filter((t) => {
    if (t.status !== "completed") return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.parcelleName.toLowerCase().includes(q) || t.operatorName.toLowerCase().includes(q) || t.products.some((p: any) => p.productName.toLowerCase().includes(q));
    }
    return true;
  });

  const typeFilters = [
    { value: "all", label: "Tous" },
    { value: "pulverisation", label: "Pulvérisation" },
    { value: "fertilisation", label: "Fertilisation" },
    { value: "desherbage", label: "Désherbage" },
  ];

  return (
    <AppLayout>
      <div className="lf-page-header mb-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[var(--green-010)] blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--green-010)] border border-[var(--green-020)] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--interactive-green)]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">Rapports & Traçabilité</h1>
              <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
                Registre phytosanitaire — fiches de traçabilité conformes (GLOBALG.A.P.)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportAll(completedTreatments)}
              disabled={exportingAll || completedTreatments.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--surface-pure)] border border-[var(--black-008)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--black-004)] transition-all shadow-sm disabled:opacity-50"
            >
              {exportingAll ? (
                <div className="w-4 h-4 border-2 border-[var(--interactive-green)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {exportingAll ? "Export en cours…" : `Exporter tout (${completedTreatments.length})`}
            </button>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {exportError}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
            placeholder="Rechercher parcelle, opérateur, produit..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--black-008)] bg-[var(--surface-pure)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-020)] transition-all"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--black-004)] border border-[var(--black-008)]">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                typeFilter === f.value
                  ? "bg-[var(--surface-pure)] text-[var(--interactive-green)] shadow-sm border border-[var(--black-008)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 mb-6 rounded-[var(--radius-apple)] border border-[var(--green-010)] bg-[var(--green-010)]/20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--green-010)] border border-[var(--green-020)] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[var(--leaf-green)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[var(--leaf-green)]">Conformité Phytosanitaire</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Toutes les fiches de traçabilité sont conformes aux exigences du Ministère de l&apos;Agriculture.
              Chaque enregistrement est horodaté et lié au stock consommé.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-[var(--surface-pure)] px-3 py-1.5 rounded-full border border-[var(--green-020)]">
            <CheckCircle className="w-3.5 h-3.5 text-[var(--leaf-green)]" />
            <span className="text-[11px] font-bold text-[var(--leaf-green)]">{completedTreatments.length} fiches conformes</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {completedTreatments.map((treatment) => (
          <div key={treatment.id} className="p-4 rounded-[var(--radius-apple)] border border-[var(--black-008)] bg-[var(--surface-pure)] hover:border-[var(--green-020)] transition-all shadow-sm group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--black-004)] border border-[var(--black-008)] flex items-center justify-center group-hover:bg-[var(--green-010)] group-hover:border-[var(--green-020)] transition-colors">
                  <FileText className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--interactive-green)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Fiche de traçabilité — {treatment.sousParcelleName || treatment.parcelleName}
                  </h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-[var(--text-tertiary)] font-bold">{treatment.id}</span>
                    <span className="text-[10px] text-[var(--black-012)]">·</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                      {treatment.executedDate
                        ? new Date(treatment.executedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                        : new Date(treatment.plannedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="text-[10px] text-[var(--black-012)]">·</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--black-004)] border border-[var(--black-008)] text-[var(--text-tertiary)] font-bold">
                      {treatmentTypeLabels[treatment.type]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden lg:flex items-center gap-8">
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text-tertiary)] block font-bold">Opérateur</span>
                    <span className="text-xs text-[var(--text-primary)] font-medium">{treatment.operatorName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text-tertiary)] block font-bold">Produits</span>
                    <span className="text-xs text-[var(--text-primary)] font-medium max-w-[120px] truncate block">
                      {treatment.products.map((p: any) => p.productName).join(", ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text-tertiary)] block font-bold">Surface</span>
                    <span className="text-xs text-[var(--interactive-green)] font-bold">{formatHectares(treatment.areaTreatedHectares)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--green-010)]/50 border border-[var(--green-010)] text-[var(--leaf-green)] font-bold text-[10px]">
                    <CheckCircle className="w-3 h-3" />
                    CONFORME
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(treatment)}
                    disabled={downloading === treatment.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--black-004)] border border-[var(--black-008)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--green-010)] hover:text-[var(--interactive-green)] hover:border-[var(--green-020)] transition-all disabled:opacity-50"
                  >
                    {downloading === treatment.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-[var(--interactive-green)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    PDF
                  </button>
                  <button className="p-2 rounded-xl border border-transparent hover:border-[var(--black-008)] hover:bg-[var(--black-004)] transition-all">
                    <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {completedTreatments.length === 0 && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-10 h-10 text-[var(--color-adaline-ink)]/35 mb-3" />
          <p className="text-sm text-[var(--color-adaline-ink)]/55">Aucun rapport disponible</p>
          <p className="text-xs text-[var(--color-adaline-ink)]/35 mt-1">
            Les rapports sont générés automatiquement à la fin de chaque traitement
          </p>
        </div>
      )}
      <div className="h-8" />
    </AppLayout>
  );
}
