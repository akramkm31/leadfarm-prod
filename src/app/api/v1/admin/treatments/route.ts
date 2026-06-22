import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "admin.roles");
  if (denied) return denied;

  const { data, error } = await auth.supabase
    .from("treatments")
    .select("id, site_name, status, type, planned_date, executed_date, operator_name, area_treated_hectares")
    .order("planned_date", { ascending: false })
    .limit(200);

  if (error) return json({ error: error.message }, 500);
  return json({ success: true, data });
}
