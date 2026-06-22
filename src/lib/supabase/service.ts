import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function supabaseServiceUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function createServiceClient() {
  const url = supabaseServiceUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service credentials missing");
  }
  return createClient<Database>(url, key);
}
