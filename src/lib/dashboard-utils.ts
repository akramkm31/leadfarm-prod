/** Utilitaires tableau de bord — dates & agrégats. */

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date = new Date()): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function countTreatmentsInWeek(
  treatments: Record<string, unknown>[],
  statuses: string[] = ["planned", "in_progress", "pending_approval"]
): number {
  const start = startOfWeek();
  const end = endOfWeek();
  return treatments.filter((t) => {
    const status = String(t.status || "");
    if (!statuses.includes(status)) return false;
    const raw = t.plannedDate || t.planned_date;
    if (!raw) return false;
    const str = String(raw);
    let d: Date;
    if (str.includes("T")) {
      d = new Date(str);
    } else {
      const parts = str.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(str);
      }
    }
    return d >= start && d <= end;
  }).length;
}

export function sumParcelleHectares(
  parcelles: { areaHectares?: number; area_hectares?: number }[]
): number {
  return parcelles.reduce(
    (sum, p) => sum + (Number(p.areaHectares ?? p.area_hectares) || 0),
    0
  );
}

export function formatDzdCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} k`;
  return String(Math.round(value));
}

export function stockFillPercent(
  levels: { currentQuantity?: number; minThreshold?: number; current_quantity?: number; min_threshold?: number }[]
): number {
  if (!levels.length) return 0;
  let filled = 0;
  let total = 0;
  for (const s of levels) {
    const cur = Number(s.currentQuantity ?? s.current_quantity) || 0;
    const min = Number(s.minThreshold ?? s.min_threshold) || 1;
    const target = Math.max(min * 2, min);
    filled += Math.min(cur / target, 1);
    total += 1;
  }
  return total ? Math.round((filled / total) * 100) : 0;
}
