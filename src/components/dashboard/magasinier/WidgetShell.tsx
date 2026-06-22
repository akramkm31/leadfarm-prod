"use client";

import { cn } from "@/lib/utils";

type Tone = "ink" | "red" | "amber" | "green";

const COUNT_TONE: Record<Tone, string> = {
  ink: "bg-[var(--color-stone-moss)]/60 text-[var(--color-adaline-ink)]/70",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
};

export function WidgetShell({
  icon,
  title,
  count,
  countTone = "ink",
  action,
  children,
  bare = false,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  countTone?: Tone;
  action?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;
}) {
  if (bare) {
    return <div className="flex flex-col">{children}</div>;
  }
  return (
    <div className="rounded-2xl border border-[var(--color-stone-moss)] bg-white/60 p-4 flex flex-col min-h-[180px]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[var(--color-valley-green)] shrink-0">{icon}</span>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-adaline-ink)]/70 truncate">
            {title}
          </h3>
          {count != null && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", COUNT_TONE[countTone])}>
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export function WidgetEmpty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-6 gap-2 text-center">
      <span className="text-[var(--color-adaline-ink)]/25">{icon}</span>
      <p className="text-[11px] text-[var(--color-adaline-ink)]/45">{label}</p>
    </div>
  );
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function formatQty(n: number): string {
  const abs = Math.abs(n);
  return abs >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Number.isInteger(n) ? n : n.toFixed(1)}`;
}
