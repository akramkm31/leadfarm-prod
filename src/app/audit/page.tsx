"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, User, Database, ShieldCheck, Download, Loader2, AlertCircle } from "lucide-react";
import AppPage from "@/components/adaline/AppPage";
import { AdalineButton } from "@/components/adaline/PageScreen";
import { supabase } from "@/lib/supabase";

type AuditEntry = {
  id: number;
  table_name: string;
  record_id: string | null;
  action: string;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-[var(--green-010)] text-[var(--interactive-green)] border-[var(--green-020)]",
  UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
};

export default function AuditJournalPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableFilter, setTableFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: qErr } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (qErr) throw qErr;
      setEntries((data || []) as AuditEntry[]);
    } catch {
      setError("Impossible de charger le journal d'audit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tables = useMemo(
    () => Array.from(new Set(entries.map((e) => e.table_name))).sort(),
    [entries]
  );

  const filtered = useMemo(
    () => (tableFilter === "all" ? entries : entries.filter((e) => e.table_name === tableFilter)),
    [entries, tableFilter]
  );

  const exportCsv = useCallback(() => {
    const headers = ["id", "table", "action", "record_id", "user_id", "created_at"];
    const rows = filtered.map((e) =>
      [e.id, e.table_name, e.action, e.record_id ?? "", e.user_id ?? "", e.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal_audit_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <AppPage
      eyebrow="AUDIT · JOURNAL"
      title="Journal d'audit"
      lede="Traçabilité complète des modifications — chaque création, mise à jour et suppression est horodatée et attribuée."
      actions={
        <div className="flex items-center gap-2">
          <span className="lf-live-pill">
            <ShieldCheck className="w-3.5 h-3.5" />
            {filtered.length} ENTRÉE{filtered.length !== 1 ? "S" : ""}
          </span>
          <AdalineButton variant="tertiary" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-3 h-3" />
            Exporter CSV
          </AdalineButton>
        </div>
      }
      className="audit-screen"
    >
      {tables.length > 0 && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--black-004)] border border-[var(--black-008)] w-fit mb-4">
          {["all", ...tables].map((t) => (
            <button
              key={t}
              onClick={() => setTableFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tableFilter === t
                  ? "bg-[var(--surface-pure)] text-[var(--interactive-green)] shadow-sm border border-[var(--black-008)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "all" ? "Toutes les tables" : t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-valley-green)]" />
          <span className="text-sm text-[var(--color-mist-gray)]">Chargement du journal…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <AdalineButton variant="tertiary" onClick={() => void load()}>
            Réessayer
          </AdalineButton>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-canvas)] rounded-[16px] border-2 border-dashed border-[var(--black-008)]">
          <Database className="w-10 h-10 text-[var(--black-012)] mx-auto mb-4" />
          <p className="text-[var(--text-tertiary)] font-medium">Aucune entrée d&apos;audit enregistrée.</p>
          <p className="text-xs text-[var(--color-mist-gray)] mt-1">
            Les modifications des données apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="card-soft flex flex-wrap items-center gap-4 py-3"
            >
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  ACTION_STYLES[e.action] || "bg-[var(--black-004)] text-[var(--text-tertiary)] border-[var(--black-008)]"
                }`}
              >
                {e.action}
              </span>
              <div className="flex items-center gap-2 min-w-[140px]">
                <Database className="w-3.5 h-3.5 text-[var(--color-valley-green)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{e.table_name}</span>
              </div>
              <span className="text-xs font-mono text-[var(--text-tertiary)] truncate max-w-[180px]">
                {e.record_id || "—"}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] ml-auto">
                <User className="w-3 h-3" />
                {e.user_id ? e.user_id.slice(0, 8) : "système"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] min-w-[150px] justify-end">
                <Clock className="w-3 h-3" />
                {new Date(e.created_at).toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppPage>
  );
}
