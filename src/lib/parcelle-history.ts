import type { Parcelle } from "@/lib/mock-data";
import { getProp, treatmentsForParcelle, sortTreatmentsByDate } from "@/components/map/dashboard-map-utils";

export type HistoryEventKind =
  | "traitement"
  | "maladie"
  | "recolte"
  | "revenu"
  | "resultat"
  | "satellite"
  | "note";

export type ParcelleHistoryEvent = {
  id: string;
  kind: HistoryEventKind;
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  meta?: Record<string, unknown>;
};

export type ParcelleHistoryBundle = {
  parcelleId: string;
  stats: {
    traitements: number;
    maladies: number;
    recoltes: number;
    surfaceTraiteeHa: number;
    coutTotalDzd: number;
    dernierNdvi?: number | null;
  };
  timeline: ParcelleHistoryEvent[];
  treatments: Record<string, unknown>[];
};

function parseDate(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function buildTimelineFromBundle(
  parcelle: Parcelle,
  treatments: Record<string, unknown>[],
  extras?: {
    evenementsMaladie?: Record<string, unknown>[];
    recoltes?: Record<string, unknown>[];
    revenus?: Record<string, unknown>[];
    resultats?: Record<string, unknown>[];
    satellite?: Record<string, unknown>[];
  }
): ParcelleHistoryEvent[] {
  const events: ParcelleHistoryEvent[] = [];

  for (const t of treatments) {
    const date =
      parseDate(getProp(t, "executedDate", "executed_date")) ||
      parseDate(getProp(t, "plannedDate", "planned_date"));
    if (!date) continue;
    const type = String(getProp(t, "type", "type") || "Traitement");
    events.push({
      id: `trt-${t.id}`,
      kind: "traitement",
      date,
      title: type,
      subtitle: String(getProp(t, "operatorName", "operator_name") || ""),
      status: String(getProp(t, "status", "status") || ""),
      meta: t,
    });
  }

  for (const e of extras?.evenementsMaladie || []) {
    const date = parseDate(e.date_observation);
    if (!date) continue;
    events.push({
      id: `mal-${e.id}`,
      kind: "maladie",
      date,
      title: String(e.maladie_nom || "Observation maladie"),
      subtitle: `Sévérité : ${e.severite}`,
      status: String(e.source || ""),
    });
  }

  for (const r of extras?.recoltes || []) {
    const date = parseDate(r.date_recolte);
    if (!date) continue;
    events.push({
      id: `rec-${r.id}`,
      kind: "recolte",
      date,
      title: "Récolte",
      subtitle: `${r.quantite} ${r.unite}${r.qualite ? ` · qualité ${r.qualite}` : ""}`,
    });
  }

  for (const rev of extras?.revenus || []) {
    const date = parseDate(rev.date_encaissement) || parseDate(rev.created_at);
    if (!date) continue;
    events.push({
      id: `rev-${rev.id}`,
      kind: "revenu",
      date,
      title: "Revenu enregistré",
      subtitle: `${Number(rev.montant_dzd).toLocaleString("fr-FR")} DZD`,
    });
  }

  for (const res of extras?.resultats || []) {
    const date = parseDate(res.date_evaluation) || parseDate(res.created_at);
    if (!date) continue;
    const eff = res.taux_efficacite != null ? `${Math.round(Number(res.taux_efficacite) * 100)}% efficacité` : "";
    events.push({
      id: `res-${res.id}`,
      kind: "resultat",
      date,
      title: "Évaluation post-traitement",
      subtitle: eff,
    });
  }

  for (const s of extras?.satellite || []) {
    const date = parseDate(s.date_acquisition);
    if (!date) continue;
    events.push({
      id: `sat-${s.id}`,
      kind: "satellite",
      date,
      title: "Acquisition satellite",
      subtitle: `NDVI ${s.indice_ndvi ?? "—"} · NDWI ${s.indice_ndwi ?? "—"}`,
    });
  }

  if (parcelle.dateImplantation) {
    const d = parseDate(parcelle.dateImplantation);
    if (d) {
      events.push({
        id: "implant",
        kind: "note",
        date: d,
        title: "Implantation",
        subtitle: parcelle.variete || parcelle.cropType,
      });
    }
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildParcelleHistoryBundle(
  parcelle: Parcelle,
  allTreatments: Record<string, unknown>[],
  extras?: Parameters<typeof buildTimelineFromBundle>[2]
): ParcelleHistoryBundle {
  const treatments = sortTreatmentsByDate(treatmentsForParcelle(allTreatments, parcelle));
  const timeline = buildTimelineFromBundle(parcelle, treatments, extras);

  const surfaceTraiteeHa = treatments.reduce(
    (s, t) => s + Number(getProp(t, "areaTreatedHectares", "area_treated_hectares") ?? 0),
    0
  );
  const coutTotalDzd = treatments.reduce(
    (s, t) => s + Number(getProp(t, "totalCostDZD", "total_cost_dzd") ?? getProp(t, "totalCostDzd", "total_cost_dzd") ?? 0),
    0
  );

  const latestSat = extras?.satellite?.[0];

  return {
    parcelleId: parcelle.id,
    stats: {
      traitements: treatments.length,
      maladies: extras?.evenementsMaladie?.length ?? 0,
      recoltes: extras?.recoltes?.length ?? 0,
      surfaceTraiteeHa,
      coutTotalDzd,
      dernierNdvi: latestSat?.indice_ndvi != null ? Number(latestSat.indice_ndvi) : null,
    },
    timeline,
    treatments,
  };
}

export const KIND_LABELS: Record<HistoryEventKind, string> = {
  traitement: "Traitement",
  maladie: "Maladie",
  recolte: "Récolte",
  revenu: "Revenu",
  resultat: "Résultat",
  satellite: "Satellite",
  note: "Parcelle",
};

export const KIND_COLORS: Record<HistoryEventKind, string> = {
  traitement: "#2d6b3f",
  maladie: "#b45309",
  recolte: "#7c3aed",
  revenu: "#0369a1",
  resultat: "#0d9488",
  satellite: "#4f46e5",
  note: "#64748b",
};
