import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { login } from './helpers';
import { idOf } from './db';

const visible = { visible: true } as const;

// Минимальный настоящий PDF и «PDF» с подменённым расширением.
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const FAKE = Buffer.from('MZ\x90\x00 this is not a pdf');

test.describe('Заявки и справки', () => {
  // Тесты меняют данные (отправка, отмена, загрузка) — каждый проект начинает со свежего сида.
  test.beforeAll(() => {
    execSync('npm run db:seed', { stdio: 'ignore' });
  });

  test('список: готовая сверху, у остальных статус словами', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/documents');
    await expect(page.getByText('Можно забрать').filter(visible).first()).toBeVisible();
    await expect(
      page
        .getByText(/Нужен документ от вас/)
        .filter(visible)
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/точной даты пока нет/)
        .filter(visible)
        .first(),
    ).toBeVisible();
  });

  test('новая заявка: проверить, поменять экземпляры, отправить и увидеть статус', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/documents/new?type=study_cert');
    await page.getByRole('button', { name: 'Больше экземпляров' }).click();
    await page.getByRole('button', { name: 'Отправить в деканат' }).filter(visible).first().click();
    await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    await expect(page.getByText('Отправлена').filter(visible).first()).toBeVisible();
    await expect(page.getByText('Экземпляров').filter(visible).first()).toBeVisible();
    // Отмена с подтверждением на месте.
    await page.getByRole('button', { name: 'Отменить заявку' }).filter(visible).first().click();
    await page.getByRole('button', { name: 'Да, отменить' }).filter(visible).first().click();
    await expect(page.getByText('Отменена').filter(visible).first()).toBeVisible();
  });

  test('готовая справка: PDF скачивается, QR ведёт на проверку', async ({ page }) => {
    await login(page, 'student1');
    const list = await page.request.get('/documents');
    expect(list.ok()).toBeTruthy();
    const ready = await idOf('alinaRequest'); // №1031 — материальная помощь (не готова)
    const no = await page.request.get(`/api/documents/${ready}/pdf`);
    expect(no.status()).toBe(404);
    await page.goto('/documents');
    const href = await page
      .getByRole('link', { name: 'Скачать PDF' })
      .filter(visible)
      .first()
      .getAttribute('href');
    const pdf = await page.request.get(href!);
    expect(pdf.headers()['content-type']).toBe('application/pdf');
    expect(pdf.headers()['content-disposition']).toContain('attachment');
    const bytes = await pdf.body();
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  });

  test('нужно действие: загрузка файла проверяет тип и возвращает заявку в работу', async ({
    page,
    isMobile,
  }) => {
    await login(page, 'student1');
    await page.goto('/documents');
    await page
      .getByRole('link', { name: /Материальная помощь/ })
      .filter(visible)
      .first()
      .click();
    await expect(page.getByText('Нужно от вас').filter(visible).first()).toBeVisible();
    // На странице две вёрстки (телефон и ПК); берём поле файла из видимой.
    const input = page.locator('input[type=file]').nth(isMobile ? 0 : 1);
    await input.setInputFiles({ name: 'income.pdf', mimeType: 'application/pdf', buffer: FAKE });
    await expect(page.getByRole('alert').filter({ hasText: 'Нужен PDF, JPG или PNG' }).first()).toBeVisible();
    await input.setInputFiles({ name: 'income.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(page.getByText('Принята').filter(visible).first()).toBeVisible({ timeout: 10_000 });
  });

  test('чужая заявка, её PDF и файлы — 404; загрузка в чужую — отказ', async ({ page }) => {
    const kimReq = await idOf('kimRequest');
    await login(page, 'student1');
    expect((await page.goto(`/documents/${kimReq}`))?.status()).toBe(404);
    expect((await page.request.get(`/api/documents/${kimReq}/pdf`)).status()).toBe(404);
    const up = await page.request.post(`/api/documents/${kimReq}/attachments`, {
      headers: { origin: 'http://localhost:3000' },
      multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: PDF } },
    });
    expect(up.status()).toBe(422);
  });

  test('загрузка с чужого сайта отклоняется (CSRF)', async ({ page }) => {
    const mine = await idOf('alinaRequest');
    await login(page, 'student1');
    const up = await page.request.post(`/api/documents/${mine}/attachments`, {
      headers: { origin: 'https://evil.example' },
      multipart: { file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: PDF } },
    });
    expect(up.status()).toBe(403);
  });

  test('проверка справки по QR: неизвестный код — «не найдена», без входа', async ({ page }) => {
    await page.goto('/verify/AAAAAAAAAAAAAAAAAAAAAAAA');
    await expect(page.getByRole('heading', { name: 'Справка не найдена' })).toBeVisible();
  });
});
