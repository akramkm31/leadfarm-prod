/**
 * supabase/client.ts — Canonical browser Supabase client.
 *
 * ONE client for browser (CSR) usage.
 * For Server Components / Route Handlers, use `supabase/server.ts`.
 *
 * All pages import from here. Do NOT import from lib/supabase.ts,
 * lib/supabase-browser.ts, or lib/supabase-server.ts (deprecated).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// ── Env validation ─────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || url === "https://placeholder.supabase.co") {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set. " +
      "Cannot start in production without a database connection."
    );
  }
  // Dev: warn and continue — repositories will return empty arrays.
  console.warn(
    "[Supabase] Running without a database connection. " +
    "Set NEXT_PUBLIC_SUPABASE_URL in .env.local to connect."
  );
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      url ?? "https://placeholder.supabase.co",
      anonKey ?? "placeholder"
    );
  }
  return _client;
}

/** Direct export for convenience — same singleton instance. */
export const supabase = getSupabaseClient();

/** True if a real Supabase project is configured. */
export const SUPABASE_CONFIGURED =
  !!url && url !== "https://placeholder.supabase.co" && !!anonKey;
