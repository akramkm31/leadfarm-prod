import { describe, expect, it } from "vitest";
import { treatmentsForParcelle } from "./dashboard-map-utils";
import type { Parcelle } from "@/lib/mock-data";

const parcelle: Parcelle = {
  id: "reg-1",
  name: "TENIRA",
  parentId: null,
  exploitationId: "exp-001",
  areaHectares: 10,
  cropType: "Agrumes",
  variete: "",
  cultureType: "arboriculture",
  soilType: "",
  site: "",
  zone: "",
  secteur: "",
  irrigation: "aucune",
  center: [0, 0],
  boundary: [],
  color: "#10b981",
  children: [],
  lastTreatmentDate: null,
  treatmentCount: 0,
};

describe("treatmentsForParcelle", () => {
  it("matches by parcelle_id", () => {
    const list = treatmentsForParcelle(
      [{ id: "t1", parcelle_id: "reg-1", site_name: "Other", planned_date: "2025-01-01" }],
      parcelle
    );
    expect(list).toHaveLength(1);
  });

  it("matches by site_name when id missing", () => {
    const list = treatmentsForParcelle(
      [{ id: "t2", site_name: "TENIRA", planned_date: "2025-02-01" }],
      parcelle
    );
    expect(list).toHaveLength(1);
  });
});
