"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTreatments } from "@/hooks/useData";
import { treatmentTypeLabels } from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import { ChevronRight, ArrowUpRight, CheckCircle2, AlertCircle, Play, Eye, Clock, MapPin } from "lucide-react";

const statusLabels: Record<string, string> = {
  planned: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

type StatusStyle = {
  badge: string;
  dot: string;
  icon: typeof CheckCircle2;
};

const statusStyles: Record<string, StatusStyle> = {
  completed: {
    badge: "bg-[var(--color-forest-dew)] text-[var(--color-valley-green)] border-[var(--color-valley-green)]/20",
    dot: "bg-[var(--color-valley-green)]",
    icon: CheckCircle2,
  },
  in_progress: {
    badge: "bg-[rgba(74,50,18,0.06)] text-[var(--color-amber-seed)] border-[rgba(74,50,18,0.15)]",
    dot: "bg-[var(--color-amber-seed)] animate-pulse",
    icon: Play,
  },
  planned: {
    badge: "bg-[var(--color-stone-moss)]/55 text-[var(--color-adaline-ink)]/75 border-[var(--color-stone-moss)]",
    dot: "bg-[var(--color-adaline-ink)]/40",
    icon: Clock,
  },
  cancelled: {
    badge: "bg-red-500/10 text-red-600 border-red-500/20",
    dot: "bg-red-600",
    icon: AlertCircle,
  },
};

interface RecentTreatmentsProps {
  activeTreatmentId?: string | null;
  onSelectTreatment?: (id: string | null) => void;
}

export default function RecentTreatments({
  activeTreatmentId,
  onSelectTreatment,
}: RecentTreatmentsProps) {
  const router = useRouter();
  const { data: treatmentsRaw } = useTreatments();
  const treatments = (treatmentsRaw || []) as any[];
  
  const recent = [...treatments]
    .sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime())
    .slice(0, 5);

  const handleRowClick = (t: any) => {
    if (!onSelectTreatment) return;
    if (activeTreatmentId === t.id) {
      onSelectTreatment(null); // Deselect
    } else {
      onSelectTreatment(t.id); // Select
    }
  };

  return (
    <div className="rounded-[var(--radius-apple)] border border-[var(--color-stone-moss)] bg-[var(--surface-pure)] p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--color-stone-moss)]">
        <div>
          <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/65 uppercase tracking-widest">
            Traitements Récents
          </h3>
          <p className="text-[10px] text-[var(--text-tertiary)]/80 font-medium mt-0.5">
            Derniers rapports · Cliquez sur un traitement pour le localiser sur la carte et afficher son historique
          </p>
        </div>
        <button
          onClick={() => router.push("/treatments")}
          className="group text-[10px] font-bold text-[var(--color-valley-green)] hover:opacity-80 transition-all flex items-center gap-0.5"
        >
          Tout voir
          <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Modern Low-Density Datagrid */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-stone-moss)]">
              <th className="pb-3 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]/80">
                Parcelle
              </th>
              <th className="pb-3 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]/80">
                Type
              </th>
              <th className="pb-3 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]/80">
                Opérateur
              </th>
              <th className="pb-3 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]/80">
                Surface
              </th>
              <th className="pb-3 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]/80">
                Planification
              </th>
              <th className="pb-3 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]/80">
                Statut
              </th>
              <th className="pb-3 w-px" aria-label="Traçabilité" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-stone-moss)]/40">
            {recent.map((t) => {
              const statusStyle = statusStyles[t.status] || statusStyles.planned;
              const StatusIcon = statusStyle.icon;
              const isSelected = activeTreatmentId === t.id;

              return (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t)}
                  className={cn(
                    "group transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "bg-[var(--color-forest-dew)]/30 hover:bg-[var(--color-forest-dew)]/40"
                      : "hover:bg-[var(--color-canvas-ice)]/50"
                  )}
                >
                  {/* Parcelle Name */}
                  <td className="py-4.5 pr-4 relative">
                    {/* Visual active border anchor */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-valley-green)]" />
                    )}
                    <div className="flex flex-col min-w-0 pl-1">
                      <span className="text-xs font-bold text-[var(--color-adaline-ink)] flex items-center gap-1">
                        {t.sousParcelleName || t.parcelleName}
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[var(--color-valley-green)] text-[8px] font-bold text-white tracking-widest uppercase animate-pulse">
                            <MapPin className="w-2 h-2" /> Cartographié
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-tertiary)]/65 mt-0.5 truncate max-w-[150px]">
                        ID: {String(t.id).substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </td>

                  {/* Treatment Type */}
                  <td className="py-4.5 pr-4">
                    <span className="text-xs font-medium text-[var(--text-secondary)]/90">
                      {treatmentTypeLabels[t.type] || t.type}
                    </span>
                  </td>

                  {/* Operator */}
                  <td className="py-4.5 pr-4">
                    <span className="text-xs font-medium text-[var(--text-secondary)]/70">
                      {t.operatorName || "Non spécifié"}
                    </span>
                  </td>

                  {/* Surface area (ha) */}
                  <td className="py-4.5 pr-4">
                    <span className="text-xs font-bold font-mono text-[var(--color-valley-green)]">
                      {formatHectares(t.areaTreatedHectares)}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-4.5 pr-4">
                    <span className="text-xs font-medium font-mono text-[var(--text-tertiary)]/85">
                      {new Date(t.plannedDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="py-4.5 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        statusStyle.badge
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusLabels[t.status] || t.status}
                    </span>
                  </td>

                  {/* Trace button link */}
                  <td className="py-4.5 pl-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/trace/${t.sousParcelleId || t.parcelleId}`}
                      className="inline-flex items-center justify-center p-2 rounded-xl border border-[var(--color-stone-moss)] bg-white/60 text-[var(--color-valley-green)] opacity-70 hover:opacity-100 hover:border-[var(--color-valley-green)] hover:bg-[var(--color-canvas-ice)] shadow-sm transition-all duration-300 hover:scale-105"
                      title="Traçabilité parcelle"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
