/**
 * Быстрые снимки экранов для проверки вёрстки во время работы (не тест).
 * Входит тестовым аккаунтом через tests/e2e/helpers (пароль из .env или test-accounts.local.md).
 * Запуск: npx tsx scripts/peek.ts <папка> <кто> <ширина> <путь> [<путь>…]
 *   кто: student1 | student2 | staff
 */
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { login } from '../tests/e2e/helpers';

const [out = 'peek', who = 'student1', width = '1280', ...paths] = process.argv.slice(2);
const base = process.env.PEEK_URL ?? 'http://localhost:3000';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  baseURL: base,
  viewport: { width: Number(width), height: Number(width) < 800 ? 844 : 860 },
  deviceScaleFactor: 1,
  locale: 'ru-RU',
  timezoneId: 'Asia/Vladivostok',
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
await login(page, who as 'student1' | 'student2' | 'staff');
for (const [i, p] of paths.entries()) {
  await page.goto(p);
  await page.waitForTimeout(1200);
  const file = path.join(out, `${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file, '←', p);
}
await browser.close();
