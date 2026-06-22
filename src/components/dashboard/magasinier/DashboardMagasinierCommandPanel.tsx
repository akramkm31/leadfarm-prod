"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Scale,
  SprayCan,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MagasinierLead, MagasinierPanelKey, LeadTone } from "./useMagasinierMetrics";

const LEAD_ICONS: Record<LeadTone, typeof Clock> = {
  red: Clock,
  blue: SprayCan,
  amber: Scale,
  green: CheckCircle2,
};

type Props = {
  lead: MagasinierLead;
  expiryCount: number;
  urgentExpiry: number;
  reorderCount: number;
  critical: number;
  prepareCount: number;
  onOpenPanel: (key: MagasinierPanelKey) => void;
};

export default function DashboardMagasinierCommandPanel({
  lead,
  expiryCount,
  urgentExpiry,
  reorderCount,
  critical,
  prepareCount,
  onOpenPanel,
}: Props) {
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const LeadIcon = LEAD_ICONS[lead.tone];

  const expiryTone = urgentExpiry ? "red" : expiryCount ? "amber" : "green";
  const reorderTone = critical ? "red" : reorderCount ? "amber" : "green";

  return (
    <div className="mag-cmd floato" role="region" aria-label="Action du jour">
      <div className="mag-cmd-top">
        <span className="mag-cmd-kicker">
          <span className="mag-cmd-pulse" aria-hidden />
          Magasin · Action du jour
        </span>
        <span className="mag-cmd-date">{dateStr}</span>
      </div>

      <button
        type="button"
        className={cn("mag-cmd-lead", `mag-cmd-lead--${lead.tone}`)}
        onClick={() => onOpenPanel(lead.panel)}
      >
        <span className="mag-cmd-lead-ic">
          <LeadIcon className="w-[15px] h-[15px]" aria-hidden />
        </span>
        <span className="mag-cmd-lead-txt">
          <span className="mag-cmd-lead-title">{lead.title}</span>
          <span className="mag-cmd-lead-sub">{lead.sub}</span>
        </span>
        <ArrowRight className="mag-cmd-go w-[14px] h-[14px] shrink-0" aria-hidden />
      </button>

      <div className="mag-cmd-divider" />

      <div className="mag-cmd-stats">
        <StatBtn
          tone={expiryTone}
          count={expiryCount}
          label="Péremp. ≤30j"
          icon={Clock}
          onClick={() => onOpenPanel("peremptions")}
        />
        <StatBtn
          tone={reorderTone}
          count={reorderCount}
          label="Sous seuil"
          icon={Scale}
          onClick={() => onOpenPanel("reappro")}
        />
        <StatBtn
          tone="blue"
          count={prepareCount}
          label="À préparer"
          icon={SprayCan}
          onClick={() => onOpenPanel("preparer")}
        />
      </div>
    </div>
  );
}

function StatBtn({
  tone,
  count,
  label,
  icon: Icon,
  onClick,
}: {
  tone: "red" | "amber" | "green" | "blue";
  count: number;
  label: string;
  icon: typeof Clock;
  onClick: () => void;
}) {
  return (
    <button type="button" className="mag-cmd-stat" onClick={onClick}>
      <span className={cn("mag-cmd-stat-n", `mag-cmd-stat-n--${tone}`)}>{count}</span>
      <span className="mag-cmd-stat-l">
        <Icon className="w-[9px] h-[9px] shrink-0" aria-hidden />
        {label}
      </span>
    </button>
  );
}
