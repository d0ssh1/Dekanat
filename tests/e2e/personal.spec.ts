import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

const visible = { visible: true } as const;

test.describe('Главная под себя и состояния', () => {
  test.beforeAll(() => {
    execSync('npm run db:seed', { stdio: 'ignore' });
  });

  test('настройка главной: раскладка «Учёба в фокусе» сохраняется', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Блоки главной настраиваются на компьютере (макет B2CustomV4)');
    await login(page, 'student1');
    await page.goto('/');
    await page.getByRole('button', { name: 'Настроить главную' }).first().click();
    await expect(page.getByText('Настройка главной')).toBeVisible();
    await page.getByRole('button', { name: 'Учёба в фокусе' }).click();
    await page.getByRole('button', { name: 'Готово' }).click();
    await expect(page.getByText('Раскладка сохранена')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('region', { name: /Блок «/ }).first()).toBeVisible();
    const order = await page
      .getByRole('region', { name: /Блок «/ })
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(order[0]).toBe('Блок «Учёба»');
  });

  test('цвет главной меняется в профиле и остаётся после перезагрузки', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/profile');
    await page.getByRole('radio', { name: 'голубой' }).filter(visible).first().click();
    await page.waitForTimeout(500);
    await page.reload();
    const hero = await page.locator('[style*="--hero"]').first().getAttribute('style');
    expect(hero).toContain('#7cc4ff');
  });

  test('демо-время: кабинет показывает учебный день', async ({ page }) => {
    await login(page, 'student2');
    await page.goto('/profile');
    await page.getByRole('switch', { name: 'Демо-время' }).filter(visible).first().click();
    await expect(page.getByText('Демо-время включено')).toBeVisible();
    await page.goto('/');
    await expect(
      page
        .getByText(/До следующей пары|Идёт сейчас|Следующая/)
        .filter(visible)
        .first(),
    ).toBeVisible();
  });

  test('нет сети — плашка с временем последних данных', async ({ page, context }) => {
    await login(page, 'student1');
    await page.goto('/week');
    await context.setOffline(true);
    await expect(page.getByRole('status').filter({ hasText: 'Нет сети' })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: 'Нет сети' })).toHaveCount(0);
  });

  test('неизвестная страница — 404 с дорогой домой', async ({ page }) => {
    await login(page, 'student1');
    const res = await page.goto('/no-such-page');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Такой страницы нет' })).toBeVisible();
  });

  test('манифест и иконка доступны без входа', async ({ request }) => {
    const m = await request.get('/manifest.webmanifest');
    expect(m.ok()).toBeTruthy();
    expect((await m.json()).short_name).toBe('деканат');
    expect((await request.get('/icon.svg')).ok()).toBeTruthy();
  });
});
