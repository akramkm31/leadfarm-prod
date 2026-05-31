"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  color: "emerald" | "cyan" | "amber" | "red" | "violet";
}

const colorMap = {
  emerald: {
    icon: "from-green-600/25 to-green-700/15 border-green-500/25",
    iconColor: "text-green-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(74,124,89,0.15)]",
  },
  cyan: {
    icon: "from-green-500/25 to-green-600/15 border-green-500/20",
    iconColor: "text-green-300",
    glow: "group-hover:shadow-[0_0_30px_rgba(107,158,122,0.15)]",
  },
  amber: {
    icon: "from-amber-500/25 to-amber-600/15 border-[var(--color-valley-green)]/25",
    iconColor: "text-[var(--color-valley-green)]",
    glow: "group-hover:shadow-[0_0_30px_rgba(232,168,56,0.15)]",
  },
  red: {
    icon: "from-red-500/20 to-red-600/10 border-[var(--color-valley-green)]/20",
    iconColor: "text-[var(--color-valley-green)]",
    glow: "group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]",
  },
  violet: {
    icon: "from-violet-500/20 to-violet-600/10 border-[var(--color-valley-green)]/20",
    iconColor: "text-[var(--color-valley-green)]",
    glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
  },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color }: StatsCardProps) {
  const c = colorMap[color];

  return (
    <div className={cn("glass-card group p-5 cursor-default", c.glow)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-adaline-ink)]/45 uppercase tracking-wider">{title}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-adaline-ink)]/90 tracking-tight animate-count">{value}</span>
            {trend !== undefined && (
              <span className={cn(
                "text-xs font-semibold",
                trend >= 0 ? "text-green-400" : "text-[var(--color-valley-green)]"
              )}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[11px] text-[var(--color-adaline-ink)]/35 mt-0.5">{subtitle}</span>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br border",
          c.icon
        )}>
          <Icon className={cn("w-5 h-5", c.iconColor)} />
        </div>
      </div>
    </div>
  );
}
