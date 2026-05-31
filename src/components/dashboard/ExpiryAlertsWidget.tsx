"use client";

import { useState, useEffect } from "react";
import { fetchExpiryAlerts, type ExpiryAlert } from "@/lib/data-provider";
import { cn } from "@/lib/utils";
import { AlertTriangle, Package, Clock, Loader2, CheckCircle2 } from "lucide-react";

const LEVEL_CONFIG = {
  j0:  { label: "PÉRIMÉ",   bg: "bg-[var(--color-valley-green)]/10 border-[var(--color-valley-green)]/25",    text: "text-[var(--color-valley-green)]",    dot: "bg-[var(--color-valley-green)]"    },
  j7:  { label: "J-7",      bg: "bg-[var(--color-valley-green)]/[0.07] border-[var(--color-valley-green)]/20", text: "text-[var(--color-valley-green)]",   dot: "bg-emerald-400"    },
  j15: { label: "J-15",     bg: "bg-[var(--color-valley-green)]/[0.07] border-[var(--color-valley-green)]/20", text: "text-[var(--color-valley-green)]", dot: "bg-[var(--color-valley-green)]" },
  j30: { label: "J-30",     bg: "bg-[var(--color-valley-green)]/[0.06] border-emerald-500/15", text: "text-[var(--color-valley-green)]", dot: "bg-[var(--color-valley-green)]" },
};

export default function ExpiryAlertsWidget() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiryAlerts().then(data => {
      setAlerts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="rounded-2xl border border-[#e0e5d5] bg-[#fbfdf6] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--color-valley-green)]" />
          <h3 className="text-xs font-bold text-[var(--color-adaline-ink)]/60 uppercase tracking-widest">Alertes Péremption</h3>
        </div>
        {!loading && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            alerts.length > 0 ? "bg-[var(--color-valley-green)]/15 text-[var(--color-valley-green)]" : "bg-[#203b14]/10 text-[#203b14]"
          )}>
            {alerts.length} lot{alerts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[#31200b]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Vérification...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-xs text-[#203b14]">
          <CheckCircle2 className="w-4 h-4" />
          Aucun lot n'expire dans les 30 prochains jours
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 8).map(alert => {
            const cfg = LEVEL_CONFIG[alert.level];
            return (
              <div key={alert.lot_id} className={cn("flex items-center gap-3 p-3 rounded-xl border", cfg.bg)}>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-adaline-ink)]/80 truncate">{alert.produit_nom}</p>
                  <p className="text-[10px] text-[#31200b]">Lot {alert.numero_lot} · {alert.stock_disponible.toFixed(1)} {alert.unite}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={cn("text-xs font-bold", cfg.text)}>{cfg.label}</span>
                  <p className="text-[10px] text-[#31200b]">
                    {new Date(alert.date_peremption).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            );
          })}
          {alerts.length > 8 && (
            <p className="text-[10px] text-[#31200b] text-center">+{alerts.length - 8} autres lots</p>
          )}
        </div>
      )}
    </div>
  );
}
