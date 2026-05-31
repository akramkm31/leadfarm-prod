"use client";

import { useAlerts } from "@/hooks/useData";
import type { Alert } from "@/lib/database.types";
import { AlertService } from "@/lib/services/alert.service";
import { useRouter } from "next/navigation";
import { useAlertsPanel } from "@/components/alerts/AlertsProvider";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Calendar,
  Clock,
  Check,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

const iconMap: Record<string, typeof AlertTriangle> = {
  low_stock: TrendingDown,
  critical_stock: Package,
  treatment_overdue: Calendar,
  parcel_untreated: Clock,
  stock_expiry: AlertTriangle,
  device_offline: AlertTriangle,
  dar_violation: ShieldAlert,
};

type SeverityStyle = {
  bg: string;
  border: string;
  icon: string;
  btn: string;
  badge: string;
};

const severityMap: Record<"info" | "warning" | "critical", SeverityStyle> = {
  info: {
    bg: "bg-[var(--color-canvas-ice)] hover:bg-[var(--color-stone-moss)]/40",
    border: "border-[var(--color-stone-moss)]",
    icon: "text-[var(--color-valley-green)] bg-[var(--green-010)]",
    btn: "bg-[var(--color-valley-green)]/10 text-[var(--color-valley-green)] hover:bg-[var(--color-valley-green)]/20 border border-[var(--color-valley-green)]/20",
    badge: "bg-[var(--color-stone-moss)] text-[var(--color-valley-green)]/80",
  },
  warning: {
    bg: "bg-[rgba(74,50,18,0.02)] hover:bg-[rgba(74,50,18,0.05)]",
    border: "border-[rgba(74,50,18,0.12)]",
    icon: "text-[var(--color-amber-seed)] bg-[rgba(74,50,18,0.08)]",
    btn: "bg-[var(--color-amber-seed)]/10 text-[var(--color-amber-seed)] hover:bg-[var(--color-amber-seed)]/20 border border-[rgba(74,50,18,0.2)]",
    badge: "bg-[rgba(74,50,18,0.08)] text-[var(--color-amber-seed)]",
  },
  critical: {
    bg: "bg-red-500/[0.02] hover:bg-red-500/[0.05]",
    border: "border-red-500/10",
    icon: "text-red-600 bg-red-500/10",
    btn: "bg-red-600/10 text-red-600 hover:bg-red-600/20 border border-red-500/20",
    badge: "bg-red-500/10 text-red-600",
  },
};

export default function AlertsFeed() {
  const router = useRouter();
  const { openAlerts } = useAlertsPanel();
  const { data: alertsRaw } = useAlerts();
  const alerts = (alertsRaw || []) as Alert[];

  const sortedAlerts = [...alerts]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="rounded-[var(--radius-apple)] border border-[var(--color-stone-moss)] bg-[var(--surface-pure)] p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--color-stone-moss)]">
        <div>
          <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/65 uppercase tracking-widest">
            Alertes Récentes
          </h3>
          <p className="text-[10px] text-[var(--text-tertiary)]/80 font-medium mt-0.5">
            {activeAlertsCount > 0 ? (
              <span className="text-[var(--color-amber-seed)] font-semibold">
                {activeAlertsCount} active{activeAlertsCount > 1 ? "s" : ""}
              </span>
            ) : (
              "Aucune alerte en attente"
            )}
          </p>
        </div>
        <button
          onClick={() => openAlerts()}
          className="group text-[10px] font-bold text-[var(--color-valley-green)] hover:opacity-80 transition-all flex items-center gap-0.5"
        >
          Voir tout
          <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {sortedAlerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[var(--text-tertiary)] font-medium">
              Aucune alerte enregistrée.
            </p>
          </div>
        ) : (
          sortedAlerts.map((alert) => {
            const Icon = iconMap[alert.type] || AlertTriangle;
            const severity = severityMap[alert.severity] || severityMap.info;
            const action = AlertService.getActionForAlert(alert);

            return (
              <div
                key={alert.id}
                className={cn(
                  "group flex gap-4 p-4 rounded-[var(--radius-card)] border transition-all duration-300",
                  severity.bg,
                  severity.border,
                  alert.acknowledged && "opacity-45 grayscale hover:grayscale-0"
                )}
              >
                {/* Icon bucket */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl border border-transparent flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105",
                    severity.icon
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content block */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-secondary)] font-semibold leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--color-stone-moss)]/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[var(--text-tertiary)]/75 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {alert.acknowledged && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-valley-green)]">
                          <Check className="w-2.5 h-2.5" /> Acquittée
                        </span>
                      )}
                    </div>

                    {!alert.acknowledged && action && (
                      <button
                        onClick={() => router.push(action.url)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-200",
                          severity.btn
                        )}
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
