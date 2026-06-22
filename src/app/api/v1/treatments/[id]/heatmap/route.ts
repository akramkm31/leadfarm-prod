import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac, requireFeature } from "@/lib/api-helpers";
import { buildHeatmapGrid, cellsToGeoJSON } from "@/lib/treatments/heatmap";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "treatments.view");
  if (denied) return denied;

  const { id } = await params;
  const supabase = auth.supabase;

  const { data: points, error } = await supabase
    .from("traitement_points")
    .select("lat, lng, debit1_lpm, debit2_lpm")
    .eq("treatment_id", id)
    .order("timestamp", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cells = buildHeatmapGrid(points ?? []);
  const cellSize = Number(req.nextUrl.searchParams.get("cellSize") || "5");

  return NextResponse.json({
    treatmentId: id,
    cellSizeM: cellSize,
    pointCount: points?.length ?? 0,
    cells,
    geojson: cellsToGeoJSON(cells),
  });
}
