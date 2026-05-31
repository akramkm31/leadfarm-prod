"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Clock, User, Database, ArrowRight, ShieldCheck } from "lucide-react";
import AppPage from "@/components/adaline/AppPage";
import { AdalineButton } from "@/components/adaline/PageScreen";

const AUDITABLE_ENTITIES = [
  { table: "PARCELLE", label: "Parcelles", description: "Historique des limites et caractéristiques des parcelles." },
  { table: "TREATMENT", label: "Traitements", description: "Suivi des modifications sur les ordres de traitement." },
  { table: "STOCK", label: "Inventaire", description: "Journal complet des ajustements et mouvements de stock." },
  { table: "UTILISATEUR", label: "Utilisateurs", description: "Audit des changements de rôles et permissions." },
];

export default function AuditListPage() {
  const [search] = useState("");

  return (
    <AppPage
      eyebrow="AUDIT · JOURNAL SCD2"
      title="Traçabilité temporelle"
      lede="Architecture Slowly Changing Dimensions — conformité audit et gouvernance des données."
      actions={
        <span className="lf-live-pill">
          <ShieldCheck className="w-3.5 h-3.5" />
          CONFORME AUDIT
        </span>
      }
      className="audit-screen"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUDITABLE_ENTITIES.filter(
          (e) => !search || e.label.toLowerCase().includes(search.toLowerCase())
        ).map((entity) => (
          <Link
            key={entity.table}
            href={`/audit/${entity.table.toLowerCase()}`}
            className="card-soft group hover:border-[var(--color-valley-green)] transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-[8px] border border-[var(--color-stone-moss)] flex items-center justify-center group-hover:bg-[var(--color-forest-dew)]">
                <Database className="w-6 h-6 text-[var(--color-valley-green)]" />
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-mist-gray)] group-hover:text-[var(--color-valley-green)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-adaline-ink)] mb-1">{entity.label}</h3>
            <p className="text-sm text-[var(--color-mist-gray)] leading-relaxed mb-4">{entity.description}</p>
            <div className="flex items-center gap-4 pt-4 border-t border-[var(--color-stone-moss)] text-[10px] mono uppercase text-[var(--color-mist-gray)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Versions illimitées
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> Par utilisateur
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="card-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-[var(--color-valley-green)]" />
          <div>
            <p className="font-semibold text-[var(--color-adaline-ink)]">Export journal complet</p>
            <p className="text-xs text-[var(--color-mist-gray)]">CSV signé · hash SHA-256</p>
          </div>
        </div>
        <AdalineButton variant="tertiary">
          <ArrowRight className="w-3 h-3" />
          Exporter
        </AdalineButton>
      </div>
    </AppPage>
  );
}
