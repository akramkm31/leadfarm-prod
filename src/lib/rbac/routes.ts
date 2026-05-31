import type { Feature } from "./types";

/** Chemin applicatif → feature minimale pour afficher la page. */
export const ROUTE_FEATURES: { pattern: RegExp; feature: Feature }[] = [
  { pattern: /^\/dashboard\/?$/, feature: "dashboard" },
  { pattern: /^\/parcelles/, feature: "parcelles.view" },
  { pattern: /^\/treatments/, feature: "treatments.view" },
  { pattern: /^\/registre/, feature: "registre" },
  { pattern: /^\/trace/, feature: "trace" },
  { pattern: /^\/campagnes/, feature: "campagnes" },
  { pattern: /^\/simulation/, feature: "simulation" },
  { pattern: /^\/stock/, feature: "stock.view" },
  { pattern: /^\/products/, feature: "products" },
  { pattern: /^\/suppliers/, feature: "suppliers" },
  { pattern: /^\/live/, feature: "live" },
  { pattern: /^\/satellite/, feature: "satellite" },
  { pattern: /^\/vision/, feature: "vision" },
  { pattern: /^\/fertigation/, feature: "fertigation" },
  { pattern: /^\/conformite/, feature: "conformite" },
  { pattern: /^\/audit/, feature: "audit" },
  { pattern: /^\/alerts/, feature: "alerts" },
  { pattern: /^\/operators/, feature: "operators" },
  { pattern: /^\/reports/, feature: "reports" },
  { pattern: /^\/settings/, feature: "settings" },
  { pattern: /^\/micro-zones/, feature: "micro_zones" },
  { pattern: /^\/protocoles/, feature: "protocoles" },
  { pattern: /^\/maladies/, feature: "maladies" },
  { pattern: /^\/recoltes/, feature: "recoltes" },
  { pattern: /^\/meteo/, feature: "meteo" },
  { pattern: /^\/resultats/, feature: "resultats" },
  { pattern: /^\/admin/, feature: "admin.roles" },
];

export function featureForPath(pathname: string): Feature | null {
  const path = pathname.split("?")[0] ?? pathname;
  for (const { pattern, feature } of ROUTE_FEATURES) {
    if (pattern.test(path)) return feature;
  }
  return null;
}
