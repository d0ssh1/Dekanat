import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { anchorMonday } from '../../seed/calendar';
import { login, baseOrigin } from './helpers';

const visible = { visible: true } as const;
const MON_10 = encodeURIComponent(`${anchorMonday()}T10:00:00+10:00`);

test.describe('ИИ-помощник', () => {
  test.beforeAll(() => {
    execSync('npm run db:seed', { stdio: 'ignore' });
  });

  test('фраза из строки «Помощник» → собранная заявка → отправка кнопкой', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/assistant?q=' + encodeURIComponent('Нужна справка в военкомат'));
    await expect(page.getByText('Собрала заявку').filter(visible).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Что взяла и откуда').filter(visible).first()).toBeVisible();
    await expect(page.getByText('из профиля').filter(visible).first()).toBeVisible();
    await page.getByRole('button', { name: 'Отправить в деканат' }).filter(visible).first().click();
    await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    await expect(
      page
        .getByText(/через помощника/)
        .filter(visible)
        .first(),
    ).toBeVisible();
  });

  test('отвечает про пары, перенос и баллы по данным студента', async ({ page }) => {
    await login(page, 'student1');
    await page.goto(`/assistant?now=${MON_10}`);
    const ask = async (q: string) => {
      await page.getByLabel('Сообщение помощнику').fill(q);
      await page.getByRole('button', { name: 'Отправить' }).click();
    };
    await ask('Какие пары сегодня?');
    await expect(page.getByText('Машинное обучение').filter(visible).first()).toBeVisible({
      timeout: 15_000,
    });
    await ask('Что перенесли на этой неделе?');
    await expect(
      page
        .getByText(/Веб-разработка перенесена/)
        .filter(visible)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await ask('Сколько не хватает до допуска?');
    await expect(
      page
        .getByText(/Машинное обучение \(2\)/)
        .filter(visible)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('помощник второго студента видит только его данные', async ({ page }) => {
    await login(page, 'student2');
    await page.goto('/assistant?q=' + encodeURIComponent('Что с моими заявками?'));
    await expect(
      page
        .getByText(/Справка об обучении на английском/)
        .filter(visible)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Материальная помощь/).filter(visible)).toHaveCount(0);
  });

  test('API помощника: без входа — 401, с чужого сайта — 403, сотруднику — 401', async ({
    page,
    request,
    browser,
  }) => {
    const body = { question: 'привет', threadId: crypto.randomUUID(), history: [] };
    expect(
      (await request.post('/api/assistant', { data: body, headers: { origin: baseOrigin() } })).status(),
    ).toBe(401);
    await login(page, 'student1');
    expect(
      (
        await page.request.post('/api/assistant', { data: body, headers: { origin: 'https://evil.example' } })
      ).status(),
    ).toBe(403);
    const staff = await browser.newPage();
    await login(staff, 'staff');
    expect(
      (
        await staff.request.post('/api/assistant', {
          data: body,
          headers: { origin: baseOrigin() },
        })
      ).status(),
    ).toBe(401);
    await staff.close();
  });
});
