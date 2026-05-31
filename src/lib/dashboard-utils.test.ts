import { describe, expect, it } from "vitest";
import { countTreatmentsInWeek, stockFillPercent, sumParcelleHectares } from "./dashboard-utils";

describe("dashboard-utils", () => {
  it("sums parcelle hectares", () => {
    expect(sumParcelleHectares([{ areaHectares: 12.4 }, { areaHectares: 8.1 }])).toBe(20.5);
  });

  it("computes stock fill percent", () => {
    const pct = stockFillPercent([
      { currentQuantity: 100, minThreshold: 50 },
      { currentQuantity: 25, minThreshold: 50 },
    ]);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("counts planned treatments in current week", () => {
    const mon = new Date();
    const day = mon.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    mon.setDate(mon.getDate() + diff);
    const year = mon.getFullYear();
    const month = String(mon.getMonth() + 1).padStart(2, "0");
    const date = String(mon.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${date}`;
    const count = countTreatmentsInWeek([
      { status: "planned", planned_date: iso },
      { status: "completed", planned_date: iso },
    ]);
    expect(count).toBe(1);
  });
});
