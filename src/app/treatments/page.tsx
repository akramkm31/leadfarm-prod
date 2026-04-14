"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ScheduleTreatmentModal from "@/components/treatments/ScheduleTreatmentModal";
import { useTreatments, useStockLevels, useParcelles } from "@/hooks/useData";
import { treatmentTypeLabels, type Treatment, type TreatmentStatus, type StockLevel, type Parcelle } from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";
import FertilizerCalculator from "@/components/fertilizer/FertilizerCalculator";
import {
  Droplets,
  Plus,
  Calendar,
  User,
  MapPin,
  FlaskConical,
  Clock,
  CheckCircle,
  Circle,
  Play,
  XCircle,
  ChevronRight,
  Cloud,
  ArrowRight,
  Package,
  Search,
  Thermometer,
  Wind,
  Droplet,
} from "lucide-react";

const statusConfig: Record<TreatmentStatus, { label: string; icon: typeof Play; color: string; badgeClass: string }> = {
  planned: { label: "Planifié", icon: Calendar, color: "text-blue-400", badgeClass: "badge-info" },
  in_progress: { label: "En cours", icon: Play, color: "text-amber-400", badgeClass: "badge-success" },
  completed: { label: "Terminé", icon: CheckCircle, color: "text-green-400", badgeClass: "badge-success" },
  cancelled: { label: "Annulé", icon: XCircle, color: "text-red-400", badgeClass: "badge-danger" },
};

