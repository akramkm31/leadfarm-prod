"use client";

import { useMemo } from "react";
import { useStockLevels, useTreatments } from "@/hooks/useData";
import type { StockLevel } from "@/lib/mock-data";
import { daysUntil } from "@/components/dashboard/magasinier/WidgetShell";

export type MagasinierPanelKey =
  | "inventaire"
  | "peremptions"
  | "reappro"
  | "preparer"
  | "mouvements";

export type LeadTone = "red" | "blue" | "amber" | "green";

interface TreatmentLike {
  status?: string;
  parcelleName?: string;
  sousParcelleName?: string;
}

export interface MagasinierLead {
  tone: LeadTone;
  panel: MagasinierPanelKey;
  title: string;
  sub: string;
}

export function useMagasinierMetrics() {
  const { data: stockRaw } = useStockLevels();
  const { data: trtRaw } = useTreatments();
  const stock = (stockRaw ?? []) as StockLevel[];
  const treatments = (trtRaw ?? []) as TreatmentLike[];

  return useMemo(() => {
    const expiring = stock.filter((s) => s.expiryDate && daysUntil(s.expiryDate) <= 30);
    const urgentExp = expiring.filter((s) => s.expiryDate && daysUntil(s.expiryDate) <= 7);
    const low = stock.filter((s) => s.currentQuantity <= s.minThreshold);
    const critical = stock.filter((s) => s.status === "critical").length;
    const prep = treatments.filter((t) => t.status === "planned" || t.status === "in_progress");
    const totalValue = stock.reduce((sum, s) => sum + (s.totalValueDZD || 0), 0);

    let lead: MagasinierLead;
    if (urgentExp.length) {
      lead = {
        tone: "red",
        panel: "peremptions",
        title: `${urgentExp.length} lot${urgentExp.length > 1 ? "s" : ""} à écouler ou détruire`,
        sub: urgentExp
          .map((s) => s.productName)
          .slice(0, 2)
          .join(", "),
      };
    } else if (prep.length) {
      lead = {
        tone: "blue",
        panel: "preparer",
        title: `${prep.length} traitement${prep.length > 1 ? "s" : ""} à préparer`,
        sub: prep
          .map((t) => t.sousParcelleName || t.parcelleName || "Parcelle")
          .slice(0, 2)
          .join(", "),
      };
    } else if (low.length) {
      lead = {
        tone: "amber",
        panel: "reappro",
        title: `${low.length} produit${low.length > 1 ? "s" : ""} à réapprovisionner`,
        sub: "Sous le seuil minimal",
      };
    } else {
      lead = {
        tone: "green",
        panel: "inventaire",
        title: "Inventaire à jour",
        sub: "Aucune action urgente",
      };
    }

    return {
      stock,
      treatments,
      expiring,
      urgentExp,
      low,
      critical,
      prep,
      totalValue,
      lead,
      counts: {
        products: stock.length,
        expiry: expiring.length,
        reorder: low.length,
        prepare: prep.length,
      },
    };
  }, [stock, treatments]);
}
