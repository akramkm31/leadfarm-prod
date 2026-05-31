import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchMicroZones } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "micro_zones");
  if (denied) return denied;
  const data = await fetchMicroZones(auth.supabase);
  return json({ success: true, data });
}
