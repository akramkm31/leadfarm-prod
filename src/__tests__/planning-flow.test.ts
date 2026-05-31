import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkPlanningMeteo } from "@/lib/services/meteo";
import { checkStockForPlanning } from "@/lib/services/stock-check";
import { getConsultantTenants, assertConsultantAccess } from "@/lib/auth/consultant-access";
import { fireAlert } from "@/lib/services/notifications";

// Mock Supabase Server Client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));

// Mock fetch for Open-Meteo
global.fetch = vi.fn();

describe("Planning flow — integration & logic tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 1. Meteo check: wind > seuil returns valid=false with blocker
  it("Meteo check: vent > seuil returns valid=false with blocker", async () => {
    const mockDailyData = {
      daily: {
        wind_speed_10m_max: [25.0],
        precipitation_sum: [0.0],
        temperature_2m_max: [24.0],
        temperature_2m_min: [12.0],
        precipitation_probability_max: [10],
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockDailyData,
    });

    const threshold = {
      vent_max_km_h: 20.0,
      pluie_delai_heures: 4,
      temperature_min_c: 5.0,
      temperature_max_c: 35.0,
    };

    const result = await checkPlanningMeteo(35.21, -0.64, "2026-05-24", threshold);

    expect(result.valid).toBe(false);
    expect(result.blockers).toContain("Vent 25 km/h > seuil 20 km/h");
    expect(result.forecast.wind_speed_max_kmh).toBe(25.0);
  });

  // 2. Stock check projected: accounts for future planned consumptions
  it("Stock check projected: accounts for future planned consumptions", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: 10, // Projected stock remaining
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { nom_produit: "Score 250 EC" },
            error: null,
          }),
        }),
      }),
    });

    const result = await checkStockForPlanning(1, "2026-05-25", [
      { id_produit: 101, quantite: 15, unite: "L" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.manquant.length).toBe(1);
    expect(result.manquant[0].produit).toBe("Score 250 EC");
    expect(result.manquant[0].requis).toBe(15);
    expect(result.manquant[0].disponible).toBe(10);
  });

  // 3. Consultant cannot access tenant without tenant_utilisateur record
  it("R13: consultant cannot access tenant without tenant_utilisateur record", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { identifiant_tenant: 1, role: "CONSULTANT" },
              { identifiant_tenant: 2, role: "CONSULTANT" },
            ],
            error: null,
          }),
        }),
      }),
    });

    const tenants = await getConsultantTenants(99);
    expect(tenants).toContain(1);
    expect(tenants).toContain(2);
    expect(tenants).not.toContain(3);

    await expect(assertConsultantAccess(99, 3)).rejects.toThrow(
      "Consultant 99 has no access to tenant 3"
    );
  });

  // 4. Alert routing routing simulation
  it("Alert routing: RUPTURE_STOCK fires PUSH+EMAIL to Magasinier", async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === "alert_routing") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      { canal: "PUSH", priorite: 1, role_cible: "MAGASINIER" },
                      { canal: "EMAIL", priorite: 1, role_cible: "MAGASINIER" },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "tenant_utilisateur") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { identifiant_utilisateur: 50, role: "MAGASINIER" },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "UTILISATEUR") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  identifiant_utilisateur: 50,
                  nom_complet: "Ahmed Stock",
                  adresse_email: "ahmed@leadfarm.dz",
                  numero_telephone: "+213555123456",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "ALERTE") {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    // Capture console output to verify dispatching logs
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await fireAlert({
      eventType: "RUPTURE_STOCK",
      tenantId: 1,
      message: "Rupture critique de stock sur Sumi-Alpha!",
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[Mock Push] To User #50"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[Mock Email] To ahmed@leadfarm.dz"));
    consoleSpy.mockRestore();
  });
});
