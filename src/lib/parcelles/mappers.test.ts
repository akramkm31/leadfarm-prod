import { describe, expect, it } from "vitest";
import { mapRegionToParcelle, regionToParcelleMirrorRow } from "./mappers";
import type { RegionRow } from "@/lib/database.types";

const sampleRegion: RegionRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "TENIRA",
  parent_id: null,
  area_hectares: 12.5,
  crop_type: "Agrumes",
  variete: "Nour",
  culture_type: "arboriculture" as RegionRow["culture_type"],
  color: "#10b981",
  center: [34.8, -0.6],
  boundary: [
    [34.8, -0.6],
    [34.81, -0.59],
  ],
  site: "Ferme Principale",
  created_at: "2025-01-01T00:00:00Z",
};

describe("mapRegionToParcelle", () => {
  it("maps region row to UI parcelle shape", () => {
    const ui = mapRegionToParcelle(sampleRegion, [], { count: 2, lastDate: "2025-03-01" });
    expect(ui.id).toBe(sampleRegion.id);
    expect(ui.name).toBe("TENIRA");
    expect(ui.areaHectares).toBe(12.5);
    expect(ui.treatmentCount).toBe(2);
    expect(ui.lastTreatmentDate).toBe("2025-03-01");
  });
});

describe("regionToParcelleMirrorRow", () => {
  it("produces MCD parcelles row with same id as region", () => {
    const mirror = regionToParcelleMirrorRow(sampleRegion, "a0000000-0000-4000-8000-000000000001");
    expect(mirror.id).toBe(sampleRegion.id);
    expect(mirror.nom).toBe("TENIRA");
    expect(mirror.exploitation_id).toBe("a0000000-0000-4000-8000-000000000001");
    expect(mirror.surface_ha).toBe(12.5);
  });
});
