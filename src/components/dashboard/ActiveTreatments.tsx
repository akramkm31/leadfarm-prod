"use client";

import { useTreatments } from "@/hooks/useData";
import type { Treatment } from "@/lib/mock-data";
import { cn, formatHectares } from "@/lib/utils";
import { Droplets, Clock, MapPin, Play, Calendar } from "lucide-react";

export default function ActiveTreatments() {
  const { data: treatmentsRaw } = useTreatments();
  const treatments = (treatmentsRaw || []) as Treatment[];
  const activeTreatments = treatments.filter(
    (t) => t.status === "in_progress" || t.status === "planned"
  );

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/85">Traitements en Cours</h3>
          <p className="text-xs text-white/55 mt-0.5">
            {activeTreatments.filter(t => t.status === "in_progress").length} actif · {activeTreatments.filter(t => t.status === "planned").length} planifiés
          </p>
        </div>
        <div className="status-dot status-active" />
      </div>

      {activeTreatments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Droplets className="w-8 h-8 text-white/35 mb-3" />
          <p className="text-sm text-white/55">Aucun traitement actif</p>
          <p className="text-xs text-white/40 mt-1">
            Les traitements planifiés apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTreatments.slice(0, 4).map((treatment) => (
            <div
              key={treatment.id}
              className={cn(
                "p-4 rounded-xl border transition-all",
                treatment.status === "in_progress"
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-blue-500/10 border-blue-500/20"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "status-dot",
                    treatment.status === "in_progress" ? "status-active" : "status-online"
                  )} />
                  <span className="text-sm font-semibold text-white/85">
                    {treatment.sousParcelleName || treatment.parcelleName}
                  </span>
                </div>
                <span className={cn(
                  "badge text-[10px]",
                  treatment.status === "in_progress" ? "badge-success" : "badge-info"
                )}>
                  {treatment.status === "in_progress" ? (
                    <><Play className="w-3 h-3 mr-1" /> En cours</>
                  ) : (
                    <><Calendar className="w-3 h-3 mr-1" /> Planifié</>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-xs text-white/50">
                    {new Date(treatment.plannedDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-white/50">
                    {formatHectares(treatment.areaTreatedHectares)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.08]">
                <span className="text-[10px] text-white/40">
                  {treatment.products.map(p => p.productName).join(", ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
