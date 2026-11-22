/**
 * Задать вопрос помощнику от имени тестовой студентки и напечатать ответ (проверка GigaChat вживую).
 * Запуск: npx tsx scripts/ask.ts "Какие у меня пары завтра?"  (на Windows/Git Bash — с MSYS_NO_PATHCONV=1)
 */
import 'dotenv/config';
import { chromium } from '@playwright/test';
import { login } from '../tests/e2e/helpers';
const browser = await chromium.launch();
const page = await (
  await browser.newContext({ baseURL: 'http://localhost:3000', viewport: { width: 1280, height: 900 } })
).newPage();
await login(page, 'student1');
await page.goto('/assistant?q=' + encodeURIComponent(process.argv[2]!));
await page.waitForTimeout(25000);
console.log((await page.locator('main').innerText()).slice(0, 900));
await browser.close();
