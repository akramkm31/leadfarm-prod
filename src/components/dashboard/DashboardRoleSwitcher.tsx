"use client";

import { useAccessContext, setDemoRole } from "@/components/auth/AccessProvider";
import { isDevDemoMode } from "@/lib/dev-demo";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import type { UserRole } from "@/lib/rbac/types";
import { cn } from "@/lib/utils";
import { Satellite, Package, UserCog } from "lucide-react";

const QUICK_ROLES: { role: UserRole; label: string; icon: typeof Satellite }[] = [
  { role: "agronome", label: "Agronome", icon: Satellite },
  { role: "magasinier", label: "Magasinier", icon: Package },
  { role: "directeur", label: "Directeur", icon: UserCog },
];

type Props = {
  className?: string;
  compact?: boolean;
};

export default function DashboardRoleSwitcher({ className, compact }: Props) {
  const { profile, refresh, loading } = useAccessContext();
  const current = profile?.role ?? "directeur";

  const switchRole = (role: UserRole) => {
    setDemoRole(role);
    void refresh();
  };

  if (loading || !isDevDemoMode()) return null;

  return (
    <div
      className={cn("dash-role-switcher", compact && "dash-role-switcher--compact", className)}
      role="region"
      aria-label="Profil actif"
    >
      {!compact && (
        <span className="dash-role-switcher-label">
          Profil · <strong>{ROLE_LABELS[current] ?? current}</strong>
        </span>
      )}
      <div className="dash-role-switcher-btns">
        {QUICK_ROLES.map(({ role, label, icon: Icon }) => (
          <button
            key={role}
            type="button"
            className={cn("dash-role-switcher-btn", current === role && "is-active", role === "agronome" && "is-agro")}
            onClick={() => switchRole(role)}
            aria-pressed={current === role}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
