import { test, expect } from "@playwright/test";

test.describe("Public estimate (C-P0-01 waived)", () => {
  test("token route shows unavailable, not a working estimate", async ({
    page,
  }) => {
    const response = await page.goto("/estimate/any-public-token");
    expect(response?.status()).toBeLessThan(500);
    await expect(
      page.getByRole("heading", { name: /estimate review unavailable/i }),
    ).toBeVisible();
    await expect(page.getByText(/not available/i)).toBeVisible();
    await expect(page.getByText(/estimate not found/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /approve|reject/i })).toHaveCount(
      0,
    );
  });
});
