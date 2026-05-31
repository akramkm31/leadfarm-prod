"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { 
  History, 
  ArrowLeft, 
  User, 
  Calendar, 
  Activity, 
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { getEntityHistory } from "@/lib/queries";
import { cn } from "@/lib/utils";

export default function EntityAuditTimelinePage() {
  const { table, id } = useParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getEntityHistory(table as string, id as string);
        setHistory(data || []);
      } catch (err) {
        console.error("Failed to load audit history:", err);
      } finally {
        setLoading(false);
      }
    }
    if (table && id) loadHistory();
  }, [table, id]);

  if (loading) return <AppLayout>Chargement de l&apos;historique...</AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Breadcrumbs */}
        <Link 
          href="/audit" 
          className="flex items-center gap-2 text-sm font-bold text-[var(--text-tertiary)] hover:text-[var(--interactive-green)] mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour au centre d&apos;audit
        </Link>

        {/* Title */}
        <div className="mb-12">
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Historique des versions</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-3 py-1 rounded-full bg-[var(--green-010)] text-[var(--interactive-green)] text-[10px] font-black uppercase tracking-widest border border-[var(--green-020)]">
              {table}
            </span>
            <span className="text-sm font-mono text-[var(--text-tertiary)]">ID: {id}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-[var(--black-008)]">
          {history.length > 0 ? history.map((version, index) => (
            <div key={version.id} className="relative flex items-start gap-8 group">
              {/* Dot */}
              <div className={cn(
                "absolute left-0 w-10 h-10 rounded-full border-4 border-[var(--surface-canvas)] flex items-center justify-center transition-all z-10",
                index === 0 
                  ? "bg-[var(--interactive-green)] shadow-lg shadow-emerald-500/20" 
                  : "bg-[var(--black-012)]"
              )}>
                {index === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--color-adaline-ink)]" />
                ) : (
                  <History className="w-4 h-4 text-[var(--color-adaline-ink)]" />
                )}
              </div>

              {/* Card */}
              <div className="ml-12 flex-1 p-6 rounded-[28px] border border-[var(--black-008)] bg-[var(--surface-pure)] shadow-sm hover:shadow-md transition-all group-hover:border-[var(--black-012)]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      index === 0 ? "text-[var(--interactive-green)]" : "text-[var(--text-tertiary)]"
                    )}>
                      {index === 0 ? "Version Actuelle" : `Version ${history.length - index}`}
                    </span>
                    <span className="text-[var(--black-012)]">·</span>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(version.date_debut_validite).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--black-004)] border border-[var(--black-008)]">
                    <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                    <span className="text-[10px] font-bold text-[var(--text-primary)]">Utilisateur #{version.modifie_par || "System"}</span>
                  </div>
                </div>

                {/* Data Dump (Prettified) */}
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[var(--surface-canvas)] border border-[var(--black-006)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                    {Object.entries(version)
                      .filter(([k]) => !['id', 'identifiant_metier', 'date_debut_validite', 'date_fin_validite', 'est_version_actuelle', 'modifie_par'].includes(k))
                      .map(([key, val]) => (
                        <div key={key} className="flex gap-4 border-b border-[var(--black-004)] last:border-0 py-1">
                          <span className="w-32 font-bold text-[var(--text-tertiary)] shrink-0">{key}</span>
                          <span className="truncate">{JSON.stringify(val)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {version.action_historique && (
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-[var(--text-tertiary)]">
                    <Activity className="w-3 h-3" />
                    Action: {version.action_historique}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-[var(--surface-canvas)] rounded-[32px] border-2 border-dashed border-[var(--black-008)]">
              <AlertCircle className="w-10 h-10 text-[var(--black-012)] mx-auto mb-4" />
              <p className="text-[var(--text-tertiary)] font-medium">Aucun historique trouvé pour cet élément.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
