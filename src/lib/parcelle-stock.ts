import type { Parcelle, StockLevel } from "@/lib/mock-data";

export interface ParcelleProductUsage {
  productId: string;
  name: string;
  totalUsed: number;
  unit: string;
  uses: number;
  stock?: StockLevel;
}

export interface ParcelleStockSummary {
  products: ParcelleProductUsage[];
  productCount: number;
  okCount: number;
  lowCount: number;
  criticalCount: number;
  alertCount: number;
  treatmentCount: number;
  totalValueDZD: number;
}

interface TreatmentProductLike {
  productId: string;
  productName: string;
  quantityUsed: number;
  unit: string;
}

interface TreatmentLike {
  parcelleId?: string;
  sousParcelleId?: string;
  parcelleName?: string;
  sousParcelleName?: string;
  products?: TreatmentProductLike[];
}

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

/**
 * Collect a parcelle id + name plus every descendant id + name.
 * Name matching mirrors the parcelles page and keeps the link working when
 * treatments come from Supabase (UUID ids) but parcelles are mocked, or vice-versa.
 */
function collectParcelleKeys(parcelle: Parcelle): { ids: Set<string>; names: Set<string> } {
  const ids = new Set<string>([parcelle.id]);
  const names = new Set<string>([norm(parcelle.name)]);
  const walk = (children?: Parcelle[]) => {
    for (const child of children ?? []) {
      ids.add(child.id);
      names.add(norm(child.name));
      walk(child.children);
    }
  };
  walk(parcelle.children);
  names.delete("");
  return { ids, names };
}

/**
 * Aggregate product consumption for a parcelle (including its sub-parcelles)
 * and match each product against current stock levels.
 */
export function summarizeParcelleStock(
  parcelle: Parcelle,
  treatments: TreatmentLike[],
  stockLevels: StockLevel[]
): ParcelleStockSummary {
  const { ids, names } = collectParcelleKeys(parcelle);
  const usage = new Map<string, ParcelleProductUsage>();
  let treatmentCount = 0;

  for (const t of treatments) {
    const tName = norm(t.parcelleName);
    const tSousName = norm(t.sousParcelleName);
    const matches =
      (t.parcelleId !== undefined && ids.has(t.parcelleId)) ||
      (t.sousParcelleId !== undefined && ids.has(t.sousParcelleId)) ||
      (tName !== "" && names.has(tName)) ||
      (tSousName !== "" && names.has(tSousName));
    if (!matches) continue;
    treatmentCount += 1;
    for (const p of t.products ?? []) {
      const existing = usage.get(p.productId);
      if (existing) {
        existing.totalUsed += p.quantityUsed;
        existing.uses += 1;
      } else {
        usage.set(p.productId, {
          productId: p.productId,
          name: p.productName,
          totalUsed: p.quantityUsed,
          unit: p.unit,
          uses: 1,
        });
      }
    }
  }

  const products = Array.from(usage.values()).map((u) => ({
    ...u,
    stock: stockLevels.find((s) => s.productId === u.productId),
  }));

  const okCount = products.filter((p) => p.stock?.status === "ok").length;
  const lowCount = products.filter((p) => p.stock?.status === "low").length;
  const criticalCount = products.filter((p) => p.stock?.status === "critical").length;

  return {
    products,
    productCount: products.length,
    okCount,
    lowCount,
    criticalCount,
    alertCount: lowCount + criticalCount,
    treatmentCount,
    totalValueDZD: products.reduce((sum, p) => sum + (p.stock?.totalValueDZD ?? 0), 0),
  };
}

export const STOCK_STATUS_COLOR: Record<NonNullable<StockLevel["status"]>, string> = {
  ok: "#10b981",
  low: "#f59e0b",
  critical: "#ef4444",
  overstock: "#3b82f6",
};

/** Group movements by product id, newest first within each group. */
export function groupMovementsByProduct<T extends { productId: string; date: string }>(
  movements: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const m of movements) {
    const arr = map.get(m.productId) ?? [];
    arr.push(m);
    map.set(m.productId, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return map;
}
