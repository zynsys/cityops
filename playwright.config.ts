import { defineConfig, devices } from '@playwright/test';

// Projects split by concern, selected via `--project` (see package.json):
//   test:e2e → chromium only (auth/home/reports) — the fast functional gate, unchanged behavior.
//   test:ui  → firefox/webkit/mobile-chrome (same functional specs, cross-browser/responsive) +
//              a11y (axe-core scan) + visual (screenshot regression), all chromium-only to avoid
//              multiplying visual baselines across engines.
const functionalSpecs = /(auth|home|reports)\.spec\.ts/;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testMatch: functionalSpecs },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: functionalSpecs },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: functionalSpecs },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }, testMatch: functionalSpecs },
    { name: 'a11y', use: { ...devices['Desktop Chrome'] }, testMatch: /a11y\.spec\.ts/ },
    { name: 'visual', use: { ...devices['Desktop Chrome'] }, testMatch: /visual\.spec\.ts/ },
  ],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
