export const HOME_NAV_LINKS = [
  { href: "#produit", label: "Produit" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#conformite", label: "Conformité" },
  { href: "#stack", label: "Garanties" },
  { href: "#client", label: "Clients" },
] as const;

export const HOME_HERO_META = [
  { value: "247 ha", label: "Surface pilotée" },
  { value: "100 %", label: "Interventions tracées" },
  { value: "0", label: "Saisie papier" },
  { value: "< 2 sem.", label: "Déploiement complet" },
] as const;

export const HOME_TRUST_TILES = [
  { sub: "CERTIFICATION EXPORT", name: "GLOBALG.A.P. IFA v6" },
  { sub: "SÉCURITÉ ALIMENTAIRE", name: "HACCP / ISO 22000" },
  { sub: "DÉLAI AVANT RÉCOLTE", name: "Zéro dépassement DAR" },
  { sub: "INDICE DE FRÉQUENCE", name: "IFT suivi & déclaré" },
  { sub: "CAHIER DE CULTURE", name: "Opposable à l'auditeur" },
  { sub: "DONNÉES & CONFIDENTIALITÉ", name: "Conformité RGPD native" },
] as const;

export type HomeFeature = {
  num: string;
  title: string;
  desc: string;
  featured?: boolean;
  tag?: string;
  icon: "map" | "layers" | "chart" | "wifi" | "sun" | "shield";
};

export const HOME_FEATURES: HomeFeature[] = [
  {
    featured: true,
    tag: "PILOTAGE",
    num: "01 · LA CARTE DE L'EXPLOITATION",
    title: "L'exploitation sous contrôle, d'un seul regard.",
    desc: "Constituez votre parcellaire réglementaire directement sur le terrain. Supervisez chaque passage en temps réel — débit, vitesse, progression. En cas de conditions défavorables, LeadFarm suspend l'opération avant tout incident de traitement.",
    icon: "map",
  },
  {
    num: "02 · MÉMOIRE TOTALE",
    title: "Un historique inaltérable, opposable en audit.",
    desc: "Chaque modification — surface, variété, dose, opérateur, date — est conservée dans sa version originale. Rien ne peut être effacé ni altéré. L'auditeur consulte exactement la donnée que vous avez produite, sans possibilité de contestation.",
    icon: "layers",
  },
  {
    num: "03 · REGISTRES OFFICIELS",
    title: "Cahier de culture généré à la clôture de chaque intervention.",
    desc: "L'ordre de traitement réglementaire est édité automatiquement en fin de séance : produit homologué, dose appliquée, opérateur signataire, conditions météorologiques consignées. Prêt pour l'archivage ou la remise au contrôleur.",
    icon: "chart",
  },
  {
    num: "04 · SURVEILLANCE EN CONTINU",
    title: "Les conditions de traitement validées avant chaque passage.",
    desc: "Température, humidité, pluviométrie, vent — les paramètres agro-météorologiques de chaque parcelle sont vérifiés en continu. Planifiez les interventions dans les fenêtres favorables et réduisez le nombre de reprises.",
    icon: "wifi",
  },
  {
    num: "05 · VEILLE PHYTOSANITAIRE",
    title: "La pression parasitaire détectée avant l'apparition des symptômes.",
    desc: "L'état sanitaire de vos vergers est évalué chaque semaine par imagerie satellitaire. Une anomalie foliaire photographiée sur le terrain est identifiée en quelques secondes — mildiou, tavelure, oïdium — avant toute propagation.",
    icon: "sun",
  },
  {
    num: "06 · SOUVERAINETÉ DES DONNÉES",
    title: "Vos données restent votre propriété exclusive.",
    desc: "Chaque exploitation dispose de son propre espace cloisonné. Aucune donnée ne transite vers un domaine tiers, aucune analyse agrégée n'est réalisée sans votre accord. Export intégral disponible à tout moment, sans délai.",
    icon: "shield",
  },
];

export const HOME_SHOWCASE_CALLOUTS = [
  {
    num: "01",
    title: "Récapitulatif opérationnel du jour",
    desc: "Les interventions prioritaires, les fenêtres météo favorables et les alertes de stock — réunis en une seule vue, sans recherche.",
  },
  {
    num: "02",
    title: "Indicateurs de performance clés",
    desc: "Surface traitée, produits consommés, réserve de stock, état des parcelles — lisibles d'un coup d'œil depuis le bureau ou le terrain.",
  },
  {
    num: "03",
    title: "Cartographie en temps réel",
    desc: "Vue d'ensemble de l'exploitation avec position des équipements actifs et accès immédiat à la fiche réglementaire de chaque parcelle.",
  },
  {
    num: "04",
    title: "Alertes opérationnelles priorisées",
    desc: "Risques sanitaires, conditions défavorables, dépassements de seuil — les décisions urgentes remontent automatiquement, sans délai.",
  },
] as const;

export const HOME_HOW_STEPS = [
  {
    num: "01",
    title: "Constituez le parcellaire réglementaire",
    desc: "Délimitez vos parcelles depuis le bureau ou directement sur le terrain. Les surfaces sont calculées et enregistrées automatiquement dans le registre officiel.",
  },
  {
    num: "02",
    title: "Validez le plan de traitement",
    desc: "Sélectionnez le produit homologué, saisissez la dose et désignez l'opérateur. LeadFarm vérifie le délai avant récolte, la disponibilité du stock et les conditions météorologiques prévues.",
  },
  {
    num: "03",
    title: "Supervisez l'intervention en cours",
    desc: "L'équipement transmet sa position et son débit en continu. Une alerte agro-météorologique suspend automatiquement l'opération si les conditions deviennent défavorables.",
  },
  {
    num: "04",
    title: "Clôturez et archivez le registre",
    desc: "En fin de séance, le cahier de culture est généré, signé par l'opérateur et archivé immédiatement. L'auditeur le consulte à tout moment sans délai supplémentaire.",
  },
] as const;

export const HOME_STACK_CELLS = [
  { role: "PROPRIÉTÉ DES DONNÉES", name: "Vous restez propriétaire", meta: "Export intégral à tout moment, sans condition" },
  { role: "CLOISONNEMENT", name: "Isolation stricte par exploitation", meta: "Aucune donnée partagée entre domaines" },
  { role: "DISPONIBILITÉ", name: "99,9 % garantie", meta: "Sauvegarde quotidienne automatisée" },
  { role: "USAGE TERRAIN", name: "Conçu pour le terrain", meta: "Fonctionnel en réseau dégradé ou hors connexion" },
  { role: "TRAÇABILITÉ", name: "Historique complet et inaltérable", meta: "Aucune modification n'est effacée — jamais" },
  { role: "CONFIDENTIALITÉ", name: "Conformité RGPD native", meta: "Protection intégrale des données opérateurs" },
  { role: "ACCESSIBILITÉ", name: "Français & arabe", meta: "Interface adaptée à chaque équipe de terrain" },
  { role: "DÉPLOIEMENT", name: "Accompagnement sur site", meta: "Chef d'exploitation et opérateurs formés en 2 jours" },
  { role: "SUPPORT", name: "Réponse sous 4 heures", meta: "Assistance active le jour des inspections" },
  { role: "INTEROPÉRABILITÉ", name: "Sans verrouillage propriétaire", meta: "Données exportables dans les formats standards" },
] as const;

export const HOME_CUSTOMER_STATS = [
  { value: "247", label: "Hectares pilotés" },
  { value: "38", label: "Parcelles cartographiées" },
  { value: "100 %", label: "Interventions tracées" },
  { value: "8 j", label: "Mise en service" },
] as const;

export const HOME_CTA_SIDE = [
  { title: "Déploiement guidé", desc: "PARCELLAIRE + MIGRATION REGISTRES · 8 JOURS" },
  { title: "Formation sur site", desc: "CHEF D'EXPLOITATION + OPÉRATEURS TERRAIN" },
  { title: "Accompagnement audit", desc: "PRÉSENT LE JOUR DE L'INSPECTION" },
] as const;

export const HOME_FOOTER_LINKS = {
  product: [
    { href: "#fonctionnalites", label: "Fonctionnalités" },
    { href: "#stack", label: "Garanties" },
    { href: "#produit", label: "Démo en ligne" },
    { href: "/dashboard", label: "Ouvrir l'application" },
  ],
  guarantees: [
    { href: "#conformite", label: "GLOBALG.A.P. IFA v6" },
    { href: "#conformite", label: "HACCP / ISO 22000" },
    { href: "#conformite", label: "Cahier de culture réglementaire" },
    { href: "#stack", label: "Vos données vous appartiennent" },
  ],
  contact: [
    { href: "mailto:contact@leadfarm.dz", label: "contact@leadfarm.dz" },
    { href: "#", label: "Sidi Bel Abbès · DZ" },
    { href: "#", label: "LinkedIn" },
    { href: "#cta", label: "Demander une démo" },
  ],
} as const;
