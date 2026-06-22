"use client";

import { useState } from "react";
import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { TenantUser } from "@/lib/mcd/types";
import { Shield } from "lucide-react";

type AdminPayload = {
  users: TenantUser[];
  roles: { role: string; featureCount: number; features: string[] }[];
  currentRole: string;
};

type AdminParcelle = {
  id: string;
  name: string;
  area_hectares: number | null;
  crop_type: string | null;
  culture_type: string | null;
  parent_id: string | null;
};

type AdminTreatment = {
  id: string;
  site_name: string | null;
  status: string;
  type: string | null;
  planned_date: string;
  executed_date: string | null;
  operator_name: string | null;
  area_treated_hectares: number | null;
};

type Tab = "users" | "parcelles" | "treatments";

const STATUS_STYLE: Record<string, string> = {
  planned:     "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  planned:     "Planifié",
  in_progress: "En cours",
  completed:   "Terminé",
  cancelled:   "Annulé",
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  const users   = useMcdResource<AdminPayload>("/api/v1/admin/users");
  const parcels = useMcdResource<AdminParcelle[]>("/api/v1/admin/parcelles");
  const treats  = useMcdResource<AdminTreatment[]>("/api/v1/admin/treatments");

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "users",      label: "Utilisateurs", count: users.data?.users.length },
    { key: "parcelles",  label: "Parcelles",    count: parcels.data?.length },
    { key: "treatments", label: "Traitements",  count: treats.data?.length },
  ];

  return (
    <McdPageShell
      title="Administration"
      subtitle={`Profil connecté : ${users.data?.currentRole ?? "—"}`}
      icon={<Shield className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={false}
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-stone-moss)]">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border-b-2 border-[var(--color-valley-green)] text-[var(--color-valley-green)] -mb-px"
                : "text-[var(--color-mist-gray)] hover:text-[var(--text-primary)]"
            }`}
          >
            {label}
            {count !== undefined && (
              <span className="ml-1.5 text-[10px] bg-[var(--color-stone-moss)] px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Users ── */}
      {tab === "users" && (
        <>
          {users.error && <p className="text-sm text-red-600 mb-4">{users.error}</p>}
          {users.loading ? (
            <p className="text-sm text-[var(--color-mist-gray)]">Chargement…</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">
                  Utilisateurs
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--color-mist-gray)] uppercase">
                      <th className="pb-2">Nom</th>
                      <th className="pb-2">Rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users.data?.users || []).map((u) => (
                      <tr key={u.id} className="border-t border-[var(--color-stone-moss)]">
                        <td className="py-2">{u.full_name || u.email || u.id.slice(0, 8)}</td>
                        <td className="py-2 font-mono text-xs">{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">
                  Matrice rôles
                </h2>
                <div className="space-y-3 max-h-[480px] overflow-y-auto">
                  {(users.data?.roles || []).map((r) => (
                    <details key={r.role} className="glass-card border border-[var(--color-stone-moss)] p-3">
                      <summary className="font-semibold text-sm cursor-pointer">
                        {r.role}{" "}
                        <span className="text-[var(--color-mist-gray)] font-normal">
                          ({r.featureCount} features)
                        </span>
                      </summary>
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {r.features.map((f) => (
                          <li
                            key={f}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono"
                          >
                            {f}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* ── Parcelles ── */}
      {tab === "parcelles" && (
        <>
          {parcels.error && <p className="text-sm text-red-600 mb-4">{parcels.error}</p>}
          {parcels.loading ? (
            <p className="text-sm text-[var(--color-mist-gray)]">Chargement…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-mist-gray)] uppercase">
                    <th className="pb-2 pr-4">Parcelle</th>
                    <th className="pb-2 pr-4">Surface (ha)</th>
                    <th className="pb-2 pr-4">Culture</th>
                    <th className="pb-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(parcels.data || []).map((p) => (
                    <tr key={p.id} className="border-t border-[var(--color-stone-moss)]">
                      <td className="py-2 pr-4 font-medium">
                        {p.parent_id && (
                          <span className="text-[var(--color-mist-gray)] mr-1">↳</span>
                        )}
                        {p.name}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {p.area_hectares != null ? p.area_hectares.toFixed(2) : "—"}
                      </td>
                      <td className="py-2 pr-4">{p.crop_type ?? "—"}</td>
                      <td className="py-2 text-xs text-[var(--color-mist-gray)]">
                        {p.culture_type ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!parcels.data?.length && (
                <p className="text-center text-sm text-[var(--color-mist-gray)] py-8">
                  Aucune parcelle
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Traitements ── */}
      {tab === "treatments" && (
        <>
          {treats.error && <p className="text-sm text-red-600 mb-4">{treats.error}</p>}
          {treats.loading ? (
            <p className="text-sm text-[var(--color-mist-gray)]">Chargement…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-mist-gray)] uppercase">
                    <th className="pb-2 pr-4">Parcelle</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2 pr-4">Opérateur</th>
                    <th className="pb-2">Surface (ha)</th>
                  </tr>
                </thead>
                <tbody>
                  {(treats.data || []).map((t) => (
                    <tr key={t.id} className="border-t border-[var(--color-stone-moss)]">
                      <td className="py-2 pr-4 font-medium">{t.site_name ?? "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(t.executed_date ?? t.planned_date)?.slice(0, 10) ?? "—"}
                        {t.executed_date && (
                          <span className="ml-1 text-[9px] text-green-600 font-medium">✓</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{t.type ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            STATUS_STYLE[t.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{t.operator_name ?? "—"}</td>
                      <td className="py-2 tabular-nums">
                        {t.area_treated_hectares != null
                          ? t.area_treated_hectares.toFixed(2)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!treats.data?.length && (
                <p className="text-center text-sm text-[var(--color-mist-gray)] py-8">
                  Aucun traitement
                </p>
              )}
            </div>
          )}
        </>
      )}
    </McdPageShell>
  );
}
