import { SUPABASE_CONFIGURED } from "@/hooks/useData";

/** Dev-only role switching and demo banners (never in production builds). */
export function isDevDemoMode(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ALLOW_DEMO_ROLE === "true";
}

/** Mock satellite rows only when Supabase is off or explicit dev demo. */
export function allowMockSatelliteData(): boolean {
  if (!SUPABASE_CONFIGURED) return true;
  return isDevDemoMode();
}

/** MCD analytics pages — mock only without Supabase or in dev demo. */
export function allowMcdMockData(): boolean {
  if (!SUPABASE_CONFIGURED) return true;
  return isDevDemoMode();
}
