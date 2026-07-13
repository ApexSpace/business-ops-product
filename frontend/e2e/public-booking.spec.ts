import { test, expect } from "@playwright/test";

test.describe("Public online booking", () => {
  test("disabled slug shows unavailable state", async ({ page }) => {
    await page.goto("/book/nonexistent-business-slug-xyz");
    await expect(page.getByText(/not available|unavailable/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("legacy calendar path redirects to book path", async ({ page }) => {
    await page.goto("/calendar/demo-slug");
    await page.waitForURL(/\/book\//, { timeout: 10000 });
  });

  test("booking alias path resolves", async ({ page }) => {
    const response = await page.goto("/booking/demo-slug");
    expect(response?.status()).toBeLessThan(500);
  });
});
