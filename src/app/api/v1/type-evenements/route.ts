import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import { fetchTypeEvenements } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const data = await fetchTypeEvenements(auth.supabase);
  return json({ success: true, data });
}
