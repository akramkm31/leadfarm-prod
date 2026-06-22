import { describe, expect, it } from "vitest";
import { buildHeatmapGrid, cellsToGeoJSON } from "@/lib/treatments/heatmap";
import { computeTraceHash } from "@/lib/trace/verification";

describe("treatment heatmap", () => {
  it("aggregates points into colored grid cells", () => {
    const cells = buildHeatmapGrid([
      { lat: 36.75, lng: 3.05, debit1_lpm: 2, debit2_lpm: 2 },
      { lat: 36.75001, lng: 3.05001, debit1_lpm: 0, debit2_lpm: 0 },
    ]);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0].color).toBeTruthy();
    const geo = cellsToGeoJSON(cells);
    expect(geo.type).toBe("FeatureCollection");
    expect(geo.features[0].geometry.type).toBe("Point");
  });
});

describe("trace verification hash", () => {
  it("is deterministic for same treatment + date", () => {
    const a = computeTraceHash("uuid-1", "2026-05-31");
    const b = computeTraceHash("uuid-1", "2026-05-31");
    const c = computeTraceHash("uuid-2", "2026-05-31");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(16);
  });
});
