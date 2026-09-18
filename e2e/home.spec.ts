import { expect, test } from '@playwright/test';

test('home page loads without a server error', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/CityOps/i);
  await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/i);
});

test('serves the current CityOps favicon instead of the legacy icon', async ({ page }) => {
  await page.goto('/');
  const icon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveAttribute('sizes', 'any');
  await expect(icon).toHaveAttribute('href', /^\/icon\.svg(?:\?|$)/);

  const href = await icon.getAttribute('href');
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  expect(await response.text()).toContain('<title>CityOps</title>');

  const fallback = page.locator('link[rel="icon"][type="image/x-icon"]');
  await expect(fallback).toHaveCount(1);
  const fallbackHref = await fallback.getAttribute('href');
  const fallbackResponse = await page.request.get(fallbackHref!);
  expect(fallbackResponse.ok()).toBe(true);
  const ico = await fallbackResponse.body();
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBe(3);
  expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);

  // Both modern and fallback icons must render the new yellow brand tile.
  const icons = await page.evaluate(
    async (sources) =>
      Promise.all(
        sources.map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 32;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0, 32, 32);
          return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            background: Array.from(context.getImageData(16, 4, 1, 1).data),
          };
        }),
      ),
    [href!, fallbackHref!],
  );
  expect(icons[0]).toMatchObject({ width: 32, height: 32 });
  for (const image of icons) {
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(image.background).toEqual([244, 202, 69, 255]);
  }
});

test('defaults to dark and preserves an explicit theme choice after reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);

  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/\blight\b/);

  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
});

test('hero keeps its centred heading above both actions without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveCSS('text-align', 'center');
  await expect(page.getByRole('heading', { name: 'Find Reports Near You' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick Photo Report' })).toBeVisible();

  const headingBox = await heading.boundingBox();
  const searchBox = await page.getByRole('heading', { name: 'Find Reports Near You' }).boundingBox();
  const uploadBox = await page.getByRole('heading', { name: 'Quick Photo Report' }).boundingBox();
  expect(headingBox).not.toBeNull();
  expect(searchBox?.y).toBeGreaterThan((headingBox?.y ?? 0) + (headingBox?.height ?? 0));
  expect(uploadBox?.y).toBeGreaterThan((headingBox?.y ?? 0) + (headingBox?.height ?? 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('header highlights Reports and Analytics instead of permanently highlighting New Report', async ({ page }) => {
  await page.goto('/');

  async function openNavigation() {
    const desktop = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    if (await desktop.isVisible()) return desktop;
    const mobile = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
    if (!(await mobile.isVisible())) await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    return mobile;
  }

  for (const [href, label] of [
    ['/reports', 'Reports'],
    ['/analytics', 'Analytics'],
  ]) {
    let nav = await openNavigation();
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    nav = await openNavigation();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'New Report', exact: true })).not.toHaveAttribute('aria-current');
  }
});
