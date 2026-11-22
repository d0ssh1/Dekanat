import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { switchToTestDb } from './tests/support/test-db';

config();
// Своя база и свой сервер на порту 3100: прогон не трогает кабинет, открытый в браузере на 3000.
const isolated = switchToTestDb();
const PORT = isolated ? 3100 : 3000;

/**
 * Сценарии в браузере: каждый прогоняется на телефоне шириной 360 px и на компьютере.
 * Локально поднимает отдельный `next dev` на 3100 с тестовой базой; в CI — сборку на 3000.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /(e2e|visual)\/.*\.spec\.ts$/,
  // Снимки экранов запускаются отдельно: npx playwright test tests/visual --project=desktop
  globalSetup: './tests/support/global-setup.ts',
  testIgnore: process.env.SCREENS ? [] : ['**/visual/**'],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'ru-RU',
    timezoneId: 'Asia/Vladivostok',
  },
  projects: [
    { name: 'mobile-360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    // Локально — настоящая сборка в .next-e2e, а не next dev: второй dev-сервер переписывал tsconfig
    // и next-env.d.ts, и оба сервера перезагружали друг друга. Сборка ещё и быстрее отвечает.
    command: process.env.CI ? 'npm run start' : `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    env: {
      ...(process.env as Record<string, string>),
      ...(isolated
        ? {
            NEXT_DIST_DIR: '.next-e2e',
            PUBLIC_URL: `http://localhost:${PORT}`,
            ALLOW_TIME_OVERRIDE: '1',
            // Тесты не ходят в GigaChat: не тратим токены и не зависим от сети — отвечают правила.
            GIGACHAT_AUTH_KEY: '',
          }
        : {}),
    },
    reuseExistingServer: !process.env.CI,
    timeout: 400_000,
  },
});
