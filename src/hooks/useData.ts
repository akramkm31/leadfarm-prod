"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SUPABASE_CONFIGURED,
  fetchProducts,
  fetchSuppliers,
  fetchMovements,
  fetchStockLevels,
  fetchParcelles,
  fetchOperators,
  fetchAlerts,
  fetchDashboardStats,
} from "@/lib/data-provider";
import { fetchTreatments } from "@/lib/data-provider";
import { getTreatments } from "@/lib/repositories/treatment.repository";

export { SUPABASE_CONFIGURED };

/**
 * Generic async data hook with safe refetch.
 * Uses a ref for the fetcher to avoid stale closures and infinite loops.
 */
function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep fetcher in a ref so refetch callback never changes identity
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Track mounted state to prevent updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Re-fetch when deps change
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}

export function useProducts() {
  return useAsyncData(() => fetchProducts(), []);
}

export function useSuppliers() {
  return useAsyncData(() => fetchSuppliers(), []);
}

export function useMovements(filters?: { category?: string; movement_type?: string; limit?: number }) {
  return useAsyncData(
    () => fetchMovements(filters),
    [filters?.category, filters?.movement_type, filters?.limit]
  );
}

export function useStockLevels() {
  return useAsyncData(() => fetchStockLevels(), []);
}

export function useParcelles() {
  return useAsyncData(() => fetchParcelles(), []);
}

export function useTreatments(status?: string) {
  return useAsyncData(async () => {
    if (!SUPABASE_CONFIGURED) {
      return fetchTreatments(status);
    }
    try {
      const rows = await getTreatments(status ? { status: status as any } : {});
      if (rows.length > 0) return rows;
      return fetchTreatments(status);
    } catch {
      return fetchTreatments(status);
    }
  }, [status]);
}

export function useOperators() {
  return useAsyncData(() => fetchOperators(), []);
}

export function useAlerts() {
  return useAsyncData(() => fetchAlerts(), []);
}

export function useDashboardStats() {
  return useAsyncData(() => fetchDashboardStats(), []);
}
