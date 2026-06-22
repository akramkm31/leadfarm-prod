"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, ClipboardList, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgroLead } from "./useAgronomeDashboardMetrics";

const TONE_ICONS = {
  red: AlertTriangle,
  amber: AlertTriangle,
  blue: ClipboardList,
  green: CheckCircle2,
};

type Props = {
  lead: AgroLead;
  canSpray: boolean | null;
  avgNdvi: number | null;
  stressedCount: number;
  acquisitionDate: string | null;
};

export default function AgroCommandPanel({
  lead,
  canSpray,
  avgNdvi,
  stressedCount,
  acquisitionDate,
}: Props) {
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const LeadIcon = TONE_ICONS[lead.tone];

  return (
    <div className="agro-glass agro-cmd" role="region" aria-label="Action agronomique">
      <div className="agro-cmd-top">
        <span className="agro-cmd-kicker">
          <span className="agro-cmd-pulse" aria-hidden />
          Agronomie · Action du jour
        </span>
        <span className="agro-cmd-date">{dateStr}</span>
      </div>

      <Link href={lead.href} className={cn("agro-cmd-lead", `agro-cmd-lead--${lead.tone}`)}>
        <span className="agro-cmd-lead-ic">
          <LeadIcon className="w-[15px] h-[15px]" aria-hidden />
        </span>
        <span className="agro-cmd-lead-txt">
          <span className="agro-cmd-lead-title">{lead.title}</span>
          <span className="agro-cmd-lead-sub">{lead.sub}</span>
        </span>
        <ArrowRight className="w-[14px] h-[14px] shrink-0 opacity-70" aria-hidden />
      </Link>

      <div className="agro-cmd-stats">
        <div className="agro-cmd-stat">
          <span className={cn("agro-cmd-stat-n", avgNdvi != null && avgNdvi < 0.55 && "is-warn")}>
            {avgNdvi != null ? avgNdvi.toFixed(2) : "—"}
          </span>
          <span className="agro-cmd-stat-l">
            <Satellite className="w-[9px] h-[9px]" />
            NDVI moy.
          </span>
        </div>
        <div className="agro-cmd-stat">
          <span className={cn("agro-cmd-stat-n", stressedCount > 0 && "is-warn")}>{stressedCount}</span>
          <span className="agro-cmd-stat-l">Stressées</span>
        </div>
        <div className="agro-cmd-stat">
          <span className={cn("agro-cmd-stat-n", canSpray === false && "is-bad", canSpray && "is-ok")}>
            {canSpray === null ? "—" : canSpray ? "OK" : "Non"}
          </span>
          <span className="agro-cmd-stat-l">Pulvérisable</span>
        </div>
      </div>

      {acquisitionDate && (
        <p className="agro-cmd-foot">
          Sentinel-2 · acq. {new Date(acquisitionDate).toLocaleDateString("fr-FR")}
        </p>
      )}
    </div>
  );
}
