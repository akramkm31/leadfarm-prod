"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type {
  PhytoProduct,
  Supplier,
  StockEntry,
  StockLevel,
  Parcelle,
  Treatment,
  Operator,
  Alert,
  DashboardStats,
} from "@/lib/mock-data";

const IS_SUPABASE_LIVE =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

interface DataContextType {
  isSupabase: boolean;
  loading: boolean;
  products: PhytoProduct[] | null;
  suppliers: Supplier[] | null;
  stockEntries: StockEntry[] | null;
  stockLevels: StockLevel[] | null;
  treatments: Treatment[] | null;
  operators: Operator[] | null;
  alerts: Alert[] | null;
  refetch: () => void;
}

const DataContext = createContext<DataContextType>({
  isSupabase: false,
  loading: false,
  products: null,
  suppliers: null,
  stockEntries: null,
  stockLevels: null,
  treatments: null,
  operators: null,
  alerts: null,
  refetch: () => {},
});

export function useDataContext() {
  return useContext(DataContext);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(IS_SUPABASE_LIVE);
  const [supabaseData, setSupabaseData] = useState<Partial<DataContextType>>({});

  const fetchAll = async () => {
    if (!IS_SUPABASE_LIVE) return;
    setLoading(true);
    try {
      const [productsRes, suppliersRes, movementsRes, stockRes, treatmentsRes, operatorsRes, alertsRes] =
        await Promise.all([
          supabase.from("products").select("*").order("trade_name"),
          supabase.from("suppliers").select("*").order("name"),
          supabase.from("movements").select("*, products(trade_name, category, unit)").order("date", { ascending: false }).limit(500),
          supabase.from("stock_levels").select("*, products(trade_name, category, active_substance, unit, stock_initial_2024)").order("current_quantity"),
          supabase.from("treatments").select("*, treatment_products(*, products(trade_name, unit))").order("planned_date", { ascending: false }),
          supabase.from("operators").select("*").order("name"),
          supabase.from("alerts").select("*").order("timestamp", { ascending: false }),
        ]);

      setSupabaseData({
        products: productsRes.data as unknown as PhytoProduct[] || null,
        suppliers: suppliersRes.data as unknown as Supplier[] || null,
        stockEntries: movementsRes.data as unknown as StockEntry[] || null,
        stockLevels: stockRes.data as unknown as StockLevel[] || null,
        treatments: treatmentsRes.data as unknown as Treatment[] || null,
        operators: operatorsRes.data as unknown as Operator[] || null,
        alerts: alertsRes.data as unknown as Alert[] || null,
      });
    } catch (err) {
      console.warn("Supabase fetch failed, using mock data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <DataContext.Provider
      value={{
        isSupabase: IS_SUPABASE_LIVE,
        loading,
        ...supabaseData,
        products: supabaseData.products || null,
        suppliers: supabaseData.suppliers || null,
        stockEntries: supabaseData.stockEntries || null,
        stockLevels: supabaseData.stockLevels || null,
        treatments: supabaseData.treatments || null,
        operators: supabaseData.operators || null,
        alerts: supabaseData.alerts || null,
        refetch: fetchAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
