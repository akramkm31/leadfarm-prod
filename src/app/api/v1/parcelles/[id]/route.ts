import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { isUuid } from "@/lib/ids";
import { removeRegionParcelle } from "@/lib/parcelles/remove-region";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "parcelles.edit");
  if (denied) return denied;

  const { id } = await params;
  if (!id) return json({ error: "Identifiant parcelle requis" }, 400);
  if (!isUuid(id)) {
    return json(
      {
        error:
          "Identifiant démo invalide (p-001). Rechargez la page pour afficher les parcelles Supabase.",
      },
      400
    );
  }

  try {
    // Session client + RBAC — avoids invalid/mismatched SUPABASE_SERVICE_ROLE_KEY locally.
    await removeRegionParcelle(auth.supabase, id);
    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
    return json({ error: message }, 400);
  }
}
