import { NextRequest, NextResponse } from "next/server";
import { fireAlert, type AlertPayload } from "@/lib/services/notifications";
import { verifyServiceToken } from "@/lib/auth/service-token";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-service-token");
  if (!verifyServiceToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as AlertPayload;
    await fireAlert(payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Alert route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fire alert" },
      { status: 500 }
    );
  }
}
