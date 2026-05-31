import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchTenantUsers } from "@/lib/mcd/client";
import { ROLE_FEATURES } from "@/lib/rbac/matrix";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "admin.roles");
  if (denied) return denied;
  const users = await fetchTenantUsers(auth.supabase);
  const roles = Object.entries(ROLE_FEATURES).map(([role, features]) => ({
    role,
    featureCount: features.length,
    features: [...features],
  }));
  return json({
    success: true,
    data: {
      users,
      roles,
      currentRole: auth.access.role,
    },
  });
}
