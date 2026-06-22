import Link from "next/link";
import type { DashboardKPIs } from "@/lib/data-provider";
import { CalendarClock, Package, ClipboardCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  kpis: DashboardKPIs | null;
  loading?: boolean;
};

type KpiItem = {
  key: string;
  icon: typeof ClipboardCheck;
  label: string;
  value: string;
  href?: string;
};

export default function DashboardKpiStrip({ kpis, loading }: Props) {
  if (loading || !kpis) {
    return (
      <div className="dash-kpi-strip" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-40 rounded-full bg-chalk" />
        ))}
      </div>
    );
  }

  const items: KpiItem[] = [];

  if (kpis.pendingApproval > 0) {
    items.push({
      key: "pending",
      icon: ClipboardCheck,
      label: "Validations",
      value: `${kpis.pendingApproval} en attente`,
      href: "/treatments?status=pending_approval",
    });
  }

  if (kpis.parcellesEnDAR > 0) {
    items.push({
      key: "dar",
      icon: CalendarClock,
      label: "DAR actif",
      value: `${kpis.parcellesEnDAR} parcelle(s)`,
      href: "/treatments",
    });
  }

  if (kpis.expiryCount > 0) {
    items.push({
      key: "expiry",
      icon: Package,
      label: "Stock",
      value: `${kpis.expiryCount} produit(s)`,
      href: "/stock",
    });
  }

  if (kpis.stressedParcels > 0) {
    items.push({
      key: "stress",
      icon: AlertTriangle,
      label: "Parcelles",
      value: `${kpis.stressedParcels} zone(s) stressées`,
      href: "/parcelles",
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="dash-kpi-strip" role="list" aria-label="Indicateurs opérationnels">
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon className="opacity-60" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-wider text-graphite">
              {item.label}
            </span>
            <span className="font-medium text-void">{item.value}</span>
          </>
        );

        if (item.href) {
          return (
            <Button key={item.key} variant="ghost" size="sm" className="rounded-full" asChild>
              <Link href={item.href} role="listitem">
                {content}
              </Link>
            </Button>
          );
        }

        return (
          <Button key={item.key} variant="ghost" size="sm" className="rounded-full" role="listitem">
            {content}
          </Button>
        );
      })}
    </div>
  );
}
