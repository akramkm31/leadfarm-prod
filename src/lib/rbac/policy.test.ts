import { describe, expect, it } from "vitest";
import { buildAccessProfile, can, canApi, canPath } from "./policy";

describe("RBAC policy", () => {
  const directeur = buildAccessProfile("u1", "directeur", "exp-1");
  const magasinier = buildAccessProfile("u2", "magasinier", "exp-1");
  const auditeur = buildAccessProfile("u3", "auditeur", "exp-1");
  const operateur = buildAccessProfile("u4", "operateur", "exp-1");

  it("normalizes admin alias to directeur", () => {
    expect(buildAccessProfile("u", "admin", null).role).toBe("directeur");
  });

  it("directeur has settings but not simulation", () => {
    expect(can(directeur, "simulation")).toBe(false);
    expect(can(directeur, "settings")).toBe(true);
  });

  it("magasinier has stock but not treatments edit", () => {
    expect(can(magasinier, "stock.edit")).toBe(true);
    expect(can(magasinier, "treatments.edit")).toBe(false);
    expect(canPath(magasinier, "/stock")).toBe(true);
    expect(canPath(magasinier, "/simulation")).toBe(false);
  });

  it("auditeur is read-oriented", () => {
    expect(can(auditeur, "audit")).toBe(true);
    expect(can(auditeur, "settings")).toBe(false);
    expect(can(auditeur, "parcelles.edit")).toBe(false);
  });

  it("operateur can edit treatments but not simulation", () => {
    expect(can(operateur, "treatments.edit")).toBe(true);
    expect(can(operateur, "simulation")).toBe(false);
    expect(canPath(operateur, "/live")).toBe(true);
  });

  it("blocks simulation API for operateur and directeur", () => {
    expect(canApi(operateur, "POST", "/api/v1/simulation/run")).toBe(false);
    expect(canApi(directeur, "POST", "/api/v1/simulation/run")).toBe(false);
  });
});
