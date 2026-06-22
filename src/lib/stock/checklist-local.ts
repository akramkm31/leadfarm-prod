export type ChecklistSeverity = "standard" | "critical" | "warning";

export type ChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  severity: ChecklistSeverity;
};

export type ChecklistSection = {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
};

/** MOP.PR6.001 — 19 points obligatoires du local phytosanitaire */
export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "stockage",
    title: "Conditions de stockage",
    description: "Intégrité des produits et environnement du local",
    items: [
      { id: "emballage_origine", label: "Produits dans leur emballage d'origine", severity: "standard" },
      { id: "pas_liquides_dessus", label: "Liquides stockés sous les poudres/granulés", hint: "Les liquides ne doivent jamais être au-dessus des solides", severity: "standard" },
      { id: "etiquette_origine", label: "Étiquette d'origine lisible sur chaque produit", severity: "standard" },
      { id: "abri_gel_lumiere", label: "À l'abri du gel et de la lumière directe", severity: "standard" },
      { id: "local_sec", label: "Local sec, ventilé et propre", severity: "standard" },
      { id: "ferme_cle", label: "Local fermé à clé en permanence", severity: "critical" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure & équipements",
    description: "Sol, électricité, rayonnage et eau",
    items: [
      { id: "sol_retention", label: "Sol imperméable avec cuvette de rétention", severity: "critical" },
      { id: "installation_elec", label: "Installation électrique conforme et éclairage suffisant", severity: "standard" },
      { id: "etageres_metal", label: "Étagères en métal (matériau non absorbant)", severity: "standard" },
      { id: "eau_courante", label: "Eau courante disponible à proximité", severity: "standard" },
    ],
  },
  {
    id: "securite",
    title: "Sécurité & urgence",
    description: "EPI, absorbants, consignes et extinction",
    items: [
      { id: "zone_epi", label: "Zone EPI séparée + trousse de premiers secours", severity: "standard" },
      { id: "matieres_absorbantes", label: "Matières absorbantes, pelle et sacs plastiques", severity: "standard" },
      { id: "consignes_affiches", label: "Consignes de sécurité et numéros d'urgence affichés", severity: "standard" },
      { id: "extincteur", label: "Extincteur poudre ABC accessible et vérifié", severity: "critical" },
      { id: "panneau_porte", label: "Panneau « Interdit aux non-autorisés » sur la porte", severity: "standard" },
    ],
  },
  {
    id: "produits_risque",
    title: "Produits à risque élevé",
    description: "Séparation T/T+, CMR, acides/bases et comburants",
    items: [
      { id: "t_tplus_isoles", label: "Produits T et T+ isolés et fermés à clé", severity: "critical" },
      { id: "cmr_separes", label: "Produits CMR (R40/R62/R63/R68) sur étagères séparées", severity: "warning" },
      { id: "acides_bases_sep", label: "Acides et bases corrosives dans bacs séparés", severity: "warning" },
      { id: "comburants_sep", label: "Comburants et inflammables séparés des autres produits", severity: "warning" },
    ],
  },
];

export const CHECKLIST_ITEMS = CHECKLIST_SECTIONS.flatMap((s) => s.items);

export const CHECKLIST_TOTAL = CHECKLIST_ITEMS.length;

export function scoreFromReponses(reponses: Record<string, boolean>): number {
  if (CHECKLIST_TOTAL === 0) return 0;
  const checked = CHECKLIST_ITEMS.filter((i) => reponses[i.id]).length;
  return Math.round((checked / CHECKLIST_TOTAL) * 100);
}

export type ScoreStatus = "conforme" | "attention" | "non_conforme";

export function scoreStatus(score: number): ScoreStatus {
  if (score >= 90) return "conforme";
  if (score >= 70) return "attention";
  return "non_conforme";
}

export const SCORE_META: Record<
  ScoreStatus,
  { label: string; badge: string; bar: string; text: string; border: string }
> = {
  conforme: {
    label: "Conforme",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    border: "border-emerald-200 bg-emerald-50/80",
  },
  attention: {
    label: "Améliorations nécessaires",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-700",
    border: "border-amber-200 bg-amber-50/80",
  },
  non_conforme: {
    label: "Non conforme",
    badge: "bg-red-50 text-red-800 border-red-200",
    bar: "bg-red-500",
    text: "text-red-700",
    border: "border-red-200 bg-red-50/80",
  },
};

export const SEVERITY_META: Record<
  ChecklistSeverity,
  { label: string; dot: string; ring: string }
> = {
  standard: { label: "Standard", dot: "bg-slate-400", ring: "border-[var(--color-stone-moss)]" },
  warning: { label: "Séparation", dot: "bg-amber-500", ring: "border-amber-300" },
  critical: { label: "Critique", dot: "bg-red-500", ring: "border-red-300" },
};
