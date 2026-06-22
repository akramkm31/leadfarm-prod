"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SatelliteAlertRow } from "@/lib/satellite/alerts";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";

type Props = {
  alerts: SatelliteAlertRow[];
  onMarkRead: (id: string) => void;
};

const severityStyle = {
  faible: "border-amber-200 bg-amber-50 text-amber-900",
  moyen: "border-orange-200 bg-orange-50 text-orange-900",
  critique: "border-red-200 bg-red-50 text-red-900",
};

export default function SatelliteAlertsPanel({ alerts, onMarkRead }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = alerts.filter((a) => !a.lu);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Alertes satellite${unread.length ? `, ${unread.length} non lues` : ""}`}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-full border transition-colors",
          unread.length > 0
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-[var(--black-008)] bg-[var(--surface-pure)] text-[var(--text-secondary)] hover:bg-[var(--black-004)]"
        )}
      >
        <Bell className="w-4 h-4" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[var(--black-008)] bg-[var(--surface-pure)] shadow-xl overflow-hidden"
          role="dialog"
          aria-label="Alertes satellite"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--black-008)] bg-[var(--black-004)]">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-3.5 h-3.5 text-[var(--interactive-green)] shrink-0" />
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">Alertes satellite</p>
              {unread.length > 0 && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">
                  {unread.length}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[min(60vh,320px)] overflow-y-auto p-2 space-y-1.5">
            {!alerts.length ? (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-[var(--leaf-green)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Aucune alerte active.
              </div>
            ) : (
              alerts.map((alert) => (
                <article
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-2 p-2.5 rounded-xl border text-xs",
                    severityStyle[alert.severite],
                    alert.lu && "opacity-55"
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[10px] uppercase tracking-wide opacity-80 truncate">
                      {alert.parcelle_name ?? alert.parcelle_id}
                    </p>
                    <p className="mt-0.5 leading-snug line-clamp-3">{alert.message}</p>
                    <p className="text-[9px] mt-1 opacity-70">{alert.date_analyse}</p>
                  </div>
                  {!alert.lu && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(alert.id)}
                      className="shrink-0 text-[9px] font-bold uppercase tracking-wide underline opacity-80 hover:opacity-100"
                    >
                      Lu
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
