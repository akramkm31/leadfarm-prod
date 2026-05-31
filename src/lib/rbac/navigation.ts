import type { Feature } from "./types";
import { can } from "./policy";
import type { UserAccessProfile } from "./types";

export type NavItemDef = {
  href: string;
  label: string;
  feature: Feature;
};

export type NavGroupDef = {
  id: string;
  label: string;
  items: NavItemDef[];
};

export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", feature: "dashboard" },
      { href: "/parcelles", label: "Carte & Parcelles", feature: "parcelles.view" },
      { href: "/treatments", label: "Traitements", feature: "treatments.view" },
      { href: "/registre", label: "Registre & PDF", feature: "registre" },
      { href: "/trace", label: "Traçabilité", feature: "trace" },
      { href: "/campagnes", label: "Campagnes", feature: "campagnes" },
      { href: "/protocoles", label: "Protocoles", feature: "protocoles" },
      { href: "/maladies", label: "Maladies", feature: "maladies" },
    ],
  },
  {
    id: "operations",
    label: "Opérations",
    items: [
      { href: "/micro-zones", label: "Micro-zones", feature: "micro_zones" },
      { href: "/meteo", label: "Météo zones", feature: "meteo" },
      { href: "/stock", label: "Gestion de Stock", feature: "stock.view" },
      { href: "/products", label: "Produits Phytosanitaires", feature: "products" },
      { href: "/suppliers", label: "Fournisseurs", feature: "suppliers" },
      { href: "/live", label: "IoT Live", feature: "live" },
      { href: "/satellite", label: "Satellite", feature: "satellite" },
      { href: "/vision", label: "Diagnostic IA", feature: "vision" },
      { href: "/fertigation", label: "Fertigation", feature: "fertigation" },
    ],
  },
  {
    id: "audit",
    label: "Audit",
    items: [
      { href: "/conformite", label: "Conformité LMR", feature: "conformite" },
      { href: "/audit", label: "Journal SCD2", feature: "audit" },
      { href: "/alerts", label: "Alertes", feature: "alerts" },
      { href: "/operators", label: "Opérateurs", feature: "operators" },
      { href: "/reports", label: "Rapports", feature: "reports" },
      { href: "/admin", label: "Admin rôles", feature: "admin.roles" },
    ],
  },
];

export const COMMAND_ITEMS: {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: string;
  feature: Feature;
  keywords?: string[];
}[] = [
  { id: "dash", label: "Tableau de bord", hint: "Vue d'ensemble", href: "/dashboard", group: "Navigation", feature: "dashboard", keywords: ["accueil"] },
  { id: "stock", label: "Gestion de Stock", hint: "Inventaire", href: "/stock", group: "Stock", feature: "stock.view", keywords: ["stock"] },
  { id: "products", label: "Produits Phyto", hint: "Catalogue", href: "/products", group: "Stock", feature: "products" },
  { id: "suppliers", label: "Fournisseurs", hint: "Carnet", href: "/suppliers", group: "Stock", feature: "suppliers" },
  { id: "parcelles", label: "Parcelles", hint: "Carte", href: "/parcelles", group: "Terrain", feature: "parcelles.view" },
  { id: "trace", label: "Traçabilité", hint: "Fiche parcelle", href: "/trace", group: "Terrain", feature: "trace" },
  { id: "campagnes", label: "Campagnes", hint: "Saison", href: "/campagnes", group: "Terrain", feature: "campagnes" },
  { id: "protocoles", label: "Protocoles", hint: "Itinéraires", href: "/protocoles", group: "Terrain", feature: "protocoles" },
  { id: "maladies", label: "Maladies", hint: "Pathogènes", href: "/maladies", group: "Terrain", feature: "maladies" },
  { id: "microzones", label: "Micro-zones", hint: "Sol", href: "/micro-zones", group: "Terrain", feature: "micro_zones" },
  { id: "meteo", label: "Météo", hint: "Zone", href: "/meteo", group: "Terrain", feature: "meteo" },
  { id: "admin", label: "Admin rôles", hint: "RBAC", href: "/admin", group: "Gestion", feature: "admin.roles" },
  { id: "treatments", label: "Traitements", hint: "Phyto", href: "/treatments", group: "Terrain", feature: "treatments.view" },
  { id: "satellite", label: "Imagerie Sat", hint: "NDVI", href: "/satellite", group: "Terrain", feature: "satellite" },
  { id: "registre", label: "Registre FOR.PR6.004", hint: "PDF", href: "/registre", group: "Terrain", feature: "registre" },
  { id: "fertigation", label: "Fertigation", hint: "Ordres", href: "/fertigation", group: "Terrain", feature: "fertigation" },
  { id: "conformite", label: "Conformité LMR", hint: "Résidus", href: "/conformite", group: "Terrain", feature: "conformite" },
  { id: "live", label: "IoT Live", hint: "Tracteur", href: "/live", group: "Gestion", feature: "live" },
  { id: "vision", label: "Diagnostic IA", hint: "Foliaire", href: "/vision", group: "Gestion", feature: "vision" },
  { id: "audit", label: "Audit SCD2", hint: "Versions", href: "/audit", group: "Gestion", feature: "audit" },
  { id: "operators", label: "Opérateurs", hint: "Équipe", href: "/operators", group: "Gestion", feature: "operators" },
  { id: "reports", label: "Rapports", hint: "Exports", href: "/reports", group: "Gestion", feature: "reports" },
  { id: "alerts", label: "Alertes", hint: "Notifications", href: "/alerts", group: "Gestion", feature: "alerts" },
  { id: "settings", label: "Paramètres", hint: "Compte", href: "/settings", group: "Gestion", feature: "settings" },
];

export function filterNavGroups(access: UserAccessProfile) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(access, item.feature)),
  })).filter((group) => group.items.length > 0);
}

export function filterCommands(access: UserAccessProfile) {
  return COMMAND_ITEMS.filter((c) => can(access, c.feature));
}
