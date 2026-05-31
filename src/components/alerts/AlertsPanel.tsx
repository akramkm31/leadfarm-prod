"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlerts } from "@/hooks/useData";
import type { Alert } from "@/lib/mock-data";
import { updateAlert, acknowledgeAllAlerts } from "@/lib/data-provider";
import { AlertService } from "@/lib/services/alert.service";
import { alertTypeLabel } from "@/lib/ux-labels";
import { cn } from "@/lib/utils";
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
  X,
  Bell,
  ExternalLink,
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

const severityStyles = {
  info: "border-[var(--color-stone-moss)] bg-[#f5f8ec]",
  warning: "border-amber-200 bg-amber-50/80",
  critical: "border-red-200 bg-red-50/80",
};

type Props = {
  open: boolean;
  highlightId: string | null;
  onClose: () => void;
};

export default function AlertsPanel({ open, highlightId, onClose }: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: alertsRaw, loading, refetch } = useAlerts();
  const alerts = (alertsRaw || []) as Alert[];

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"unack" | "acked" | "all">("unack");
  const [acking, setAcking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setTab("unack");
    setExpandedId(highlightId);
  }, [open, highlightId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !highlightId) return;
    requestAnimationFrame(() => {
      document.getElementById(`alert-row-${highlightId}`)?.scrollIntoView({ block: "nearest" });
    });
  }, [open, highlightId, loading]);

  const handleAckAll = useCallback(async () => {
    setAcking(true);
    try {
      await acknowledgeAllAlerts();
      await refetch();
    } catch {
      /* boundary */
    }
    setAcking(false);
  }, [refetch]);

  const handleAckOne = useCallback(
    async (id: string) => {
      try {
        await updateAlert(id, { acknowledged: true });
        await refetch();
      } catch {
        /* boundary */
      }
    },
    [refetch]
  );

  const handleAction = useCallback(
    (alert: Alert) => {
      const action = AlertService.getActionForAlert(alert as Parameters<typeof AlertService.getActionForAlert>[0]);
      if (!action) return;
      onClose();
      router.push(action.url);
    },
    [onClose, router]
  );

  if (!open) return null;

  const matchesSearch = (a: Alert) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.message.toLowerCase().includes(q) || a.type.toLowerCase().includes(q);
  };

  const unack = alerts.filter((a) => !a.acknowledged && matchesSearch(a));
  const acked = alerts.filter((a) => a.acknowledged && matchesSearch(a));
  const totalUnack = alerts.filter((a) => !a.acknowledged).length;

  const visible =
    tab === "unack" ? unack : tab === "acked" ? acked : [...unack, ...acked];

  const renderAlert = (alert: Alert) => {
    const Icon = typeIcons[alert.type] || AlertTriangle;
    const isExpanded = expandedId === alert.id;
    const isHighlighted = highlightId === alert.id;
    const action = AlertService.getActionForAlert(
      alert as Parameters<typeof AlertService.getActionForAlert>[0]
    );
    const severity = severityStyles[alert.severity as keyof typeof severityStyles] || severityStyles.info;

    return (
      <div
        key={alert.id}
        id={`alert-row-${alert.id}`}
        className={cn(
          "rounded-[8px] border transition-colors",
          severity,
          isHighlighted && "ring-2 ring-[var(--color-valley-green)]/40"
        )}
      >
        <button
          type="button"
          className="w-full flex items-start gap-3 p-3 text-left"
          onClick={() => setExpandedId(isExpanded ? null : alert.id)}
        >
          <div className="w-8 h-8 rounded-lg bg-white/70 border border-[var(--color-stone-moss)] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-[var(--color-valley-green)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-adaline-ink)] line-clamp-2">{alert.message}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="mono text-[9px] text-[var(--color-mist-gray)] uppercase">
                {alertTypeLabel(alert.type)}
              </span>
              <span className="mono text-[9px] text-[var(--color-mist-gray)]">
                {new Date(alert.timestamp).toLocaleString("fr-FR")}
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn("w-4 h-4 shrink-0 text-[var(--color-mist-gray)] transition-transform", isExpanded && "rotate-180")}
          />
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t border-[var(--color-stone-moss)]/60 mx-3 mb-3">
            <p className="text-sm text-[var(--color-adaline-ink)]/80 leading-relaxed mt-3">{alert.message}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {!alert.acknowledged && (
                <button
                  type="button"
                  onClick={() => handleAckOne(alert.id)}
                  className="lf-btn lf-btn-tertiary !h-8 !text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Acquitter
                </button>
              )}
              {action && !alert.acknowledged && (
                <button
                  type="button"
                  onClick={() => handleAction(alert)}
                  className="lf-btn lf-btn-primary !h-8 !text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              )}
              {alert.acknowledged && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-valley-green)]">
                  <Check className="w-3.5 h-3.5" />
                  Acquittée
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center p-4 pt-[8vh] sm:pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Alertes"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl max-h-[min(82vh,720px)] flex flex-col rounded-[10px] border border-[var(--color-stone-moss)] bg-[var(--color-canvas-ice)] shadow-xl animate-page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-stone-moss)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-forest-dew)] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[var(--color-valley-green)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--color-adaline-ink)]">Alertes</h2>
              <p className="text-xs text-[var(--color-mist-gray)] mt-0.5">
                {loading ? "Chargement…" : `${totalUnack} non acquittée(s) · ${alerts.length} total`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f1f5e6] text-[var(--color-mist-gray)]"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b border-[var(--color-stone-moss)] shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mist-gray)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une alerte…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-stone-moss)] bg-white outline-none focus:border-[var(--color-valley-green)]"
            />
          </div>
          {totalUnack > 0 && (
            <button
              type="button"
              onClick={handleAckAll}
              disabled={acking}
              className="lf-btn lf-btn-tertiary !h-9 shrink-0 disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {acking ? "En cours…" : "Tout acquitter"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-[var(--color-stone-moss)] shrink-0 overflow-x-auto">
          {(
            [
              { value: "unack" as const, label: `Non acquittées (${unack.length})` },
              { value: "acked" as const, label: `Acquittées (${acked.length})` },
              { value: "all" as const, label: `Toutes (${unack.length + acked.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                tab === t.value
                  ? "bg-[var(--color-valley-green)] text-white border-[var(--color-valley-green)]"
                  : "text-[var(--color-mist-gray)] border-transparent hover:bg-[#f1f5e6]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-[var(--color-mist-gray)]">Chargement des alertes…</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-mist-gray)]">
              {search ? "Aucune alerte ne correspond à votre recherche." : "Aucune alerte dans cette catégorie."}
            </div>
          ) : (
            visible.map(renderAlert)
          )}
        </div>
      </div>
    </div>
  );
}
