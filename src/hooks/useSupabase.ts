/**
 * @deprecated — This file is unused. Use `useData.ts` instead.
 * All pages import hooks from useData.ts which uses the data-provider abstraction.
 * This file can be safely deleted.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProductCategory, MovementType, CultureType, TreatmentStatus } from "@/lib/database.types";
import * as queries from "@/lib/queries";

function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

// ============================================================
// PRODUCTS
// ============================================================

export function useProducts() {
  return useQuery(() => queries.getProducts(), []);
}

export function useProduct(id: string | null) {
  return useQuery(() => id ? queries.getProductById(id) : Promise.resolve(null), [id]);
}

// ============================================================
// SUPPLIERS
// ============================================================

export function useSuppliers() {
  return useQuery(() => queries.getSuppliers(), []);
}

// ============================================================
// MOVEMENTS
// ============================================================

export function useMovements(filters?: {
  category?: ProductCategory;
  movement_type?: MovementType;
  culture?: CultureType;
  product_id?: string;
  site_name?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery(
    () => queries.getMovements(filters),
    [filters?.category, filters?.movement_type, filters?.culture, filters?.product_id, filters?.site_name, filters?.date_from, filters?.date_to, filters?.limit, filters?.offset]
  );
}

export function useMovementCount(filters?: { category?: ProductCategory; movement_type?: MovementType }) {
  return useQuery(() => queries.getMovementCount(filters), [filters?.category, filters?.movement_type]);
}

// ============================================================
// STOCK
// ============================================================

export function useStockLevels() {
  return useQuery(() => queries.getStockLevels(), []);
}

export function useResteAuto() {
  return useQuery(() => queries.getResteAuto(), []);
}

// ============================================================
// PARCELLES
// ============================================================

export function useRegions() {
  return useQuery(() => queries.getRegions(), []);
}

export function useZones() {
  return useQuery(() => queries.getZones(), []);
}

export function useSites() {
  return useQuery(() => queries.getSites(), []);
}

// ============================================================
// OPERATORS
// ============================================================

export function useOperators() {
  return useQuery(() => queries.getOperators(), []);
}

// ============================================================
// TREATMENTS
// ============================================================

export function useTreatments(status?: TreatmentStatus) {
  return useQuery(
    () => queries.getTreatments(status ? { status } : undefined),
    [status]
  );
}

// ============================================================
// ALERTS
// ============================================================

export function useAlerts(acknowledged?: boolean) {
  return useQuery(() => queries.getAlerts(acknowledged), [acknowledged]);
}

// ============================================================
// DASHBOARD
// ============================================================

export function useDashboardStats() {
  return useQuery(() => queries.getDashboardStats(), []);
}

// ============================================================
// ANALYSIS
// ============================================================

export function useConsumptionBySite(dateFrom?: string, dateTo?: string) {
  return useQuery(() => queries.getConsumptionBySite(dateFrom, dateTo), [dateFrom, dateTo]);
}

export function useConsumptionByProduct(dateFrom?: string, dateTo?: string) {
  return useQuery(() => queries.getConsumptionByProduct(dateFrom, dateTo), [dateFrom, dateTo]);
}
