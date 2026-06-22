"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAccessContext } from "@/components/auth/AccessProvider";
import { useSetHeaderMeta } from "@/components/layout/HeaderMeta";
import { useSetHeaderActions } from "@/components/layout/HeaderActions";

const MAG_HDR: Record<string, [string, string]> = {
  "/dashboard": ["Tableau de bord", "Vue magasin — contexte parcelles"],
  "/treatments": ["Traitements", "Lecture seule — préparation produits"],
  "/stock": ["Gestion de stock", "Inventaire phyto · mouvements"],
  "/products": ["Produits phytosanitaires", "Catalogue PPP"],
  "/besoins": ["Besoins & Appro", "Approvisionnement campagne 2026"],
  "/suppliers": ["Fournisseurs", "Distributeurs & réapprovisionnement"],
  "/reports": ["Rapports", "Ordres de traitement & exports"],
  "/settings": ["Paramètres", "Compte & exploitation"],
};

export default function MagRouteMeta() {
  const pathname = usePathname();
  const { profile } = useAccessContext();
  const setHeaderMeta = useSetHeaderMeta();
  const setHeaderActions = useSetHeaderActions();
  const isMagasinier = profile?.role === "magasinier";
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    if (!isMagasinier) {
      setHeaderMeta(null);
      return;
    }
    const meta = MAG_HDR[pathname ?? ""] ?? null;
    if (meta) {
      setHeaderMeta({ title: meta[0], subtitle: meta[1] });
    } else {
      setHeaderMeta(null);
    }
    return () => setHeaderMeta(null);
  }, [isMagasinier, pathname, setHeaderMeta]);

  useEffect(() => {
    if (!isMagasinier || isDashboard) {
      return;
    }
    setHeaderActions(<MagRoleChip />);
    return () => setHeaderActions(null);
  }, [isMagasinier, isDashboard, setHeaderActions]);

  return null;
}

export function MagRoleChip() {
  return (
    <span className="mag-role-chip">
      <span className="mag-role-dot" aria-hidden />
      Magasinier
    </span>
  );
}
