"use client";

import McdPageShell from "@/components/mcd/McdPageShell";
import { useMcdResource } from "@/hooks/useMcd";
import type { TenantUser } from "@/lib/mcd/types";
import { Shield } from "lucide-react";

type AdminPayload = {
  users: TenantUser[];
  roles: { role: string; featureCount: number; features: string[] }[];
  currentRole: string;
};

export default function AdminPage() {
  const { data, loading, error } = useMcdResource<AdminPayload>("/api/v1/admin/users");

  return (
    <McdPageShell
      title="Administration · rôles & permissions"
      subtitle="TENANT_UTILISATEUR · matrice ROLE → PERMISSION (features)"
      icon={<Shield className="w-6 h-6 text-[var(--color-valley-green)]" />}
      loading={loading}
    >
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <p className="text-sm text-[var(--color-mist-gray)] mb-6">
        Profil connecté : <strong>{data?.currentRole}</strong> — gestion des accès via <code className="text-xs">user_profiles.role</code> et{" "}
        <code className="text-xs">/api/v1/me/access</code>.
      </p>
      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Utilisateurs</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-mist-gray)] uppercase">
                <th className="pb-2">Nom</th>
                <th className="pb-2">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users || []).map((u) => (
                <tr key={u.id} className="border-t border-[var(--color-stone-moss)]">
                  <td className="py-2">{u.full_name || u.email || u.id.slice(0, 8)}</td>
                  <td className="py-2 font-mono text-xs">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-mist-gray)] mb-3">Matrice rôles</h2>
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {(data?.roles || []).map((r) => (
              <details key={r.role} className="glass-card border border-[var(--color-stone-moss)] p-3">
                <summary className="font-semibold text-sm cursor-pointer">
                  {r.role} <span className="text-[var(--color-mist-gray)] font-normal">({r.featureCount} features)</span>
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {r.features.map((f) => (
                    <li key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      {f}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      </div>
    </McdPageShell>
  );
}
