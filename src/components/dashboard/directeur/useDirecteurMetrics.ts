"use client";

import { useMemo } from "react";
import { useTreatments, useStockLevels } from "@/hooks/useData";
import type { Treatment, StockLevel } from "@/lib/mock-data";
import type { DashboardKPIs } from "@/lib/data-provider";

export type DirecteurAction = {
  id: string;
  tone: "red" | "amber" | "blue";
  label: string;
  href: string;
  count: number;
};

export function useDirecteurMetrics(kpis: DashboardKPIs | null) {
  const { data: treatRaw } = useTreatments();
  const { data: stockRaw } = useStockLevels();
  const treatments = (treatRaw ?? []) as Treatment[];
  const stock = (stockRaw ?? []) as StockLevel[];

  return useMemo(() => {
    const pending = treatments.filter((t) => t.status === "pending_approval");
    const inProgress = treatments.filter((t) => t.status === "in_progress");

    const today = new Date().toISOString().slice(0, 10);
    const overdue = treatments.filter(
      (t) => (t.status === "approved" || t.status === "planned") && t.plannedDate < today
    );

    const criticalStock = stock.filter((s) => s.status === "critical");
    const lowStock = stock.filter((s) => s.status === "low");
    const expiringStock = stock.filter((s) => {
      if (!s.expiryDate) return false;
      const daysLeft = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / 86400000);
      return daysLeft <= 30 && daysLeft > 0;
    });

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTreatments = treatments.filter(
      (t) => t.status !== "cancelled" && t.plannedDate?.startsWith(thisMonth)
    );
    const monthCost = monthTreatments.reduce((s, t) => s + (t.totalCostDZD || 0), 0);

    const actions: DirecteurAction[] = [
      pending.length > 0 && {
        id: "approval", tone: "red" as const,
        label: `${pending.length} traitement${pending.length > 1 ? "s" : ""} en attente d'approbation`,
        href: "/treatments?status=pending_approval",
        count: pending.length,
      },
      overdue.length > 0 && {
        id: "overdue", tone: "red" as const,
        label: `${overdue.length} traitement${overdue.length > 1 ? "s" : ""} en retard`,
        href: "/treatments",
        count: overdue.length,
      },
      criticalStock.length > 0 && {
        id: "critical_stock", tone: "red" as const,
        label: `${criticalStock.length} produit${criticalStock.length > 1 ? "s" : ""} stock critique`,
        href: "/stock",
        count: criticalStock.length,
      },
      (kpis?.parcellesEnDAR ?? 0) > 0 && {
        id: "dar", tone: "amber" as const,
        label: `${kpis!.parcellesEnDAR} parcelle${kpis!.parcellesEnDAR > 1 ? "s" : ""} en DAR`,
        href: "/treatments",
        count: kpis!.parcellesEnDAR,
      },
      lowStock.length > 0 && {
        id: "low_stock", tone: "amber" as const,
        label: `${lowStock.length} produit${lowStock.length > 1 ? "s" : ""} sous seuil minimal`,
        href: "/stock",
        count: lowStock.length,
      },
      expiringStock.length > 0 && {
        id: "expiry", tone: "amber" as const,
        label: `${expiringStock.length} lot${expiringStock.length > 1 ? "s" : ""} à péremption ≤30j`,
        href: "/stock",
        count: expiringStock.length,
      },
    ].filter(Boolean) as DirecteurAction[];

    return {
      actions: actions.slice(0, 4),
      inProgress,
      monthTreatments,
      monthCost,
      criticalStock,
      lowStock,
      expiringStock,
      totalStockValue: stock.reduce((s, i) => s + (i.totalValueDZD || 0), 0),
    };
  }, [treatments, stock, kpis]);
}
