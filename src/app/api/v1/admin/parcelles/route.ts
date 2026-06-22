import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { CANONICAL_PARCELLE_TABLE } from "@/lib/parcelles/constants";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "admin.roles");
  if (denied) return denied;

  const { data, error } = await auth.supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .select("id, name, area_hectares, crop_type, culture_type, parent_id")
    .order("name");

  if (error) return json({ error: error.message }, 500);
  return json({ success: true, data });
}
