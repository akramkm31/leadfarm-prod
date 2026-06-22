import { NextRequest } from "next/server";
import { withAuthRbac, json } from "@/lib/api-helpers";
import { fetchDonneesSatellite } from "@/lib/satellite/repository";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const { rows, meta } = await fetchDonneesSatellite(auth.supabase);
  return json({ success: true, data: rows, meta });
}
