"use client";

import Link from "next/link";
import { ShieldCheck, AlertTriangle, ArrowRight, FileText, ClipboardList, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useTreatments } from "@/hooks/useData";
import type { Treatment } from "@/lib/mock-data";
import type { DashboardKPIs } from "@/lib/data-provider";

type Props = { kpis: DashboardKPIs | null };

export default function DashboardAuditeurOverlay({ kpis }: Props) {
  const { data: treatRaw } = useTreatments();
  const treatments = (treatRaw ?? []) as Treatment[];

  const compliance = useMemo(() => {
    if (!treatments.length) return null;
    // Treatments with complete data (product + date + operator + surface)
    const complete = treatments.filter(
      (t) => t.products.length > 0 && t.plannedDate && t.operatorId && t.areaTreatedHectares > 0
    );
    const pct = Math.round((complete.length / treatments.length) * 100);
    const missing = treatments.filter((t) => !t.products.length || !t.operatorId);
    const darParcelles = kpis?.parcellesEnDAR ?? 0;
    return { pct, total: treatments.length, complete: complete.length, missing: missing.length, darParcelles };
  }, [treatments, kpis]);

  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const score = compliance?.pct ?? 0;
  const scoreTone = score >= 95 ? "green" : score >= 80 ? "amber" : "red";

  return (
    <div className="aud-dash-overlay" aria-label="Tableau de bord auditeur">
      <div className="agro-glass aud-cmd">
        <div className="agro-cmd-top">
          <span className="agro-cmd-kicker">
            <ShieldCheck className="w-3 h-3" />
            Audit · Conformité exploitation
          </span>
          <span className="agro-cmd-date">{dateStr}</span>
        </div>

        <div className="aud-score-row">
          <div className="aud-score-circle" style={{ borderColor: scoreTone === "green" ? "#059669" : scoreTone === "amber" ? "#d97706" : "#dc2626" }}>
            <span className="aud-score-n" style={{ color: scoreTone === "green" ? "#059669" : scoreTone === "amber" ? "#d97706" : "#dc2626" }}>
              {score}%
            </span>
            <span className="aud-score-l">Conformité</span>
          </div>
          <div className="aud-score-stats">
            <div className="agro-cmd-stat">
              <span className="agro-cmd-stat-n">{compliance?.total ?? "—"}</span>
              <span className="agro-cmd-stat-l">Traitements</span>
            </div>
            <div className="agro-cmd-stat">
              <span className={cn("agro-cmd-stat-n", (compliance?.missing ?? 0) > 0 && "is-bad")}>
                {compliance?.missing ?? "—"}
              </span>
              <span className="agro-cmd-stat-l">Données manq.</span>
            </div>
            <div className="agro-cmd-stat">
              <span className={cn("agro-cmd-stat-n", (compliance?.darParcelles ?? 0) > 0 && "is-warn")}>
                {compliance?.darParcelles ?? "—"}
              </span>
              <span className="agro-cmd-stat-l">En DAR</span>
            </div>
          </div>
        </div>

        {(compliance?.missing ?? 0) > 0 && (
          <Link href="/audit" className={cn("agro-cmd-lead agro-cmd-lead--amber")}>
            <AlertTriangle className="w-[13px] h-[13px]" aria-hidden />
            <span className="agro-cmd-lead-txt">
              <span className="agro-cmd-lead-title">{compliance!.missing} enregistrement{compliance!.missing > 1 ? "s" : ""} incomplet{compliance!.missing > 1 ? "s" : ""}</span>
              <span className="agro-cmd-lead-sub">Données opérateur ou produit manquantes</span>
            </span>
            <ArrowRight className="w-[13px] h-[13px] ml-auto shrink-0 opacity-60" aria-hidden />
          </Link>
        )}
      </div>

      <div className="oper-action-row">
        <Link href="/conformite" className="agro-action-btn">
          <ShieldCheck className="w-4 h-4" />
          Conformité
        </Link>
        <Link href="/audit" className="agro-action-btn">
          <Eye className="w-4 h-4" />
          Audit trail
        </Link>
        <Link href="/reports" className="agro-action-btn">
          <FileText className="w-4 h-4" />
          Rapports
        </Link>
      </div>
    </div>
  );
}
