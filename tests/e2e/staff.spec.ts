import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

const visible = { visible: true } as const;

/**
 * Живой цикл заявки в двух окнах: студент подаёт → методист обрабатывает →
 * студент видит изменения без перезагрузки (SSE) и получает PDF.
 */
test.describe('Кабинет сотрудника и реальное время', () => {
  test.beforeAll(() => {
    execSync('npm run db:seed', { stdio: 'ignore' });
  });

  test('заявка проходит путь от студента к методисту и обратно в реальном времени', async ({ browser }) => {
    const studentCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const staffCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const student = await studentCtx.newPage();
    const staff = await staffCtx.newPage();

    // 1. Студент подаёт заявку
    await login(student, 'student1');
    await student.goto('/documents/new?type=grade_extract');
    await student.getByRole('button', { name: 'Отправить в деканат' }).filter(visible).first().click();
    await expect(student).toHaveURL(/\/documents\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    const requestUrl = student.url();
    await expect(student.getByText('Отправлена').filter(visible).first()).toBeVisible();

    // 2. Методист видит её в очереди «Новые»
    await login(staff, 'staff');
    await expect(staff.getByRole('heading', { name: 'Заявки студентов' })).toBeVisible();
    await staff
      .getByRole('link', { name: /Выписка из зачётной книжки/ })
      .first()
      .click();

    // 3. Берёт в работу — у студента без перезагрузки всплывает уведомление и меняется статус
    await staff.getByRole('button', { name: 'Взять в работу' }).click();
    await expect(student.getByText(/принята в работу/).first()).toBeVisible({ timeout: 10_000 });
    await expect(student.getByText('Принята').filter(visible).first()).toBeVisible({ timeout: 10_000 });

    // 4. Готова — PDF собирается, студент получает уведомление и скачивает справку
    await staff.getByRole('button', { name: /Готова — собрать PDF/ }).click();
    await expect(student.getByText(/№\d+ готова/).first()).toBeVisible({ timeout: 10_000 });
    await student.goto(requestUrl);
    const pdf = await student.request.get(`${requestUrl.replace('/documents/', '/api/documents/')}/pdf`);
    expect(pdf.headers()['content-type']).toBe('application/pdf');

    await studentCtx.close();
    await staffCtx.close();
  });

  test('перенос пары: студент сразу видит уведомление', async ({ browser }) => {
    const studentCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const staffCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const student = await studentCtx.newPage();
    const staff = await staffCtx.newPage();
    await login(student, 'student1');
    await student.goto('/week');
    await login(staff, 'staff');
    await staff.goto('/staff/schedule');
    await staff.getByRole('button', { name: 'Изменить' }).first().click();
    await staff.getByLabel('Новая аудитория').fill('A1017');
    await staff.getByRole('button', { name: 'Заменить аудиторию' }).click();
    await expect(student.getByText(/аудитория A1017/).first()).toBeVisible({ timeout: 10_000 });
    await studentCtx.close();
    await staffCtx.close();
  });

  test('уведомления: прочитать все снимает отметки «Новое»', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/notifications');
    await expect(page.getByLabel('Новое').first()).toBeAttached();
    await page.getByRole('button', { name: 'Прочитать все' }).filter(visible).first().click();
    await expect(page.getByLabel('Новое')).toHaveCount(0, { timeout: 10_000 });
  });

  test('студент не может вызвать действия сотрудника', async ({ page }) => {
    await login(page, 'student1');
    for (const p of ['/staff', '/staff/schedule', '/staff/announce']) {
      expect((await page.goto(p))?.status(), p).toBe(404);
    }
  });
});
