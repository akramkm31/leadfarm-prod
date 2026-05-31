import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchProtocoles } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "protocoles");
  if (denied) return denied;
  const data = await fetchProtocoles(auth.supabase);
  return json({ success: true, data });
}
