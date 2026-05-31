"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { SUPABASE_CONFIGURED } from "@/hooks/useData";
import { buildAccessProfile, can, canPath } from "@/lib/rbac/policy";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import type { Feature, UserAccessProfile } from "@/lib/rbac/types";

type AccessContextValue = {
  loading: boolean;
  profile: UserAccessProfile | null;
  roleLabel: string;
  can: (feature: Feature) => boolean;
  canPath: (pathname: string) => boolean;
  refresh: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

const DEMO_PROFILE = buildAccessProfile("local-demo", "directeur", null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);

  const refresh = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_profiles")
      .select("role, exploitation_id")
      .eq("id", user.id)
      .maybeSingle();

    const mockRole = typeof window !== "undefined" ? localStorage.getItem("leadfarm_mock_role") : null;
    const activeRole = mockRole || data?.role || null;

    setProfile(
      buildAccessProfile(user.id, activeRole, data?.exploitation_id ?? null)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AccessContextValue>(
    () => ({
      loading,
      profile,
      roleLabel: profile ? ROLE_LABELS[profile.role] : "",
      can: (feature) => (profile ? can(profile, feature) : false),
      canPath: (pathname) => (profile ? canPath(profile, pathname) : false),
      refresh,
    }),
    [loading, profile, refresh]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccessContext() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error("useAccessContext must be used within AccessProvider");
  }
  return ctx;
}
