"use client";

import { useTreatments } from "@/hooks/useData";
import { treatmentTypeLabels, type Treatment } from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

const statusLabels: Record<string, string> = {
  planned: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const statusBadge: Record<string, string> = {
  planned: "badge-info",
  in_progress: "badge-success",
  completed: "badge-success",
  cancelled: "badge-danger",
};

export default function RecentTreatments() {
  const { data: treatmentsRaw } = useTreatments();
  const treatments = (treatmentsRaw || []) as Treatment[];
  const recent = [...treatments]
    .sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime())
    .slice(0, 6);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/85">Traitements Récents</h3>
          <p className="text-xs text-white/40 mt-0.5">Derniers traitements enregistrés</p>
        </div>
        <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
          Tout voir <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="glass-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Parcelle</th>
              <th>Type</th>
              <th>Opérateur</th>
              <th>Surface</th>
              <th>Date</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="font-mono text-xs text-white/50">{t.id}</span>
                </td>
                <td>
                  <span className="text-white/70 text-sm">
                    {t.sousParcelleName || t.parcelleName}
                  </span>
                </td>
                <td>
                  <span className="text-white/40 text-xs">{treatmentTypeLabels[t.type]}</span>
                </td>
                <td>
                  <span className="text-white/50 text-sm">{t.operatorName}</span>
                </td>
                <td>
                  <span className="text-amber-400 text-xs font-mono">
                    {formatHectares(t.areaTreatedHectares)}
                  </span>
                </td>
                <td>
                  <span className="text-white/40 text-xs">
                    {new Date(t.plannedDate).toLocaleDateString("fr-FR")}
                  </span>
                </td>
                <td>
                  <span className={cn("badge text-[10px]", statusBadge[t.status])}>
                    {statusLabels[t.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
