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
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { SUPABASE_CONFIGURED } from "@/hooks/useData";
import { buildAccessProfile, can, canPath } from "@/lib/rbac/policy";
import { normalizeRole, ROLE_LABELS } from "@/lib/rbac/roles";
import { isDevDemoMode } from "@/lib/dev-demo";
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

const DEMO_ROLE_STORAGE_KEY = "leadfarm_demo_role";
const DEMO_ROLE_EVENT = "leadfarm-demo-role";

function readStoredDemoRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
}

function readDemoRole(): string {
  const stored = readStoredDemoRole();
  if (stored) return stored;
  return process.env.NEXT_PUBLIC_DEMO_ROLE ?? "directeur";
}

function buildDemoProfile(): UserAccessProfile {
  return buildAccessProfile("local-demo", readDemoRole(), null);
}

function isDemoRoleOverride(): boolean {
  if (!readStoredDemoRole()) return false;
  if (!SUPABASE_CONFIGURED) return true;
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ALLOW_DEMO_ROLE === "true"
  );
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);

  const refresh = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setProfile(buildDemoProfile());
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

    const { data, error } = await supabase
      .from("user_profiles")
      .select("role, exploitation_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[AccessProvider] user_profiles:", error.message);
    }

    const row = data as { role?: string | null; exploitation_id?: string | null } | null;

    setProfile(
      buildAccessProfile(user.id, row?.role ?? null, row?.exploitation_id ?? null)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onDemoRole = () => void refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_ROLE_STORAGE_KEY) void refresh();
    };

    if (!SUPABASE_CONFIGURED) {
      window.addEventListener(DEMO_ROLE_EVENT, onDemoRole);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(DEMO_ROLE_EVENT, onDemoRole);
        window.removeEventListener("storage", onStorage);
      };
    }

    if (process.env.NODE_ENV === "development") {
      window.addEventListener(DEMO_ROLE_EVENT, onDemoRole);
      window.addEventListener("storage", onStorage);
    }

    const supabase = getSupabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setLoading(true);
        void refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (process.env.NODE_ENV === "development") {
        window.removeEventListener(DEMO_ROLE_EVENT, onDemoRole);
        window.removeEventListener("storage", onStorage);
      }
    };
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

/** Dev-only — changer le rôle sans Supabase ou en mode démo local. */
export function setDemoRole(role: string) {
  if (!isDevDemoMode() && SUPABASE_CONFIGURED) return;
  const normalized = normalizeRole(role);
  localStorage.setItem(DEMO_ROLE_STORAGE_KEY, normalized);
  window.dispatchEvent(new Event(DEMO_ROLE_EVENT));
}
