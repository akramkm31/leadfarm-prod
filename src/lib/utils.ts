import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toFixed(0);
}

export function formatHectares(ha: number | null | undefined): string {
  if (ha == null || isNaN(ha)) return "— ha";
  return ha.toFixed(1) + " ha";
}

export function formatLiters(l: number): string {
  if (l >= 1000) return (l / 1000).toFixed(1) + " KL";
  return l.toFixed(0) + " L";
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "text-[var(--color-valley-green)]",
    online: "text-[var(--color-valley-green)]",
    completed: "text-green-400",
    paused: "text-[var(--color-valley-green)]",
    created: "text-slate-400",
    aborted: "text-[var(--color-valley-green)]",
    offline: "text-slate-500",
    maintenance: "text-[var(--color-valley-green)]",
    inactive: "text-slate-500",
  };
  return colors[status] || "text-slate-400";
}

export function getStatusBg(status: string): string {
  const bgs: Record<string, string> = {
    active: "bg-emerald-400/10 border-emerald-400/20 text-[var(--color-valley-green)]",
    online: "bg-emerald-400/10 border-emerald-400/20 text-[var(--color-valley-green)]",
    completed: "bg-green-400/10 border-green-400/20 text-green-400",
    paused: "bg-emerald-400/10 border-emerald-400/20 text-[var(--color-valley-green)]",
    created: "bg-slate-400/10 border-slate-400/20 text-slate-400",
    aborted: "bg-emerald-400/10 border-emerald-400/20 text-[var(--color-valley-green)]",
    offline: "bg-slate-400/10 border-slate-400/20 text-slate-500",
    maintenance: "bg-emerald-400/10 border-emerald-400/20 text-[var(--color-valley-green)]",
  };
  return bgs[status] || "bg-slate-400/10 border-slate-400/20 text-slate-400";
}
