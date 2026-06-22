import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac, requireFeature } from "@/lib/api-helpers";
import { upsertTraceVerification, verifyPublicUrl } from "@/lib/trace/verification";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "trace");
  if (denied) return denied;

  const { id } = await params;
  const supabase = auth.supabase;

  const { data: treatment, error } = await supabase
    .from("treatments")
    .select("*, treatment_products(*, products(trade_name, unit))")
    .eq("id", id)
    .single();

  if (error || !treatment) {
    return NextResponse.json({ error: "Traitement introuvable" }, { status: 404 });
  }

  const products = (treatment.treatment_products ?? []).map((tp: {
    quantity_used?: number;
    unit?: string;
    products?: { trade_name?: string; unit?: string };
  }) => ({
    name: tp.products?.trade_name ?? "Produit",
    quantity: tp.quantity_used,
    unit: tp.unit ?? tp.products?.unit,
  }));

  const hash = await upsertTraceVerification({
    treatmentId: id,
    siteName: treatment.site_name,
    status: treatment.status,
    plannedDate: treatment.planned_date,
    executedDate: treatment.executed_date ?? treatment.date_reelle,
    culture: treatment.culture,
    cible: treatment.cible,
    products,
    exploitationId: treatment.exploitation_id,
  });

  return NextResponse.json({
    hash,
    verifyUrl: verifyPublicUrl(hash, req.nextUrl.origin),
  });
}
