import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import { ROLE_LABELS } from "@/lib/rbac/roles";

/** Profil RBAC de l'utilisateur connecté (pour l'UI). */
export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  const { access } = auth;
  return json({
    userId: access.userId,
    role: access.role,
    roleLabel: ROLE_LABELS[access.role],
    exploitationId: access.exploitationId,
    features: access.features,
  });
}
