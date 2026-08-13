import { expect, test } from "@playwright/test";

test("reports page loads without an unhandled server error", async ({ page }) => {
  const response = await page.goto("/reports");

  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).not.toContainText(/500|Internal Server Error/i);
});
