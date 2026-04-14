import { NextRequest, NextResponse } from "next/server";
import { fetchAlerts } from "@/lib/data-provider";
import { requireAuth, json } from "@/lib/api-helpers";
import type { ApiResponse } from "@/lib/api-types";

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const alerts = await fetchAlerts() as { timestamp: string; [key: string]: unknown }[];
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const response: ApiResponse<typeof sorted> = {
    success: true,
    data: sorted,
    meta: { total: sorted.length, page: 1, limit: 50 },
  };

  return NextResponse.json(response);
}
