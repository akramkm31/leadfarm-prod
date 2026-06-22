import { describe, expect, it } from "vitest";
import { buildAccessProfile, can, canAll, canAny, canApi, canPath } from "./policy";

describe("RBAC policy", () => {
  const directeur             = buildAccessProfile("u1", "directeur",             "exp-1");
  const magasinier            = buildAccessProfile("u2", "magasinier",            "exp-1");
  const auditeur              = buildAccessProfile("u3", "auditeur",              "exp-1");
  const operateur             = buildAccessProfile("u4", "operateur",             "exp-1");
  const responsable_technique = buildAccessProfile("u5", "responsable_technique", "exp-1");
  const consultant            = buildAccessProfile("u6", "consultant",            "exp-1");
  const agronome              = buildAccessProfile("u7", "agronome",              "exp-1");

  it("normalizes admin alias to directeur", () => {
    expect(buildAccessProfile("u", "admin", null).role).toBe("directeur");
  });

  it("directeur has full access including admin", () => {
    expect(can(directeur, "settings")).toBe(true);
    expect(can(directeur, "admin.roles")).toBe(true);
    expect(can(directeur, "treatments.plan")).toBe(true);
  });

  it("magasinier manages stock but cannot plan or execute treatments", () => {
    expect(can(magasinier, "stock.edit")).toBe(true);
    expect(can(magasinier, "fertigation")).toBe(true);
    expect(can(magasinier, "products.edit")).toBe(true);
    expect(can(magasinier, "suppliers.edit")).toBe(true);
    expect(can(magasinier, "treatments.plan")).toBe(false);
    expect(can(magasinier, "treatments.execute")).toBe(false);
    expect(canPath(magasinier, "/stock")).toBe(true);
  });

  it("auditeur is read-oriented with own account settings", () => {
    expect(can(auditeur, "audit")).toBe(true);
    expect(can(auditeur, "settings")).toBe(true);
    expect(can(auditeur, "parcelles.edit")).toBe(false);
    expect(can(auditeur, "products.edit")).toBe(false);
    expect(can(auditeur, "treatments.plan")).toBe(false);
  });

  it("operateur executes treatments but cannot plan them", () => {
    expect(can(operateur, "treatments.execute")).toBe(true);
    expect(can(operateur, "meteo")).toBe(true);
    expect(can(operateur, "treatments.plan")).toBe(false);
    expect(canApi(operateur, "POST", "/api/v1/treatments")).toBe(false);
    expect(canPath(operateur, "/live")).toBe(true);
  });

  it("vision analyze API allowed for operateur and agronome", () => {
    expect(canApi(operateur, "POST", "/api/v1/vision/analyze")).toBe(true);
    expect(canApi(agronome, "POST", "/api/v1/vision/analyze")).toBe(true);
    expect(canApi(auditeur, "POST", "/api/v1/vision/analyze")).toBe(false);
  });

  it("responsable_technique has full agronomic access but cannot manage suppliers or admin", () => {
    expect(can(responsable_technique, "treatments.plan")).toBe(true);
    expect(can(responsable_technique, "fertigation")).toBe(true);
    expect(can(responsable_technique, "meteo")).toBe(true);
    expect(can(responsable_technique, "treatments.execute")).toBe(true);
    expect(can(responsable_technique, "parcelles.edit")).toBe(true);
    expect(can(responsable_technique, "stock.edit")).toBe(true);
    expect(can(responsable_technique, "suppliers.view")).toBe(true);
    expect(can(responsable_technique, "suppliers.edit")).toBe(false);
    expect(can(responsable_technique, "admin.roles")).toBe(false);
    expect(can(responsable_technique, "recoltes")).toBe(false);
    expect(can(responsable_technique, "resultats")).toBe(false);
  });

  it("consultant is read-only strategic — sees outcomes and stock but cannot edit anything", () => {
    expect(can(consultant, "recoltes")).toBe(true);
    expect(can(consultant, "resultats")).toBe(true);
    expect(can(consultant, "satellite")).toBe(true);
    expect(can(consultant, "stock.view")).toBe(true);
    expect(can(consultant, "stock.edit")).toBe(false);
    expect(can(consultant, "treatments.plan")).toBe(false);
    expect(can(consultant, "parcelles.edit")).toBe(false);
    expect(can(consultant, "admin.roles")).toBe(false);
    expect(can(consultant, "audit")).toBe(false);
  });

  it("operateur can access their own registre after execution", () => {
    expect(can(operateur, "registre")).toBe(true);
    expect(can(operateur, "treatments.execute")).toBe(true);
    expect(can(operateur, "treatments.plan")).toBe(false);
    expect(canPath(operateur, "/registre")).toBe(true);
  });

  it("agronome can access live page (seeding gap analysis) and satellite but not execute", () => {
    expect(can(agronome, "live")).toBe(true);
    expect(can(agronome, "satellite")).toBe(true);
    expect(can(agronome, "treatments.plan")).toBe(true);
    expect(can(agronome, "treatments.execute")).toBe(false);
    expect(can(agronome, "stock.edit")).toBe(false);
    expect(can(agronome, "admin.roles")).toBe(false);
    expect(canPath(agronome, "/live")).toBe(true);
  });

  it("canApi denies unlisted mutating methods (fail-safe default)", () => {
    expect(canApi(operateur, "POST", "/api/v1/unlisted-route")).toBe(false);
    expect(canApi(directeur, "DELETE", "/api/v1/unlisted-route")).toBe(false);
    expect(canApi(operateur, "GET", "/api/v1/unlisted-route")).toBe(true);
  });

  it("canAll requires every feature to be present", () => {
    expect(canAll(directeur, ["treatments.plan", "treatments.execute", "admin.roles"])).toBe(true);
    expect(canAll(agronome, ["treatments.plan", "treatments.execute"])).toBe(false);
    expect(canAll(agronome, ["treatments.plan", "satellite", "live"])).toBe(true);
    expect(canAll(operateur, [])).toBe(true); // vacuously true
  });

  it("canAny returns true when at least one feature matches", () => {
    expect(canAny(magasinier, ["treatments.plan", "stock.edit"])).toBe(true);
    expect(canAny(magasinier, ["treatments.plan", "treatments.execute"])).toBe(false);
    expect(canAny(consultant, ["recoltes", "admin.roles"])).toBe(true);
  });
});
