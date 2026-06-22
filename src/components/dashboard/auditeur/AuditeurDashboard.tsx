"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, CheckCircle2,
  FileText, Eye, ClipboardList, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageScreen } from "@/components/adaline/PageScreen";
import { useTreatments } from "@/hooks/useData";
import type { DashboardKPIs } from "@/lib/data-provider";
import type { Treatment } from "@/lib/mock-data";

type Props = { kpis: DashboardKPIs | null };

export default function AuditeurDashboard({ kpis }: Props) {
  const { data: treatRaw } = useTreatments();
  const treatments = (treatRaw ?? []) as Treatment[];

  const audit = useMemo(() => {
    if (!treatments.length) return null;
    const total = treatments.length;
    const complete = treatments.filter(
      t => t.products.length > 0 && t.plannedDate && t.operatorId && t.areaTreatedHectares > 0,
    );
    const missingOperator = treatments.filter(t => !t.operatorId);
    const missingProducts = treatments.filter(t => !t.products.length);
    const missingAll = treatments.filter(t => !t.products.length || !t.operatorId);
    const score = Math.round((complete.length / total) * 100);
    return { total, complete: complete.length, score, missingOperator, missingProducts, missingAll };
  }, [treatments]);

  const score = audit?.score ?? 0;
  const scoreTone = score >= 95 ? "green" : score >= 80 ? "amber" : "red";
  const scorePct = `${score}%`;
  const scoreColor = scoreTone === "green" ? "#059669" : scoreTone === "amber" ? "#d97706" : "#dc2626";
  const scoreBg = scoreTone === "green" ? "#f0fdf4" : scoreTone === "amber" ? "#fffbeb" : "#fef2f2";

  const circumference = 2 * Math.PI * 38;
  const dash = (score / 100) * circumference;

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <PageScreen className="aud-full-dashboard">
      <div className="aud-fd-inner">
        {/* Score header */}
        <div className="aud-fd-header" style={{ background: scoreBg, borderColor: scoreTone === "green" ? "#bbf7d0" : scoreTone === "amber" ? "#fed7aa" : "#fecaca" }}>
          <div className="aud-fd-score-block">
            <svg viewBox="0 0 88 88" className="aud-fd-score-svg" aria-hidden>
              <circle cx="44" cy="44" r="38" fill="none" stroke="#e5e7eb" strokeWidth="7" />
              <circle
                cx="44" cy="44" r="38"
                fill="none"
                stroke={scoreColor}
                strokeWidth="7"
                strokeDasharray={`${dash} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 44 44)"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <span className="aud-fd-score-num" style={{ color: scoreColor }}>{scorePct}</span>
            <span className="aud-fd-score-label" style={{ color: scoreColor }}>Conformité</span>
          </div>

          <div className="aud-fd-header-right">
            <div>
              <h1 className="aud-fd-title">Audit · Conformité exploitation</h1>
              <p className="aud-fd-date">{dateStr}</p>
            </div>
            <div className="aud-fd-metrics">
              {[
                { n: audit?.total ?? "—", l: "Traitements", tone: null },
                { n: audit?.complete ?? "—", l: "Complets", tone: null },
                { n: audit?.missingAll.length ?? "—", l: "Incomplets", tone: (audit?.missingAll.length ?? 0) > 0 ? "red" : null },
                { n: kpis?.parcellesEnDAR ?? 0, l: "En DAR", tone: (kpis?.parcellesEnDAR ?? 0) > 0 ? "amber" : null },
                { n: kpis?.expiryCount ?? 0, l: "Expiry 90j", tone: (kpis?.expiryCount ?? 0) > 0 ? "amber" : null },
                { n: kpis?.pendingApproval ?? 0, l: "À approuver", tone: (kpis?.pendingApproval ?? 0) > 0 ? "amber" : null },
              ].map(m => (
                <div key={m.l} className="aud-fd-metric">
                  <span className={cn("aud-fd-metric-n", m.tone === "red" && "text-red-600", m.tone === "amber" && "text-amber-600")}>{m.n}</span>
                  <span className="aud-fd-metric-l">{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Missing records */}
        <section className="aud-fd-panel">
          <header className="aud-fd-panel-hd">
            <span className="agro-label-chip">
              <AlertTriangle className="w-3.5 h-3.5" />
              Enregistrements incomplets
            </span>
            {(audit?.missingAll.length ?? 0) > 0 && (
              <span className="dir-fd-badge">{audit!.missingAll.length}</span>
            )}
          </header>

          {(audit?.missingAll.length ?? 0) === 0 ? (
            <div className="aud-fd-ok">
              <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <p className="aud-fd-ok-text">Tous les enregistrements sont complets</p>
                <p className="text-xs text-green-700 opacity-80">Conformité réglementaire satisfaisante</p>
              </div>
            </div>
          ) : (
            <div className="aud-fd-missing-list">
              {(audit?.missingAll ?? []).slice(0, 8).map(t => {
                const reasons: string[] = [];
                if (!t.operatorId) reasons.push("Opérateur manquant");
                if (!t.products.length) reasons.push("Produit manquant");
                return (
                  <Link key={t.id} href="/audit" className="aud-fd-missing-item">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="aud-fd-missing-name">{t.sousParcelleName || t.parcelleName || t.id}</p>
                      <p className="aud-fd-missing-reason">{t.plannedDate} · {reasons.join(", ")}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  </Link>
                );
              })}
              {(audit?.missingAll.length ?? 0) > 8 && (
                <Link href="/audit" className="text-center text-xs text-[var(--color-valley-green)] py-2 font-medium hover:underline">
                  Voir {audit!.missingAll.length - 8} autres →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* DAR + pending section */}
        {((kpis?.parcellesEnDAR ?? 0) > 0 || (kpis?.pendingApproval ?? 0) > 0) && (
          <section className="aud-fd-panel">
            <header className="aud-fd-panel-hd">
              <span className="agro-label-chip">Points de vigilance</span>
            </header>
            <div className="aud-fd-alerts">
              {(kpis?.parcellesEnDAR ?? 0) > 0 && (
                <Link href="/parcelles" className="aud-fd-alert-row aud-fd-alert-row--amber">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{kpis!.parcellesEnDAR} parcelle{kpis!.parcellesEnDAR > 1 ? "s" : ""} en DAR — récolte temporairement interdite</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto opacity-50" />
                </Link>
              )}
              {(kpis?.pendingApproval ?? 0) > 0 && (
                <Link href="/treatments?status=pending_approval" className="aud-fd-alert-row aud-fd-alert-row--blue">
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                  <span>{kpis!.pendingApproval} traitement{kpis!.pendingApproval > 1 ? "s" : ""} en attente d'approbation — vérifier le dossier</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto opacity-50" />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <div className="aud-fd-quick">
          <Link href="/conformite" className="agro-action-btn">
            <ShieldCheck className="w-4 h-4" />Conformité
          </Link>
          <Link href="/audit" className="agro-action-btn">
            <Eye className="w-4 h-4" />Audit trail
          </Link>
          <Link href="/reports" className="agro-action-btn">
            <FileText className="w-4 h-4" />Rapports
          </Link>
          <Link href="/treatments" className="agro-action-btn">
            <ClipboardList className="w-4 h-4" />Traitements
          </Link>
        </div>
      </div>
    </PageScreen>
  );
}
