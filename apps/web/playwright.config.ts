import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * The suite runs against a production build on desktop and mobile viewports.
 * `webServer` boots the app automatically, so `npm run test:e2e` is a single
 * command both locally and in CI; the API is expected to be running already
 * (the CI job starts it before this step).
 */
export default defineConfig({
  testDir: './e2e',
  // The API keeps catalog and watchlist state in one place, so specs that
  // mutate it must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    // Lets a sandbox or air-gapped runner point at a preinstalled Chromium
    // instead of downloading the browser bundle.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
    screenshot: 'only-on-failure',
    locale: 'hu-HU',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      // Mobile viewport on Chromium: the responsive suite then needs a single
      // browser download, which keeps CI (and offline runners) simple.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
