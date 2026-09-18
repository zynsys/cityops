import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  '/',
  '/reports',
  '/map',
  '/reports/new',
  '/analytics',
  '/analytics?range=all',
  '/sign-in',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/403',
];

async function expectReadablePopup(page: Page) {
  const popup = page.locator('.leaflet-popup');
  await expect(popup).toBeVisible();
  const palette = await page.locator('.cityops-map').evaluate((map) => {
    const styles = getComputedStyle(map);
    const color = (token: string) => {
      const swatch = document.createElement('span');
      swatch.style.color = styles.getPropertyValue(token).trim();
      return swatch.style.color;
    };
    return {
      surface: color('--color-surface'),
      foreground: color('--color-foreground'),
      accent: color('--color-accent'),
    };
  });

  await expect(popup.locator('.leaflet-popup-content-wrapper')).toHaveCSS('background-color', palette.surface);
  await expect(popup.locator('.leaflet-popup-tip')).toHaveCSS('background-color', palette.surface);
  await expect(popup.getByRole('region', { name: 'Report summary' })).toHaveCSS('color', palette.foreground);
  await expect(popup.getByRole('link', { name: 'View details' })).toHaveCSS('color', palette.accent);

  // A hovered close button can mask Leaflet's separate keyboard-focus colour.
  await page.mouse.move(0, 0);
  const close = popup.locator('.leaflet-popup-close-button');
  await close.focus();
  await expect(close).toHaveCSS('color', palette.accent);
  const results = await new AxeBuilder({ page }).include('.cityops-map').analyze();
  expect(results.violations).toEqual([]);
}

for (const theme of ['light', 'dark']) {
  for (const path of pages) {
    test(`${path} has no accessibility violations in ${theme} mode`, async ({ page }) => {
      await page.addInitScript((storedTheme) => {
        window.localStorage.setItem('theme', storedTheme);
      }, theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  for (const path of ['/reports', '/map']) {
    test(`${path} popup stays readable after navigation and theme changes from ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.addInitScript((storedTheme) => {
        window.localStorage.setItem('theme', storedTheme);
      }, theme);

      // Load another Leaflet route first to cover client-navigation CSS ordering.
      await page.goto('/analytics');
      await page.locator('.cityops-map').waitFor();
      await page.getByRole('navigation', { name: 'Main navigation', exact: true }).locator(`a[href="${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));

      // The existing E2E seed supplies reports with coordinates; keyboard opening
      // avoids overlapping pins making a mouse click select a neighbouring report.
      const marker = page.locator('.cityops-map .leaflet-marker-icon[title]').first();
      await expect(marker).toBeVisible();
      await marker.focus();
      await page.keyboard.press('Enter');
      await expectReadablePopup(page);

      const otherTheme = theme === 'dark' ? 'light' : 'dark';
      await page.getByRole('button', { name: `Switch to ${otherTheme} mode`, exact: true }).click();
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${otherTheme}\\b`));
      await expectReadablePopup(page);
    });
  }
}
