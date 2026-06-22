import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  MapPin,
  Package,
  ShieldCheck,
  SprayCan,
  UserCircle,
  Warehouse,
} from "lucide-react";
import { APP_PAGES } from "./catalog";
import type { UserRole } from "@/lib/rbac/types";

export type AssistantSuggestion = {
  label: string;
  prompt: string;
  icon: LucideIcon;
};

export interface RoleProfileGuide {
  mission: string;
  responsibilities: string[];
  allowed: string[];
  forbidden: string[];
  typicalDay: string;
}

export const ROLE_PROFILE_GUIDES: Record<UserRole, RoleProfileGuide> = {
  directeur: {
    mission: "Piloter l'exploitation : décisions agronomiques, conformité, équipe et performance globale.",
    responsibilities: [
      "Valider et planifier les traitements",
      "Superviser stock, achats et fournisseurs",
      "Consulter parcelles, satellite, rapports et résultats",
      "Gérer les rôles utilisateurs",
    ],
    allowed: ["Toutes les pages", "Création/modification traitements", "Administration rôles", "Simulation"],
    forbidden: [],
    typicalDay: "Revue dashboard → alertes → validation traitements → suivi conformité → rapports.",
  },
  responsable_technique: {
    mission: "Responsable des décisions agronomiques et du planning phyto sans gestion des achats ni des utilisateurs.",
    responsibilities: [
      "Planifier et exécuter les traitements",
      "Éditer parcelles et protocoles",
      "Suivre IoT, satellite, maladies",
      "Contrôler stock (consultation + mouvements)",
    ],
    allowed: ["Planification traitements", "Parcelles", "Protocoles", "Conformité", "Opérateurs"],
    forbidden: ["Admin rôles", "Récoltes/résultats financiers", "Édition fournisseurs (achats = directeur/magasinier)"],
    typicalDay: "Météo → fenêtre traitement → ordre de traitement → suivi exécution terrain.",
  },
  agronome: {
    mission: "Expert agronomique interne : planifier les interventions phytosanitaires, analyser les données satellite et produire des recommandations.",
    responsibilities: [
      "Planifier les traitements (produit, dose, DAR)",
      "Analyser NDVI / NDWI satellite",
      "Suivre protocoles et résultats de rendement",
      "Consulter le stock pour les calculs de doses (lecture seule)",
      "Produire des rapports agronomiques",
    ],
    allowed: [
      "Planification traitements",
      "Parcelles (vue + édition)",
      "Satellite (NDVI/NDWI), Météo",
      "Protocoles, Résultats",
      "Registre, Traçabilité",
      "Stock & produits (lecture seule)",
      "Rapports & alertes",
    ],
    forbidden: [
      "Campagnes, Maladies, Diagnostic IA vision",
      "Fertigation, Conformité LMR",
      "Édition catalogue produits",
      "Exécution terrain (= opérateur)",
      "Édition stock / mouvements (= magasinier)",
      "Achats / fournisseurs, admin rôles",
    ],
    typicalDay: "NDVI satellite → fenêtre météo → planifier traitement → consulter protocoles → rapport agronomique.",
  },
  magasinier: {
    mission: "Gérer le magasin phyto : entrées/sorties, lots, péremptions, préparation des produits pour les traitements planifiés.",
    responsibilities: [
      "Tenir l'inventaire et les mouvements de stock",
      "Anticiper ruptures et péremptions ≤30 j",
      "Préparer les sorties pour traitements planifiés (lecture seule sur le planning)",
      "Tenir catalogue produits et fournisseurs",
    ],
    allowed: [
      "Dashboard magasin (carte stock + action du jour)",
      "Stock, produits, fournisseurs",
      "Traitements en lecture seule",
      "Rapports PDF sortie magasin",
      "Alertes et paramètres compte",
    ],
    forbidden: [
      "Planifier ou exécuter un traitement",
      "Éditer parcelles ou carte exploitation",
      "Registre, traçabilité, satellite, IoT live",
      "Conformité LMR, audit SCD2, admin rôles",
    ],
    typicalDay: "Action du jour → péremptions → réappro → préparer produits pour traitements du jour → contrôle stock.",
  },
  operateur: {
    mission: "Exécuter les traitements sur le terrain : démarrer, clôturer, conditions réelles.",
    responsibilities: [
      "Consulter traitements assignés",
      "Démarrer et clôturer les interventions",
      "Saisir conditions réelles (volume, météo)",
      "Suivre GPS live et journal terrain",
    ],
    allowed: ["Exécution traitements", "Parcelles (vue)", "Registre", "Live IoT", "Météo"],
    forbidden: ["Planifier un traitement (produit/dose = RT/directeur)", "Édition stock", "Satellite, opérateurs"],
    typicalDay: "Liste traitements du jour → démarrage → exécution → clôture avec trajectoire GPS.",
  },
  auditeur: {
    mission: "Contrôler la conformité et la traçabilité en lecture seule sur l'ensemble des surfaces auditables.",
    responsibilities: [
      "Vérifier registre et traçabilité",
      "Auditer journal SCD2",
      "Contrôler stock et traitements (lecture)",
    ],
    allowed: ["Registre", "Traçabilité", "Conformité", "Audit", "Rapports"],
    forbidden: ["Toute modification opérationnelle", "Planification traitements", "Édition stock"],
    typicalDay: "Export registre → vérification lots → rapport conformité.",
  },
  consultant: {
    mission: "Conseil agronomique externe : protocoles, vigour satellite, résultats et recommandations.",
    responsibilities: [
      "Analyser protocoles et maladies",
      "Consulter satellite et résultats",
      "Produire rapports d'avis",
    ],
    allowed: ["Protocoles", "Satellite", "Résultats/récoltes", "Rapports", "Conformité (lecture)"],
    forbidden: ["Exécution terrain", "Édition stock", "Alertes opérationnelles", "Audit SCD2 interne"],
    typicalDay: "NDVI parcelles → analyse protocole → recommandations écrites.",
  },
};

