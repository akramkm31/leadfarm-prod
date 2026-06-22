import type { Feature } from "@/lib/rbac/types";

export interface AppPage {
  path: string;
  label: string;
  feature: Feature | null;
  description: string;
}

/** Pages de l'application connues de l'assistant (navigation + explications). */
export const APP_PAGES: AppPage[] = [
  { path: "/dashboard", label: "Tableau de bord", feature: "dashboard", description: "Vue d'ensemble. Magasinier : carte stock parcelles, panneau Action du jour, légende, FAB magasin. Directeur : KPI, météo, traitements actifs." },
  { path: "/parcelles", label: "Parcelles", feature: "parcelles.view", description: "Carte interactive, création/édition de parcelles et sous-parcelles, historique par parcelle." },
  { path: "/treatments", label: "Traitements", feature: "treatments.view", description: "Planification et suivi des traitements phytosanitaires, ordres de traitement (FOR.PR6.003)." },
  { path: "/registre", label: "Registre phytosanitaire", feature: "registre", description: "Registre réglementaire des traitements appliqués (traçabilité légale)." },
  { path: "/trace", label: "Traçabilité", feature: "trace", description: "Traçabilité produit → parcelle → récolte pour la conformité." },
  { path: "/campagnes", label: "Campagnes", feature: "campagnes", description: "Gestion des campagnes culturales et plantations." },
  { path: "/stock", label: "Stock", feature: "stock.view", description: "Inventaire des produits, niveaux, lots, valeur, mouvements (entrées/sorties)." },
  { path: "/products", label: "Produits", feature: "products.view", description: "Catalogue des produits phytosanitaires (matières actives, doses, DAR)." },
  { path: "/suppliers", label: "Fournisseurs", feature: "suppliers.view", description: "Fournisseurs et distributeurs, contrats d'approvisionnement." },
  { path: "/live", label: "Suivi live", feature: "live", description: "Suivi en temps réel des opérations terrain (GPS, débit)." },
  { path: "/satellite", label: "Satellite", feature: "satellite", description: "Indices de vigueur (NDVI) et imagerie satellite par parcelle." },
  { path: "/vision", label: "Vision IA", feature: "vision", description: "Détection par image (maladies, ravageurs) via caméra IoT." },
  { path: "/fertigation", label: "Fertigation", feature: "fertigation", description: "Pilotage de l'irrigation fertilisante." },
  { path: "/conformite", label: "Conformité", feature: "conformite", description: "Suivi de conformité réglementaire et certifications." },
  { path: "/audit", label: "Audit", feature: "audit", description: "Journal d'audit SCD2 des modifications sensibles." },
  { path: "/operators", label: "Opérateurs", feature: "operators", description: "Gestion des opérateurs terrain et habilitations." },
  { path: "/reports", label: "Rapports", feature: "reports", description: "Rapports et exports (PDF, Excel)." },
  { path: "/settings", label: "Paramètres", feature: "settings", description: "Préférences du compte et de l'exploitation." },
  { path: "/micro-zones", label: "Micro-zones", feature: "micro_zones", description: "Découpage fin des parcelles en micro-zones de gestion." },
  { path: "/protocoles", label: "Protocoles", feature: "protocoles", description: "Protocoles agronomiques et itinéraires techniques." },
  { path: "/maladies", label: "Maladies", feature: "maladies", description: "Suivi des maladies et bioagresseurs détectés." },
  { path: "/recoltes", label: "Récoltes", feature: "recoltes", description: "Suivi des récoltes et rendements." },
  { path: "/meteo", label: "Météo", feature: "meteo", description: "Prévisions et conditions météo (fenêtres de traitement)." },
  { path: "/resultats", label: "Résultats", feature: "resultats", description: "Résultats économiques et indicateurs de performance." },
];

export function pagesForFeatures(has: (f: Feature) => boolean): AppPage[] {
  return APP_PAGES.filter((p) => !p.feature || has(p.feature));
}
