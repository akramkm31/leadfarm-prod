"use client";

import AppLayout from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

export default function McdPageShell({
  title,
  subtitle,
  icon,
  action,
  loading,
  children,
  className,
}: Props) {
  return (
    <AppLayout>
      <div className={cn("max-w-6xl mx-auto py-8 px-4", className)}>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-forest-dew)] border border-[var(--color-stone-moss)] flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-[var(--color-adaline-ink)] tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-[var(--color-mist-gray)] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-valley-green)]" />
          </div>
        ) : (
          children
        )}
      </div>
    </AppLayout>
  );
}
