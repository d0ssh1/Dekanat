import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Разделение доступа', () => {
  test('студент не видит кабинет сотрудника — 404, а не «нет доступа»', async ({ page }) => {
    await login(page, 'student1');
    const res = await page.goto('/staff');
    expect(res?.status()).toBe(404);
  });

  test('сотрудник не открывает студенческие страницы', async ({ page }) => {
    await login(page, 'staff');
    await expect(page).toHaveURL(/\/staff$/);
    const res = await page.goto('/profile');
    expect(res?.status()).toBe(404);
  });

  test('два студента видят каждый свой профиль', async ({ browser }) => {
    const a = await browser.newPage();
    await login(a, 'student1');
    await a.goto('/profile');
    await expect(a.getByText('Воронцова').filter({ visible: true }).first()).toBeVisible();
    await expect(a.getByText('Ким Даниил').filter({ visible: true })).toHaveCount(0);

    const b = await browser.newPage();
    await login(b, 'student2');
    await b.goto('/profile');
    await expect(b.getByText('Ким Даниил').filter({ visible: true }).first()).toBeVisible();
    await expect(b.getByText('Воронцова').filter({ visible: true })).toHaveCount(0);
    await a.close();
    await b.close();
  });

  test('заголовки безопасности и CSP с nonce на каждой странице', async ({ page }) => {
    const res = await page.goto('/login');
    const h = res!.headers();
    expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('на странице нет горизонтальной прокрутки', async ({ page }) => {
    await login(page, 'student1');
    for (const path of ['/', '/profile', '/week', '/study', '/documents']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
