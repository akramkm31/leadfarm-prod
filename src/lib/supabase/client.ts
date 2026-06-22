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

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const hasRealConfig =
  !!url && url !== PLACEHOLDER_URL && !!anonKey && anonKey !== "placeholder-anon-key";

if (!hasRealConfig && process.env.NODE_ENV === "production" && typeof window !== "undefined") {
  throw new Error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set."
  );
}

if (!hasRealConfig && process.env.NODE_ENV !== "production") {
  console.warn("[Supabase] Running without a database connection.");
}

const BUILD_FALLBACK_URL = "https://rjvmygudsemlnkpfdfzd.supabase.co";
const BUILD_FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdm15Z3Vkc2VtbG5rcGZkZnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDMyNDcsImV4cCI6MjA4NzI3OTI0N30.45pU-Gjla48N2omKAyBIyv6pgVTi6p8XGjSWCaW2nH8";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      hasRealConfig ? url! : BUILD_FALLBACK_URL,
      hasRealConfig ? anonKey! : BUILD_FALLBACK_KEY
    );
  }
  return _client;
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export const SUPABASE_CONFIGURED = hasRealConfig;