const PAGE_UI_BY_ROLE: Partial<Record<UserRole, Partial<Record<string, string>>>> = {
  agronome: {
    "/dashboard": `DASHBOARD AGRONOME : carte parcelles, KPI phyto, alertes, météo. Bouton « Indices satellite » (FAB) ouvre le panel NDVI/NDWI par parcelle trié par niveau de stress.`,
    "/treatments": `TRAITEMENTS : planifier un nouveau traitement (bouton +), sélectionner parcelle, produit, dose, date. Workflow brouillon → approuvé → planifié.`,
    "/satellite": `SATELLITE : indices NDVI et NDWI par parcelle, tri par stress. Cliquer une parcelle → ouvrir sa fiche pour planifier un traitement.`,
    "/parcelles": `PARCELLES : éditer superficie, culture, historique. Créer des sous-parcelles. Base pour le calcul des doses.`,
    "/registre": `REGISTRE : registre officiel FOR.PR6.004 des traitements réalisés. Consultation et export PDF.`,
    "/reports": `RAPPORTS : exports PDF ordres de traitement, synthèses agronomiques par campagne.`,
  },
  magasinier: {
    "/dashboard": `TABLEAU DE BORD MAGASINIER :
• « Action du jour » (panneau haut-gauche) : priorité immédiate, date, bouton principal cliquable, 3 compteurs (Pérémp. ≤30j, Sous seuil, À préparer).
• Légende (bas-gauche) : vert = stock OK, ambre = alertes, gris = aucun produit ; valeur stock totale.
• FAB « MAGASIN » (droite) : raccourcis vers stock, péremptions, réapprovisionnement, préparation traitements.
• Carte : parcelles colorées selon couverture stock ; labels produits sous chaque parcelle.`,
    "/stock": `STOCK MAGASINIER : onglets Synthèse, Produits, Mouvements, Opérations, Analyses, Conformité. Boutons Contrôle, Export, Entrée stock. Gestion entrées/sorties, ajustements, inventaire.`,
    "/treatments": `TRAITEMENTS (LECTURE SEULE) : consulter le planning pour préparer les sorties. Bouton « Préparer » ouvre la consommation stock. Pas de planification.`,
    "/products": `CATALOGUE PPP : filtre par catégorie, fiche produit (DAR, dose, stock lié).`,
    "/suppliers": `FOURNISSEURS : cartes distributeurs, historique livraisons, lien réappro.`,
    "/reports": `RAPPORTS : télécharger ordres de traitement PDF pour sortie magasin.`,
    "/settings": `PARAMÈTRES : exploitation, notifications, sécurité (lecture), exports.`,
  },
  directeur: {
    "/dashboard": `Dashboard directeur : carte parcelles, KPI, météo, traitements actifs, alertes globales.`,
    "/treatments": `Workflow complet : brouillon → approbation → planifié → en cours → terminé → évalué.`,
  },
  operateur: {
    "/treatments": `Liste traitements assignés : Démarrer (approved→in_progress), Clôturer avec trajectoire GPS.`,
  },
};

export function getPageLabel(pathname: string): string {
  const base = pathname.split("?")[0];
  const page = APP_PAGES.find((p) => base === p.path || base.startsWith(p.path + "/"));
  return page?.label ?? base;
}

export function getPageUiHints(pathname: string, role?: UserRole | null): string {
  const base = pathname.split("?")[0];
  if (role && PAGE_UI_BY_ROLE[role]?.[base]) return PAGE_UI_BY_ROLE[role]![base]!;
  const page = APP_PAGES.find((p) => base === p.path);
  return page?.description ?? "";
}

