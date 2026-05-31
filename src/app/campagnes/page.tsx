"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { CalendarDays, Loader2, RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type CampagneRow = {
  id: string;
  exploitation_id: string;
  nom: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: string | null;
  created_at?: string;
};

export default function CampagnesPage() {
  const [rows, setRows] = useState<CampagneRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/campagnes?limit=100", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setError(json.error || res.statusText);
        setRows([]);
        return;
      }
      if (json.success && Array.isArray(json.data)) {
        setRows(json.data);
        setTotal(json.total ?? json.data.length);
      } else {
        setRows(Array.isArray(json) ? json : []);
        setTotal(Array.isArray(json) ? json.length : 0);
      }
    } catch {
      setError("Réseau");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary-015)", border: "1px solid var(--primary-025)" }}
            >
              <CalendarDays className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Campagnes agricoles
              </h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {total} enregistrement{total > 1 ? "s" : ""} — liées aux plantations (traçabilité)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/simulation"
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-[var(--color-valley-green)]/30 bg-[var(--color-forest-dew)] text-[var(--color-valley-green)]"
            >
              <Play className="w-3.5 h-3.5" />
              Simulation
            </Link>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors",
                loading && "opacity-50"
              )}
              style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-card p-4 text-sm text-[var(--color-valley-green)] border border-[var(--color-valley-green)]/20">
            {error}
            {error === "Non autorisé" && " — connectez-vous."}
          </div>
        )}

        {loading && !rows.length ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Chargement…
            </span>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                    <th className="text-left py-3 px-4 font-medium">Nom</th>
                    <th className="text-left py-3 px-4 font-medium">Début</th>
                    <th className="text-left py-3 px-4 font-medium">Fin</th>
                    <th className="text-left py-3 px-4 font-medium">Statut</th>
                    <th className="text-left py-3 px-4 font-medium font-mono text-xs">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td className="py-2.5 px-4 font-medium" style={{ color: "var(--text-primary)" }}>
                        {r.nom}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {r.date_debut || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {r.date_fin || "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md"
                          style={{ background: "var(--primary-010)", color: "var(--primary)" }}
                        >
                          {r.statut || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[10px] font-mono max-w-[120px] truncate" title={r.id}>
                        {r.id.slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && !loading && !error && (
              <p className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Aucune campagne. Créez-en via l’API{" "}
                <code className="text-xs">POST /api/v1/campagnes</code> ou le SQL client.
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
