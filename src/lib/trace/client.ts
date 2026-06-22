import { createClient } from "@supabase/supabase-js";

/** Anon client — trace_verifications has public SELECT RLS. */
export function createTraceReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
