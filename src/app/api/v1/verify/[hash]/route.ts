import { NextRequest, NextResponse } from "next/server";
import { createTraceReadClient } from "@/lib/trace/client";

/** Public trace verification — no auth required. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  if (!hash || hash.length < 8) {
    return NextResponse.json({ error: "Hash invalide" }, { status: 400 });
  }

  const supabase = createTraceReadClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("trace_verifications")
    .select("*")
    .eq("hash", hash)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    hash: data.hash,
    treatmentId: data.treatment_id,
    siteName: data.site_name,
    status: data.status,
    plannedDate: data.planned_date,
    executedDate: data.executed_date,
    culture: data.culture,
    cible: data.cible,
    products: data.products_summary,
    verifiedAt: data.created_at,
    authentic: true,
  });
}
