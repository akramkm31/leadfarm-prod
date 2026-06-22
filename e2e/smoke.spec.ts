import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("button").first()).toBeVisible();
  });

  test("verify page route responds", async ({ page }) => {
    const res = await page.goto("/verify/ffffffffffffffff");
    expect(res).not.toBeNull();
    expect(res!.status()).toBeLessThan(500);
  });
});

test.describe("Public API", () => {
  test("verify API rejects short hash", async ({ request }) => {
    const res = await request.get("/api/v1/verify/abc");
    expect(res.status()).toBe(400);
  });

  test("verify API returns 404 for unknown certificate", async ({ request }) => {
    const res = await request.get("/api/v1/verify/ffffffffffffffff");
    expect(res.status()).toBe(404);
  });

  test("unauthenticated mutating API is denied", async ({ request }) => {
    const res = await request.post("/api/v1/treatments", {
      data: { parcelleName: "Test", type: "pulverisation", plannedDate: "2026-06-01" },
    });
    expect(res.status()).toBe(401);
  });
});
