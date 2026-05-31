import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DashboardKPIs } from "@/lib/data-provider";
import { CalendarClock, Package, MapPin, ClipboardCheck, AlertTriangle } from "lucide-react";

type Props = {
  kpis: DashboardKPIs | null;
  loading?: boolean;
};

export default function DashboardInsights({ kpis, loading }: Props) {
  if (loading || !kpis) {
    return (
      <div className="dash-insights dash-insights-skeleton" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="dash-insight-pill animate-pulse bg-[#f5f8ec]" />
        ))}
      </div>
    );
  }

  const items: {
    key: string;
    icon: typeof MapPin;
    label: string;
    value: string;
    href?: string;
    tone?: "ok" | "warn" | "danger";
  }[] = [];

  if (kpis.pendingApproval > 0) {
    items.push({
      key: "pending",
      icon: ClipboardCheck,
      label: "Validations",
      value: `${kpis.pendingApproval} traitement(s) en attente`,
      href: "/treatments?status=pending_approval",
      tone: "warn",
    });
  }

  if (kpis.parcellesEnDAR > 0) {
    items.push({
      key: "dar",
      icon: CalendarClock,
      label: "DAR actif",
      value: `${kpis.parcellesEnDAR} parcelle(s) en délai avant récolte`,
      href: "/treatments",
      tone: "warn",
    });
  }

  if (kpis.prochainRecolte) {
    items.push({
      key: "recolte",
      icon: MapPin,
      label: "Récolte",
      value: `${kpis.prochainRecolte.parcelleName} · ${new Date(kpis.prochainRecolte.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`,
      href: "/trace",
    });
  }

  if (kpis.expiryCount > 0) {
    items.push({
      key: "expiry",
      icon: Package,
      label: "Stock",
      value: `${kpis.expiryCount} produit(s) proche péremption`,
      href: "/stock",
      tone: "danger",
    });
  }

  if (kpis.stressedParcels > 0) {
    items.push({
      key: "stress",
      icon: AlertTriangle,
      label: "Parcelles",
      value: `${kpis.stressedParcels} zone(s) à traiter`,
      href: "/parcelles",
      tone: "warn",
    });
  }

  if (items.length === 0) {
    return (
      <div className="dash-insights">
        <div className="dash-insight-pill dash-insight-ok">
          <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-valley-green)]">
            Exploitation sous contrôle
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-insights">
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <div
            className={cn(
              "dash-insight-pill",
              item.tone === "warn" && "dash-insight-warn",
              item.tone === "danger" && "dash-insight-danger"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={1.6} />
            <span className="dash-insight-lbl mono">{item.label}</span>
            <span className="dash-insight-val">{item.value}</span>
          </div>
        );
        return item.href ? (
          <Link key={item.key} href={item.href} className="hover:opacity-90 transition-opacity">
            {inner}
          </Link>
        ) : (
          <div key={item.key}>{inner}</div>
        );
      })}
    </div>
  );
}
