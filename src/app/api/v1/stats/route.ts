import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardStats } from "@/lib/data-provider";
import { requireAuth } from "@/lib/api-helpers";
import type { ApiResponse } from "@/lib/api-types";

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const stats = await fetchDashboardStats();
  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats,
  };

  return NextResponse.json(response);
}
