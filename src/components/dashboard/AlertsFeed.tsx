"use client";

import { useAlerts } from "@/hooks/useData";
import type { Alert } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Calendar,
  Clock,
  Check,
} from "lucide-react";

const iconMap: Record<string, typeof AlertTriangle> = {
  low_stock: TrendingDown,
  critical_stock: Package,
  treatment_overdue: Calendar,
  parcel_untreated: Clock,
  stock_expiry: AlertTriangle,
  device_offline: AlertTriangle,
};

const severityMap = {
  info: { bg: "bg-cyan-400/10 border-cyan-400/20", icon: "text-cyan-400" },
  warning: { bg: "bg-amber-400/10 border-amber-400/20", icon: "text-amber-400" },
  critical: { bg: "bg-red-400/10 border-red-400/20", icon: "text-red-400" },
};

export default function AlertsFeed() {
  const { data: alertsRaw } = useAlerts();
  const alerts = (alertsRaw || []) as Alert[];

  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/85">Alertes Récentes</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {alerts.filter((a) => !a.acknowledged).length} non acquittées
          </p>
        </div>
        <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
          Voir tout
        </button>
      </div>

      <div className="space-y-2">
        {sortedAlerts.slice(0, 5).map((alert) => {
          const Icon = iconMap[alert.type] || AlertTriangle;
          const severity = severityMap[alert.severity];

          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                severity.bg,
                alert.acknowledged && "opacity-50"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", severity.icon)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60 leading-relaxed">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-white/30 font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {alert.acknowledged && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="w-3 h-3" /> Acquittée
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
