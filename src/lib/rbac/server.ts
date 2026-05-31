import type { SupabaseClient, User } from "@supabase/supabase-js";
import { buildAccessProfile } from "./policy";
import type { UserAccessProfile } from "./types";

export async function loadUserAccessProfile(
  supabase: SupabaseClient,
  user: User
): Promise<UserAccessProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role, exploitation_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[rbac] user_profiles lookup failed:", error.message);
  }

  return buildAccessProfile(
    user.id,
    data?.role ?? null,
    data?.exploitation_id ?? null
  );
}
