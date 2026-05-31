"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export type KpiVariant = "blue" | "amber" | "neutral" | "rose";

interface KpiCardProps {
  id: string;
  icon: React.ReactNode;
  value: string | number | null;
  prevValue?: number | null;
  label: string;
  sublabel?: { text: string; alert: boolean };
  tooltip?: string;
  warn?: boolean;
  variant?: KpiVariant;
  lowerIsBetter?: boolean;
  href?: string;
}

const VARIANT_STYLES: Record<KpiVariant, { icon: string; ring: string }> = {
  // blue = operational / volume metric — valley green tones
  blue: {
    icon: "bg-[var(--green-010)] border-[var(--green-020)] text-[var(--color-valley-green)]",
    ring: "hover:border-[var(--color-valley-green)] hover:shadow-[0_0_0_3px_var(--green-010)]",
  },
  // amber = compliance / temporal constraint — warm amber-brown
  amber: {
    icon: "bg-[rgba(74,50,18,0.08)] border-[rgba(74,50,18,0.18)] text-[var(--color-amber-seed)]",
    ring: "hover:border-[var(--color-amber-seed)] hover:shadow-[0_0_0_3px_rgba(74,50,18,0.06)]",
  },
  // neutral = storage / inventory
  neutral: {
    icon: "bg-[var(--black-004)] border-[var(--black-008)] text-[var(--text-secondary)]",
    ring: "hover:border-[var(--color-valley-green)] hover:shadow-md",
  },
  // rose = plant stress / satellite warning
  rose: {
    icon: "bg-red-500/10 border-red-500/20 text-red-600",
    ring: "hover:border-red-400 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]",
  },
};

const WARN_STYLES = {
  icon: "bg-red-500/10 border-red-500/20 text-red-600",
  ring: "hover:border-red-400 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]",
};

// ─── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({
  current,
  previous,
  lowerIsBetter = false,
}: {
  current: number;
  previous: number | null;
  lowerIsBetter?: boolean;
}) {
  if (previous === null || previous === current) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[var(--text-tertiary)] bg-[var(--black-004)] rounded-full px-1.5 py-0.5">
        <Minus className="w-2.5 h-2.5" />
        —
      </span>
    );
  }
  const delta = current - previous;
  const isPositive = delta > 0;
  const isGood = lowerIsBetter ? !isPositive : isPositive;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5",
        isGood
          ? "bg-[var(--green-010)] text-[var(--color-valley-green)]"
          : "bg-red-500/10 text-red-600"
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {isPositive ? "+" : ""}
      {delta}
    </span>
  );
}

// ─── KpiCard Component ────────────────────────────────────────────────────────
export default function KpiCard({
  id,
  icon,
  value,
  prevValue,
  label,
  sublabel,
  tooltip,
  warn,
  variant = "neutral",
  lowerIsBetter = false,
  href,
}: KpiCardProps) {
  const s = warn ? WARN_STYLES : VARIANT_STYLES[variant];

  const inner = (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Icon bucket */}
        <div
          className={cn(
            "w-10 h-10 rounded-[var(--radius-card)] border flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105",
            s.icon
          )}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Value row + trend */}
          <div className="flex items-center gap-2 mb-0.5">
            {value === null ? (
              <div className="h-6 w-16 bg-[var(--color-stone-moss)] rounded animate-pulse" />
            ) : (
              <p className="text-xl font-extrabold text-[var(--text-primary)] font-sans tracking-tight leading-none">
                {value}
              </p>
            )}
            {value !== null &&
              typeof value === "number" &&
              prevValue !== undefined && (
                <TrendBadge
                  current={value}
                  previous={prevValue ?? null}
                  lowerIsBetter={lowerIsBetter}
                />
              )}
          </div>

          {/* Label — short, native tooltip for full text */}
          <p
            className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider leading-tight truncate"
            title={tooltip}
          >
            {label}
          </p>

          {/* Sub-label */}
          {sublabel && (
            <p
              className={cn(
                "text-[10px] mt-0.5 flex items-center gap-1 font-medium",
                sublabel.alert
                  ? "text-red-600 font-semibold"
                  : "text-[var(--text-tertiary)]/70"
              )}
            >
              {sublabel.alert && (
                <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
              )}
              {sublabel.text}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Chevron indicator */}
      {href && (
        <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--color-valley-green)]" />
      )}
    </div>
  );

  const className = cn(
    "group flex items-center p-5 rounded-[var(--radius-card)] border bg-[var(--surface-pure)] border-[var(--color-mist-gray)] shadow-sm transition-all duration-300 hover:-translate-y-0.5",
    href && s.ring,
    href && "cursor-pointer"
  );

  if (href) {
    return (
      <Link id={id} href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <div id={id} className={className}>
      {inner}
    </div>
  );
}
