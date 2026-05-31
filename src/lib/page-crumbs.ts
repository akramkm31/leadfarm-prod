const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  parcelles: "Carte & Parcelles",
  treatments: "Traitements",
  registre: "Registre & PDF",
  stock: "Gestion de Stock",
  products: "Produits Phytosanitaires",
  suppliers: "Fournisseurs",
  live: "IoT Live",
  satellite: "Satellite & Vision",
  vision: "Diagnostic IA",
  conformite: "Conformité",
  audit: "Journal SCD2",
  trace: "Traçabilité",
  campagnes: "Campagnes",
  simulation: "Simulation démo",
  operators: "Opérateurs",
  alerts: "Alertes",
  settings: "Paramètres",
  reports: "Rapports",
  fertigation: "Fertigation",
  mobile: "Mobile",
};

export type Crumb = { label: string; href?: string };

export function crumbsFromPathname(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [
      { label: "LeadFarm", href: "/dashboard" },
      { label: "Tableau de bord" },
    ];
  }

  const items: Crumb[] = [{ label: "LeadFarm", href: "/dashboard" }];
  let path = "";

  for (const part of parts) {
    path += `/${part}`;
    if (part.length > 20 && part.includes("-")) {
      items.push({ label: "Détail" });
      continue;
    }
    const label = LABELS[part] || part.charAt(0).toUpperCase() + part.slice(1);
    const isLast = part === parts[parts.length - 1];
    items.push(isLast ? { label } : { label, href: path });
  }

  return items;
}

/** @deprecated Utiliser crumbsFromPathname — libellés seulement */
export function crumbLabelsFromPathname(pathname: string): string[] {
  return crumbsFromPathname(pathname).map((c) => c.label);
}
