"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { useSetHeaderMeta } from "@/components/layout/HeaderMeta";
import { useSetHeaderActions } from "@/components/layout/HeaderActions";

const AG_HDR: Record<string, [string, string]> = {
  "/dashboard": ["Tableau de bord", "Vue agronomique — satellite & phyto"],
  "/treatments": ["Traitements", "Planification & suivi phyto"],
  "/parcelles": ["Parcelles", "Cartographie & cultures"],
  "/satellite": ["Satellite", "Indices NDVI par parcelle"],
  "/vision": ["Diagnostic IA", "Analyse foliaire"],
  "/conformite": ["Conformité LMR", "Résidus réglementaires"],
  "/protocoles": ["Protocoles", "Itinéraires techniques"],
  "/maladies": ["Maladies", "Bioagresseurs & alertes"],
  "/meteo": ["Météo", "Fenêtres de traitement"],
  "/registre": ["Registre", "Traçabilité réglementaire"],
  "/trace": ["Traçabilité", "Fiche parcelle & lots"],
  "/campagnes": ["Campagnes", "Saisons culturales"],
  "/products": ["Produits phyto", "Catalogue PPP & doses"],
  "/stock": ["Stock", "Consultation inventaire (lecture)"],
  "/fertigation": ["Fertigation", "Ordres & plan station"],
  "/reports": ["Rapports", "Exports agronomiques"],
  "/resultats": ["Résultats", "Indicateurs de performance"],
  "/settings": ["Paramètres", "Compte & exploitation"],
};

export default function AgRouteMeta() {
  const pathname = usePathname();
  const { profile } = useAccessContext();
  const setHeaderMeta = useSetHeaderMeta();
  const setHeaderActions = useSetHeaderActions();
  const isAgronome = profile?.role === "agronome";
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    if (!isAgronome) {
      return;
    }
    const base = pathname?.split("?")[0] ?? "";
    const meta = AG_HDR[base] ?? null;
    if (meta) {
      setHeaderMeta({ title: meta[0], subtitle: meta[1] });
    } else {
      setHeaderMeta(null);
    }
    return () => setHeaderMeta(null);
  }, [isAgronome, pathname, setHeaderMeta]);

  useEffect(() => {
    if (!isAgronome || isDashboard) {
      return;
    }
    setHeaderActions(<AgRoleChip />);
    return () => setHeaderActions(null);
  }, [isAgronome, isDashboard, setHeaderActions]);

  return null;
}

export function AgRoleChip() {
  return (
    <span className="ag-role-chip">
      <span className="ag-role-dot" aria-hidden />
      Agronome
    </span>
  );
}
