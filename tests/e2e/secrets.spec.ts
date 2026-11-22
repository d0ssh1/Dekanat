import { expect, test } from '@playwright/test';
import { login } from './helpers';

/**
 * Ключи и пароли сервисов не должны попасть в браузер: скачиваем все скрипты страниц
 * и ищем в них сами секреты из .env и имена секретных переменных.
 */
const NAMES = ['GIGACHAT_AUTH_KEY', 'APP_DB_PASSWORD', 'DATABASE_URL', 'DATABASE_OWNER_URL', 'SEED_PASSWORD'];
const VALUES = [process.env.GIGACHAT_AUTH_KEY, process.env.APP_DB_PASSWORD].filter((v): v is string =>
  Boolean(v && v.length >= 8),
);

test('в коде страниц нет ключей и паролей сервисов', async ({ page, request }) => {
  await login(page, 'student1');
  const sources = new Set<string>();
  for (const path of ['/', '/assistant', '/documents/new']) {
    await page.goto(path);
    for (const src of await page
      .locator('script[src]')
      .evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src)))
      sources.add(src);
    const inline = await page.locator('script:not([src])').allTextContents();
    for (const t of inline) {
      for (const n of NAMES) expect(t, `inline-скрипт на ${path}`).not.toContain(n);
      for (const v of VALUES) expect(t.includes(v), `секрет в inline-скрипте на ${path}`).toBe(false);
    }
  }
  expect(sources.size).toBeGreaterThan(0);
  for (const src of sources) {
    const body = await (await request.get(src)).text();
    for (const n of NAMES) expect(body, src).not.toContain(n);
    for (const v of VALUES) expect(body.includes(v), `секрет в ${src}`).toBe(false);
  }
});
