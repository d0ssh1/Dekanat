import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config();

/**
 * Сценарии в браузере: каждый прогоняется на телефоне шириной 360 px и на компьютере.
 * Локально переиспользует уже запущенный `npm run dev`; в CI поднимает сборку сам.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /(e2e|visual)\/.*\.spec\.ts$/,
  // Снимки экранов запускаются отдельно: npx playwright test tests/visual --project=desktop
  testIgnore: process.env.SCREENS ? [] : ['**/visual/**'],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'ru-RU',
    timezoneId: 'Asia/Vladivostok',
  },
  projects: [
    { name: 'mobile-360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
