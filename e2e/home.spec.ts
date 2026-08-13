import { expect, test } from "@playwright/test";

test("home page loads without a server error", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/CityOps/i);
  await expect(page.locator("body")).not.toContainText(/500|Internal Server Error/i);
});
