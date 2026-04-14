"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
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
} from "lucide-react";

const typeColors: Record<string, string> = {
  pulverisation: "border-l-cyan-400",
  fertilisation: "border-l-green-400",
  desherbage: "border-l-amber-400",
  semis: "border-l-violet-400",
};

export default function ReportsPage() {
  const { data: treatmentsRaw, loading } = useTreatments();
  const treatments = (treatmentsRaw || []) as Treatment[];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
      return t.parcelleName.toLowerCase().includes(q) || t.operatorName.toLowerCase().includes(q) || t.products.some(p => p.productName.toLowerCase().includes(q));
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
      <div className="mb-8 bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Rapports & Traçabilité</h1>
            <p className="text-sm text-white/60 mt-1">
              Registre phytosanitaire — fiches de traçabilité conformes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="glass-button px-4 py-2.5 flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" />
              Exporter tout (PDF)
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
            placeholder="Rechercher parcelle, opérateur, produit..."
            className="glass-input pl-9 pr-4 py-2 text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                typeFilter === f.value
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                  : "text-white/55 hover:text-white/60 border-transparent hover:bg-white/[0.04]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 mb-6 border-green-500/25 bg-green-600/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-500/25 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-green-400">Conformité Phytosanitaire</h3>
            <p className="text-xs text-white/55 mt-1">
              Toutes les fiches de traçabilité sont conformes aux exigences du Ministère de l&apos;Agriculture.
              Chaque enregistrement est horodaté et lié au stock consommé.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">{completedTreatments.length} fiches conformes</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {completedTreatments.map((treatment) => (
          <div key={treatment.id} className={cn("glass-card p-5 border-l-[3px]", typeColors[treatment.type] || "border-l-white/20")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white/55" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/85">
                    Fiche de traçabilité — {treatment.sousParcelleName || treatment.parcelleName}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-white/55 font-mono">{treatment.id}</span>
                    <span className="text-[10px] text-white/55">·</span>
                    <span className="text-[10px] text-white/55">
                      {treatment.executedDate
                        ? new Date(treatment.executedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                        : new Date(treatment.plannedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="text-[10px] text-white/55">·</span>
                    <span className="text-[10px] text-white/55">{treatmentTypeLabels[treatment.type]}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-white/55 block">Opérateur</span>
                    <span className="text-xs text-white/50">{treatment.operatorName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/55 block">Produits</span>
                    <span className="text-xs text-white/50">{treatment.products.map(p => p.productName).join(", ")}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/55 block">Surface</span>
                    <span className="text-xs text-amber-400 font-mono">{formatHectares(treatment.areaTreatedHectares)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="badge badge-success text-[10px]">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Conforme
                  </span>
                  <button className="glass-button px-3 py-2 flex items-center gap-1.5 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {completedTreatments.length === 0 && (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-10 h-10 text-white/35 mb-3" />
          <p className="text-sm text-white/55">Aucun rapport disponible</p>
          <p className="text-xs text-white/35 mt-1">
            Les rapports sont générés automatiquement à la fin de chaque traitement
          </p>
        </div>
      )}
      <div className="h-8" />
    </AppLayout>
  );
}
