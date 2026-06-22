import type { Feature } from "./types";
import { can } from "./policy";
import type { UserAccessProfile } from "./types";

export type NavItemDef = {
  href: string;
  label: string;
  feature: Feature;
  section?: string;
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
      { href: "/dashboard",  label: "Tableau de bord",  feature: "dashboard",       section: "Suivi" },
      { href: "/parcelles",  label: "Carte & Parcelles", feature: "parcelles.view", section: "Suivi" },
      { href: "/treatments", label: "Traitements",       feature: "treatments.view", section: "Terrain" },
      { href: "/registre",   label: "Registre & PDF",    feature: "registre",        section: "Terrain" },
      { href: "/trace",      label: "Traçabilité",       feature: "trace",           section: "Terrain" },
      { href: "/journal",    label: "Journal terrain",   feature: "trace",           section: "Terrain" },
      { href: "/campagnes",  label: "Campagnes",         feature: "campagnes",       section: "Cycle" },
      { href: "/recoltes",   label: "Récoltes",          feature: "recoltes",        section: "Cycle" },
      { href: "/resultats",  label: "Résultats",         feature: "resultats",       section: "Cycle" },
      { href: "/maladies",   label: "Maladies",          feature: "maladies",        section: "Analyse" },
      { href: "/meteo",      label: "Météo",             feature: "meteo",           section: "Analyse" },
    ],
  },
  {
    id: "operations",
    label: "Opérations",
    items: [
      { href: "/stock",            label: "Gestion de Stock",         feature: "stock.view",     section: "Stock" },
      { href: "/products",         label: "Produits Phytosanitaires", feature: "products.view",  section: "Stock" },
      { href: "/besoins",          label: "Besoins & Appro",          feature: "stock.view",     section: "Stock" },
      { href: "/suppliers",        label: "Fournisseurs",             feature: "suppliers.view", section: "Stock" },
      { href: "/live",             label: "IoT Live",                 feature: "live",           section: "Monitoring" },
      { href: "/satellite",        label: "Satellite",                feature: "satellite",      section: "Monitoring" },
      { href: "/vision",           label: "Diagnostic IA",            feature: "vision",         section: "Intelligence" },
      { href: "/fertigation",      label: "Fertigation",              feature: "fertigation",    section: "Irrigation" },
      { href: "/fertigation-plan", label: "Plan Fertigation",         feature: "fertigation",    section: "Irrigation" },
    ],
  },
  {
    id: "audit",
    label: "Audit",
    items: [
      { href: "/conformite", label: "Conformité LMR", feature: "conformite",  section: "Conformité" },
      { href: "/audit",      label: "Journal SCD2",   feature: "audit",       section: "Conformité" },
      { href: "/operators",  label: "Opérateurs",     feature: "operators",   section: "Équipe" },
      { href: "/admin",      label: "Admin rôles",    feature: "admin.roles", section: "Équipe" },
      { href: "/reports",    label: "Rapports",       feature: "reports",     section: "Exports" },
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
  { id: "dash",       label: "Tableau de bord",       hint: "Vue d'ensemble", href: "/dashboard",   group: "Navigation", feature: "dashboard",       keywords: ["accueil"] },
  { id: "parcelles",  label: "Parcelles",              hint: "Carte",          href: "/parcelles",   group: "Pilotage",   feature: "parcelles.view" },
  { id: "treatments", label: "Traitements",            hint: "Phyto",          href: "/treatments",  group: "Pilotage",   feature: "treatments.view" },
  { id: "registre",   label: "Registre FOR.PR6.004",   hint: "PDF",            href: "/registre",    group: "Pilotage",   feature: "registre" },
  { id: "trace",      label: "Traçabilité",            hint: "Fiche parcelle", href: "/trace",       group: "Pilotage",   feature: "trace" },
  { id: "journal",    label: "Journal terrain",        hint: "WhatsApp IA",    href: "/journal",     group: "Pilotage",   feature: "trace", keywords: ["whatsapp", "terrain", "messages"] },
  { id: "campagnes",  label: "Campagnes",              hint: "Saison",         href: "/campagnes",   group: "Pilotage",   feature: "campagnes" },
  { id: "maladies",   label: "Maladies",               hint: "Pathogènes",     href: "/maladies",    group: "Pilotage",   feature: "maladies" },
  { id: "recoltes",  label: "Récoltes",               hint: "Campagne",       href: "/recoltes",    group: "Pilotage",   feature: "recoltes",   keywords: ["harvest", "récolte"] },
  { id: "resultats", label: "Résultats",               hint: "Rendement",      href: "/resultats",   group: "Pilotage",   feature: "resultats",  keywords: ["rendement", "yield"] },
  { id: "stock",      label: "Gestion de Stock",       hint: "Inventaire",     href: "/stock",       group: "Opérations", feature: "stock.view",      keywords: ["stock"] },
  { id: "products",   label: "Produits Phyto",         hint: "Catalogue",      href: "/products",    group: "Opérations", feature: "products.view" },
  { id: "besoins",    label: "Besoins & Appro",        hint: "Approvisionnement", href: "/besoins",  group: "Opérations", feature: "stock.view", keywords: ["appro", "besoin", "achat"] },
  { id: "suppliers",  label: "Fournisseurs",           hint: "Carnet",         href: "/suppliers",   group: "Opérations", feature: "suppliers.view" },
  { id: "live",       label: "IoT Live",               hint: "Tracteur",       href: "/live",        group: "Opérations", feature: "live" },
  { id: "satellite",  label: "Imagerie Sat",           hint: "NDVI",           href: "/satellite",   group: "Opérations", feature: "satellite" },
  { id: "vision",     label: "Diagnostic IA",          hint: "Foliaire",       href: "/vision",      group: "Opérations", feature: "vision" },
  { id: "fertigation",label: "Fertigation",            hint: "Ordres",         href: "/fertigation", group: "Opérations", feature: "fertigation" },
  { id: "fertigation-plan", label: "Plan Fertigation", hint: "Station × Secteur", href: "/fertigation-plan", group: "Opérations", feature: "fertigation", keywords: ["plan", "engrais", "tenira"] },
  { id: "conformite", label: "Conformité LMR",         hint: "Résidus",        href: "/conformite",  group: "Audit",      feature: "conformite" },
  { id: "audit",      label: "Audit SCD2",             hint: "Versions",       href: "/audit",       group: "Audit",      feature: "audit" },
  { id: "operators",  label: "Opérateurs",             hint: "Équipe",         href: "/operators",   group: "Audit",      feature: "operators" },
  { id: "reports",    label: "Rapports",               hint: "Exports",        href: "/reports",     group: "Audit",      feature: "reports" },
  { id: "admin",      label: "Admin rôles",            hint: "RBAC",           href: "/admin",       group: "Audit",      feature: "admin.roles" },
  { id: "alerts",     label: "Alertes",                hint: "Notifications",  href: "#alerts",      group: "Gestion",    feature: "alerts" },
  { id: "settings",   label: "Paramètres",             hint: "Compte",         href: "/settings",    group: "Gestion",    feature: "settings" },
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
