"use client";

import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import DashboardPanelModal from "@/components/dashboard/DashboardPanelModal";
import { StatusPill } from "@/components/adaline/PageScreen";
import { Button } from "@/components/ui/button-1";
import { TREATMENT_STATUS_SHORT } from "@/lib/ux-labels";
import { findParcelleByTreatment } from "@/components/map/dashboard-map-utils";
import type { Parcelle } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<string, "treating" | "planned" | "done" | "warn"> = {
  in_progress: "treating",
  planned: "planned",
  completed: "done",
  cancelled: "warn",
  pending_approval: "warn",
};

type Props = {
  open: boolean;
  onClose: () => void;
  treatments: Record<string, unknown>[];
  parcelles: Parcelle[];
  activeTreatmentId: string | null;
  onSelectTreatment: (t: Record<string, unknown>) => void;
};

export default function DashboardTreatmentsPanel({
  open,
  onClose,
  treatments,
  parcelles,
  activeTreatmentId,
  onSelectTreatment,
}: Props) {
  const recent = [...treatments]
    .sort(
      (a, b) =>
        new Date(String(b.plannedDate || b.planned_date || 0)).getTime() -
        new Date(String(a.plannedDate || a.planned_date || 0)).getTime()
    )
    .slice(0, 5);

  return (
    <DashboardPanelModal
      open={open}
      onClose={onClose}
      eyebrow="Planning récent"
      title="Derniers traitements"
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href="/treatments">
            Voir tout
            <ChevronRight className="w-3 h-3" />
          </Link>
        </Button>
      }
    >
      <p className="dash-table-hint text-graphite">
        Cliquez une ligne pour centrer la parcelle sur la carte et ouvrir son historique.
      </p>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Parc.</th>
              <th>Type</th>
              <th className="hidden md:table-cell">Opérateur</th>
              <th>Date</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="!py-6 text-center text-graphite text-sm">
                  Aucun traitement récent.
                </td>
              </tr>
            ) : (
              recent.map((t) => {
                const id = String(t.id);
                const status = String(t.status || "planned");
                const date = t.plannedDate || t.planned_date;
                const selected = activeTreatmentId === id;
                const parc = findParcelleByTreatment(parcelles, t);
                const parcLabel =
                  (t.parcelleName as string) ||
                  parc?.name ||
                  (t.site_name as string) ||
                  "—";
                return (
                  <tr
                    key={id}
                    tabIndex={0}
                    role="button"
                    aria-selected={selected}
                    className={cn(
                      "cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-void/20",
                      selected && "dash-table-row-selected"
                    )}
                    onClick={() => onSelectTreatment(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectTreatment(t);
                      }
                    }}
                  >
                    <td className="font-medium dash-table-parc">
                      <span className="inline-flex items-center gap-1.5 max-w-[140px]">
                        {parc && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 border border-fog-border"
                            style={{ backgroundColor: parc.color || "#203b14" }}
                            aria-hidden
                          />
                        )}
                        <span className="truncate text-void" title={parcLabel}>
                          {parcLabel}
                        </span>
                        {selected && (
                          <MapPin className="w-3 h-3 shrink-0 text-void" aria-hidden />
                        )}
                      </span>
                    </td>
                    <td className="text-void">{String(t.type || "—")}</td>
                    <td className="hidden md:table-cell text-graphite">
                      {String(t.operatorName || t.operator_name || "—")}
                    </td>
                    <td className="text-graphite">
                      {date
                        ? new Date(String(date)).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </td>
                    <td>
                      <StatusPill
                        label={TREATMENT_STATUS_SHORT[status] || status.toUpperCase()}
                        variant={STATUS_PILL[status] || "planned"}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardPanelModal>
  );
}
