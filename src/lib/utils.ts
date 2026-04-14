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
    active: "text-emerald-400",
    online: "text-emerald-400",
    completed: "text-green-400",
    paused: "text-amber-400",
    created: "text-slate-400",
    aborted: "text-red-400",
    offline: "text-slate-500",
    maintenance: "text-amber-400",
    inactive: "text-slate-500",
  };
  return colors[status] || "text-slate-400";
}

export function getStatusBg(status: string): string {
  const bgs: Record<string, string> = {
    active: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
    online: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
    completed: "bg-green-400/10 border-green-400/20 text-green-400",
    paused: "bg-amber-400/10 border-amber-400/20 text-amber-400",
    created: "bg-slate-400/10 border-slate-400/20 text-slate-400",
    aborted: "bg-red-400/10 border-red-400/20 text-red-400",
    offline: "bg-slate-400/10 border-slate-400/20 text-slate-500",
    maintenance: "bg-amber-400/10 border-amber-400/20 text-amber-400",
  };
  return bgs[status] || "bg-slate-400/10 border-slate-400/20 text-slate-400";
}
