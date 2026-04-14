"use client";

import { useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAlerts } from "@/hooks/useData";
import type { Alert } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { updateAlert, acknowledgeAllAlerts } from "@/lib/data-provider";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Calendar,
  Clock,
  Check,
  CheckCheck,
  Search,
  ChevronDown,
} from "lucide-react";

const typeIcons: Record<string, typeof AlertTriangle> = {
  low_stock: TrendingDown,
  critical_stock: Package,
  negative_stock: Package,
  treatment_overdue: Calendar,
  parcel_untreated: Clock,
  stock_expiry: AlertTriangle,
  device_offline: AlertTriangle,
};

const typeLabels: Record<string, string> = {
  low_stock: "Stock bas",
  critical_stock: "Stock critique",
  negative_stock: "Stock négatif",
  treatment_overdue: "Traitement en retard",
  parcel_untreated: "Parcelle non traitée",
  stock_expiry: "Expiration stock",
  device_offline: "Appareil hors ligne",
};

const severityLabels: Record<string, string> = {
  info: "Info",
  warning: "Attention",
  critical: "Critique",
};

const severityStyles = {
  info: {
    bg: "bg-cyan-400/10 border-cyan-400/20",
    icon: "text-cyan-400",
    badge: "badge-info",
  },
  warning: {
    bg: "bg-amber-400/10 border-amber-400/20",
    icon: "text-amber-400",
    badge: "badge-warning",
  },
  critical: {
    bg: "bg-red-400/10 border-red-400/20",
    icon: "text-red-400",
    badge: "badge-danger",
  },
};

type AlertGroup = {
  type: string;
  severity: string;
  count: number;
  alerts: Alert[];
  latestTimestamp: string;
  expanded: boolean;
};

function groupAlerts(alerts: Alert[]): AlertGroup[] {
  const map = new Map<string, Alert[]>();
  for (const a of alerts) {
    const key = `${a.type}::${a.severity}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .map(([key, group]) => ({
      type: group[0].type,
      severity: group[0].severity,
      count: group.length,
      alerts: group.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      latestTimestamp: group.reduce((latest, a) => a.timestamp > latest ? a.timestamp : latest, group[0].timestamp),
      expanded: false,
    }))
    .sort((a, b) => b.count - a.count);
}

export default function AlertsPage() {
  const { data: alertsRaw, loading, refetch } = useAlerts();
  const [acking, setAcking] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleAckAll = useCallback(async () => {
    setAcking(true);
    try { await acknowledgeAllAlerts(); await refetch(); } catch {}
    setAcking(false);
  }, [refetch]);

  const handleAckOne = useCallback(async (id: string) => {
    try { await updateAlert(id, { acknowledged: true }); await refetch(); } catch {}
  }, [refetch]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const alerts = (alertsRaw || []) as Alert[];

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"unack" | "acked" | "all">("unack");

  if (loading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  const matchesSearch = (a: Alert) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.message.toLowerCase().includes(q) || a.type.toLowerCase().includes(q);
  };

  const unack = alerts.filter((a) => !a.acknowledged && matchesSearch(a));
  const acked = alerts.filter((a) => a.acknowledged && matchesSearch(a));
  const totalUnack = alerts.filter((a) => !a.acknowledged).length;

  return (
    <AppLayout>
      <div className="mb-8 bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Alertes</h1>
            <p className="text-sm text-white/60 mt-1">
              {totalUnack} non acquittées · {alerts.length} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="glass-input pl-9 pr-4 py-2 text-sm w-52"
              />
            </div>
            <button
              onClick={handleAckAll}
              disabled={acking}
              className="glass-button-danger px-4 py-2.5 flex items-center gap-2 text-sm rounded-xl font-semibold backdrop-blur-[10px] transition-all hover:transform hover:-translate-y-px disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {acking ? "En cours..." : "Tout acquitter"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-6">
        {([
          { value: "unack" as const, label: `Non acquittées (${unack.length})` },
          { value: "acked" as const, label: `Acquittées (${acked.length})` },
          { value: "all" as const, label: `Toutes (${unack.length + acked.length})` },
        ]).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              tab === t.value
                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                : "text-white/40 hover:text-white/60 border-transparent hover:bg-white/[0.04]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "unack" || tab === "all") && unack.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Non acquittées ({unack.length})
          </h2>
          <div className="space-y-3">
            {groupAlerts(unack).map((group) => {
              const Icon = typeIcons[group.type] || AlertTriangle;
              const severity = severityStyles[group.severity as keyof typeof severityStyles] || severityStyles.warning;
              const groupKey = `${group.type}::${group.severity}`;
              const isExpanded = expandedGroups.has(groupKey);

              return (
                <div key={groupKey}>
                  {/* Group header */}
                  <div
                    onClick={() => toggleGroup(groupKey)}
                    className={cn("glass-card p-5 border cursor-pointer", severity.bg)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", severity.bg)}>
                        <Icon className={cn("w-5 h-5", severity.icon)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white/85">
                            {typeLabels[group.type] || group.type}
                          </span>
                          <span className={cn("badge text-[10px]", severity.badge)}>
                            {severityLabels[group.severity] || group.severity}
                          </span>
                          <span className="inline-flex items-center justify-center min-w-[24px] h-5 rounded-full bg-white/10 text-[10px] font-bold text-white/70 px-1.5">
                            {group.count}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {group.count} alerte{group.count > 1 ? "s" : ""} du même type
                          {group.count > 1 && ` — ${group.alerts[0].message.split(" pour ").pop()}, ${group.alerts[1]?.message.split(" pour ").pop() || ""}...`}
                        </p>
                        <span className="text-[10px] text-white/40 font-mono mt-1 block">
                          Dernière : {new Date(group.latestTimestamp).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            group.alerts.forEach((a) => handleAckOne(a.id));
                          }}
                          className="glass-button px-3 py-1.5 text-xs"
                          title="Acquitter tout le groupe"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                        <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded individual alerts */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1.5 border-l-2 border-white/[0.06] pl-4">
                      {group.alerts.slice(0, 20).map((alert) => (
                        <div key={alert.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-black/20">
                          <p className="text-xs text-white/45 flex-1 truncate">{alert.message}</p>
                          <span className="text-[10px] text-white/35 font-mono whitespace-nowrap">
                            {new Date(alert.timestamp).toLocaleString("fr-FR")}
                          </span>
                          <button
                            onClick={() => handleAckOne(alert.id)}
                            className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/60 transition-colors"
                            title="Acquitter"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {group.alerts.length > 20 && (
                        <p className="text-[10px] text-white/35 px-3 py-1">
                          ... et {group.alerts.length - 20} autres alertes
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(tab === "acked" || tab === "all") && acked.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Acquittées ({acked.length})
          </h2>
          <div className="space-y-2">
            {acked.map((alert) => {
              const Icon = typeIcons[alert.type] || AlertTriangle;

              return (
                <div key={alert.id} className="glass-card p-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-white/40" />
                    <p className="text-xs text-white/40 flex-1">{alert.message}</p>
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="w-3 h-3" /> Acquittée
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="h-8" />
    </AppLayout>
  );
}
