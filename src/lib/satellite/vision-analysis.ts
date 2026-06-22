export type SatelliteVisionZone = {
  label: string;
  ndvi: number;
  etat: string;
  anomalie: string | null;
};

export type SatelliteVisionAnalysis = {
  ndvi: number;
  ndwi: number;
  evi: number;
  savi: number;
  ndre: number;
  etat_global: string;
  couverture_vegetale_pct: number;
  zones: SatelliteVisionZone[];
  stress_hydrique: string;
  stress_nutritionnel: string;
  note_fr: string;
  action_fr: string;
  alerte: string | null;
};

const ETAT_COLORS: Record<string, { bg: string; color: string }> = {
  Excellent: { bg: "#dcfce7", color: "#166534" },
  Bon: { bg: "#d1fae5", color: "#047857" },
  Moyen: { bg: "#fef3c7", color: "#b45309" },
  Stressé: { bg: "#ffedd5", color: "#c2410c" },
  Critique: { bg: "#fee2e2", color: "#b91c1c" },
};

export function etatStyle(etat: string) {
  return ETAT_COLORS[etat] ?? { bg: "#f3f4f6", color: "#374151" };
}