export function formatProfileGuideForPrompt(role: UserRole): string {
  const g = ROLE_PROFILE_GUIDES[role];
  return [
    `Mission : ${g.mission}`,
    `Typiquement : ${g.typicalDay}`,
    `Peut faire : ${g.allowed.join(" ; ")}`,
    g.forbidden.length ? `Ne peut PAS : ${g.forbidden.join(" ; ")}` : "",
    `Responsabilités : ${g.responsibilities.join(" · ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getSuggestionsForProfile(role: UserRole, pathname: string): AssistantSuggestion[] {
  const pageLabel = getPageLabel(pathname);
  const explainPage: AssistantSuggestion = {
    label: "Cette page",
    prompt: `Explique-moi la page « ${pageLabel} » (${pathname}) pour mon profil. Décris chaque zone, bouton et action utile.`,
    icon: BookOpen,
  };

  const myProfile: AssistantSuggestion = {
    label: "Mon profil",
    prompt: `Qui suis-je dans LeadFarm, que puis-je faire et que me est interdit ? Donne des exemples concrets.`,
    icon: UserCircle,
  };

  const byRole: Record<UserRole, AssistantSuggestion[]> = {
    agronome: [
      {
        label: "Planifier traitement",
        prompt: "Guide-moi pour planifier un traitement phytosanitaire : quelle parcelle, quel produit, quelle dose et quelle date ?",
        icon: SprayCan,
      },
      {
        label: "Indices satellite",
        prompt: "Ouvre le panel satellite sur le dashboard et explique comment interpréter les indices NDVI et NDWI pour cibler une intervention.",
        icon: MapPin,
      },
      {
        label: "Protocoles",
        prompt: "Ouvre les protocoles agronomiques et explique comment en appliquer un pour planifier un traitement.",
        icon: FlaskConical,
      },
      {
        label: "Résultats",
        prompt: "Ouvre la page résultats et explique comment analyser les données de rendement par parcelle.",
        icon: BookOpen,
      },
    ],
    magasinier: [
      {
        label: "Action du jour",
        prompt:
          "Explique le panneau « Action du jour » sur mon dashboard magasinier : priorité, compteurs péremption/seuil/à préparer, et quoi faire en premier.",
        icon: LayoutDashboard,
      },
      {
        label: "Préparer traitements",
        prompt: "Comment préparer les produits pour les traitements planifiés ? Étapes depuis la page traitements jusqu'à la sortie stock.",
        icon: SprayCan,
      },
      {
        label: "Ouvrir le stock",
        prompt: "Ouvre la page gestion de stock et dis-moi par où commencer aujourd'hui.",
        icon: Warehouse,
      },
      {
        label: "Péremptions",
        prompt: "Comment gérer les produits qui expirent dans les 30 prochains jours ? Où cliquer et quelles actions ?",
        icon: Package,
      },
    ],
    directeur: [
      { label: "Créer traitement", prompt: "Aide-moi à créer un traitement : quelles infos me demander ?", icon: SprayCan },
      { label: "Parcelles", prompt: "Ouvre la carte des parcelles et explique comment l'utiliser.", icon: MapPin },
      { label: "Conformité", prompt: "Comment vérifier la conformité LMR de l'exploitation ?", icon: ShieldCheck },
    ],
    responsable_technique: [
      { label: "Planifier phyto", prompt: "Guide-moi pour planifier un traitement cette semaine.", icon: SprayCan },
      { label: "Fenêtre météo", prompt: "Ouvre la météo et explique comment choisir une fenêtre de traitement.", icon: MapPin },
    ],
    operateur: [
      { label: "Mon jour", prompt: "Quels traitements dois-je exécuter aujourd'hui et comment les clôturer ?", icon: ClipboardList },
      { label: "Démarrer traitement", prompt: "Comment démarrer un traitement approuvé sur le terrain ?", icon: SprayCan },
    ],
    auditeur: [
      { label: "Registre", prompt: "Ouvre le registre phytosanitaire et explique comment auditer les entrées.", icon: ShieldCheck },
    ],
    consultant: [
      { label: "Protocoles", prompt: "Ouvre les protocoles agronomiques et résume les points clés.", icon: BookOpen },
    ],
  };

  return [explainPage, myProfile, ...(byRole[role] ?? [])].slice(0, 5);
}

export const ROLE_CHIP_ICONS: Record<UserRole, LucideIcon> = {
  directeur: ShieldCheck,
  responsable_technique: SprayCan,
  agronome: FlaskConical,
  magasinier: Package,
  operateur: MapPin,
  auditeur: ShieldCheck,
  consultant: BookOpen,
};