export default function TreatmentsPage() {
  const { data: treatmentsRaw, loading: treatmentsLoading, refetch: refetchTreatments } = useTreatments();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { data: stockLevelsRaw, loading: stockLoading } = useStockLevels();
  const { data: parcellesRaw, loading: parcellesLoading } = useParcelles();
  const treatments = (treatmentsRaw || []) as Treatment[];
  const stockLevels = (stockLevelsRaw || []) as StockLevel[];
  const parcelles = (parcellesRaw || []) as Parcelle[];

  const [filter, setFilter] = useState<TreatmentStatus | "all">("all");
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

  if (treatmentsLoading || stockLoading || parcellesLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  const filtered = treatments.filter((t) => filter === "all" || t.status === filter);

  return (
    <AppLayout>
      <div className="mb-8 bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Traitements</h1>
            <p className="text-sm text-white/60 mt-1">
              {treatments.length} traitements · {treatments.filter(t => t.status === "in_progress").length} en cours
            </p>
          </div>
          <button onClick={() => setScheduleOpen(true)} className="glass-button px-4 py-2.5 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Planifier un traitement
          </button>
        </div>
      </div>

      {/* Flow visualization: Stock → Treatment → Parcelle */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-4">Pipeline: Stock → Traitement → Parcelle</h3>
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/25 flex-1">
              <Package className="w-5 h-5 text-violet-400" />
              <div>
                <span className="text-sm font-semibold text-white/70">Magasin</span>
                <p className="text-[10px] text-white/40">{stockLevels.length} produits en stock</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/20 shrink-0" />
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex-1">
              <Droplets className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-sm font-semibold text-white/70">Traitements</span>
                <p className="text-[10px] text-white/40">{treatments.filter(t => t.status === "in_progress").length} actif · {treatments.filter(t => t.status === "planned").length} planifiés</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/20 shrink-0" />
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex-1">
              <MapPin className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-sm font-semibold text-white/70">Parcelles</span>
                <p className="text-[10px] text-white/40">{parcelles.length} parcelles · {parcelles.reduce((a, p) => a + (p.children?.length || 0), 0)} sous-parcelles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fertilizer Calculator */}
      <div className="mb-6">
        <FertilizerCalculator />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/30 backdrop-blur-md border border-white/10 mb-6 w-fit">
        {(["all", "in_progress", "planned", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              filter === s
                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                : "text-white/40 hover:text-white/60 border-transparent"
            )}
          >
            {s === "all" ? "Tous" : statusConfig[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Treatment list */}
        <div className={cn("space-y-3", selectedTreatment ? "col-span-7" : "col-span-12")}>
          {filtered.length === 0 && (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              {/* Illustrated SVG scene */}
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 border border-white/10 flex items-center justify-center empty-state-icon">
                  <Droplets className="w-14 h-14 text-cyan-400/40" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-400/60" />
                </div>
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/15 to-green-600/10 border border-green-500/15 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-400/50" />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white/80 mb-2">
                {filter !== "all" ? "Aucun traitement avec ce statut" : "Commencez le suivi phytosanitaire"}
              </h3>
              <p className="text-sm text-white/50 max-w-sm mb-8 leading-relaxed">
                {filter !== "all"
                  ? "Aucun traitement ne correspond au filtre sélectionné. Essayez un autre statut ou consultez tous les traitements."
                  : "Planifiez et suivez vos traitements phytosanitaires en temps réel. Associez produits, parcelles et opérateurs pour une traçabilité complète."}
              </p>

              {filter === "all" && (
                <div className="flex flex-col items-center gap-4">
                  <button onClick={() => setScheduleOpen(true)} className="glass-button px-6 py-3 flex items-center gap-2.5 text-sm font-semibold">
                    <Plus className="w-4 h-4" />
                    Planifier un traitement
                  </button>
                  <div className="flex items-center gap-6 text-xs text-white/40">
                    <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Produits</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Parcelles</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Planification</span>
                  </div>
                </div>
              )}
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} className="text-sm text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Voir tous les traitements
                </button>
              )}
            </div>
          )}
          {filtered.map((treatment) => {
            const config = statusConfig[treatment.status];
            const StatusIcon = config.icon;
            const isSelected = selectedTreatment?.id === treatment.id;

            return (
              <div
                key={treatment.id}
                onClick={() => setSelectedTreatment(isSelected ? null : treatment)}
                className={cn(
                  "glass-card p-5 cursor-pointer",
                  isSelected && "border-amber-500/30 bg-amber-500/5",
                  treatment.status === "in_progress" && "border-amber-500/20"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={cn("w-4 h-4", config.color)} />
                    <span className="text-sm font-semibold text-white/85">
                      {treatment.sousParcelleName || treatment.parcelleName}
                    </span>
                    <span className="badge badge-info text-[10px]">
                      {treatmentTypeLabels[treatment.type]}
                    </span>
                    <span className={cn("badge text-[10px]", config.badgeClass)}>
                      {config.label}
                    </span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 text-white/35", isSelected && "rotate-90")} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/50">{treatment.operatorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/55">
                      {new Date(treatment.plannedDate).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400 font-mono">
                      {formatHectares(treatment.areaTreatedHectares)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs text-violet-400 font-mono">
                      {treatment.products.length} produit{treatment.products.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Products consumed */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.08]">
                  {treatment.products.map((p: any, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/55">
                      <FlaskConical className="w-3 h-3 text-cyan-400" />
                      {p.productName}: <span className="text-white/60 font-mono">{p.quantityUsed} {p.unit}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Treatment detail */}
        {selectedTreatment && (
          <div className="col-span-5">
            <div className="glass-card p-6 sticky top-[90px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white/85">Détails du Traitement</h3>
                <span className="font-mono text-xs text-white/35">{selectedTreatment.id}</span>
              </div>

              <div className="space-y-4">
                <DetailRow label="Parcelle" value={selectedTreatment.parcelleName} />
                {selectedTreatment.sousParcelleName && (
                  <DetailRow label="Sous-parcelle" value={selectedTreatment.sousParcelleName} highlight="amber" />
                )}
                <DetailRow label="Type" value={treatmentTypeLabels[selectedTreatment.type]} />
                <DetailRow label="Opérateur" value={selectedTreatment.operatorName} />
                <DetailRow label="Surface traitée" value={formatHectares(selectedTreatment.areaTreatedHectares)} highlight="amber" />
                <DetailRow label="Date planifiée" value={new Date(selectedTreatment.plannedDate).toLocaleDateString("fr-FR")} />
                {selectedTreatment.executedDate && (
                  <DetailRow label="Date exécutée" value={new Date(selectedTreatment.executedDate).toLocaleDateString("fr-FR")} />
                )}
                {selectedTreatment.weatherConditions && (
                  <DetailRow label="Météo" value={selectedTreatment.weatherConditions} />
                )}
                {selectedTreatment.temperature && (
                  <DetailRow label="Température" value={`${selectedTreatment.temperature}°C`} highlight="cyan" />
                )}
                {selectedTreatment.humidity && (
                  <DetailRow label="Humidité" value={`${selectedTreatment.humidity}%`} />
                )}
                {selectedTreatment.windSpeed && (
                  <DetailRow label="Vent" value={`${selectedTreatment.windSpeed} km/h`} />
                )}
                {selectedTreatment.volumeBouillie && (
                  <DetailRow label="Volume bouillie" value={`${selectedTreatment.volumeBouillie} ${selectedTreatment.volumeBouillieUnit || "L"}`} highlight="cyan" />
                )}
                {selectedTreatment.treesCount && (
                  <DetailRow label="Arbres traités" value={selectedTreatment.treesCount.toLocaleString("fr-FR")} />
                )}
              </div>

              {/* Products consumed from stock */}
              <div className="mt-6 pt-4 border-t border-white/[0.1]">
                <h4 className="text-xs font-semibold text-white/55 uppercase tracking-wider mb-3">
                  Produits consommés du stock
                </h4>
                <div className="space-y-2">
                  {selectedTreatment.products.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="text-xs text-white/60">{p.productName}</span>
                          <span className="text-[10px] text-white/40 block">{p.dosePerHectare} {p.unit}/ha</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-red-400 font-mono">
                        -{p.quantityUsed} {p.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="h-8" />
      <ScheduleTreatmentModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={() => refetchTreatments?.()}
      />
    </AppLayout>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: "amber" | "cyan" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
      <span className="text-xs text-white/55">{label}</span>
      <span className={cn(
        "text-sm font-medium",
        highlight === "amber" ? "text-amber-400" :
        highlight === "cyan" ? "text-cyan-400" : "text-white/60"
      )}>
        {value}
      </span>
    </div>
  );
}
