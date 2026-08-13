import { expect, test } from "@playwright/test";

test("sign-in and register pages load expected fields", async ({ page }) => {
  const signInResponse = await page.goto("/sign-in");

  expect(signInResponse?.status()).toBe(200);
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByLabel(/^password$/i)).toBeVisible();

  const registerResponse = await page.goto("/register");

  expect(registerResponse?.status()).toBe(200);
  await expect(page.getByLabel(/display name/i)).toBeVisible();
});
