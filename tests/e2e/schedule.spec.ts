import { expect, test } from '@playwright/test';
import { anchorMonday } from '../../seed/calendar';
import { addDays } from '../../src/lib/time';
import { login } from './helpers';

/**
 * Расписание на данных сида. Переносы сид ставит на «текущую учебную неделю» (anchorMonday),
 * поэтому тесты считают даты так же и не зависят от дня запуска.
 * ?now= работает только в режиме разработки — подменяет «сейчас».
 */
const A = anchorMonday();
const at = (day: string, hhmm: string) => encodeURIComponent(`${day}T${hhmm}:00+10:00`);
const visible = { visible: true } as const;

test.describe('Расписание', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'student1');
  });

  test('понедельник 10:00: отсчёт до ML, замена аудитории и перенос видны', async ({ page }) => {
    await page.goto(`/?now=${at(A, '10:00')}`);
    await expect(page.getByText('Машинное обучение').filter(visible).first()).toBeVisible();
    await expect(
      page
        .getByText(/через 10 мин|Следующая · через/)
        .filter(visible)
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/была D412/)
        .filter(visible)
        .first(),
    ).toBeVisible();
    // Перенесённая пара подписана словами, куда перенесли.
    await expect(
      page
        .getByText(/перенесена|→ чт/)
        .filter(visible)
        .first(),
    ).toBeVisible();
  });

  test('насыщенный четверг: 6 пар, прошедшие свёрнуты', async ({ page, isMobile }) => {
    await page.goto(`/?now=${at(addDays(A, 3), '11:44')}`);
    if (isMobile) {
      await expect(
        page
          .getByText(/2 пары прошли/)
          .filter(visible)
          .first(),
      ).toBeVisible();
      await page
        .getByText(/2 пары прошли/)
        .filter(visible)
        .first()
        .click();
      await expect(page.getByText('Философия').filter(visible).first()).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Четверг — 6 пар' })).toBeVisible();
      // Все 6 пар — в одном ряду, прошедшие — отдельными серыми карточками.
      await expect(page.getByText('прошла', { exact: true }).filter(visible)).toHaveCount(2);
    }
  });

  test('выходной: отсчёт до следующей пары и «Можно успеть»', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Выходной-экран — телефонный макет B2PhoneB');
    await page.goto(`/?now=${at(addDays(A, -1), '12:00')}`);
    await expect(
      page
        .getByText(/Сегодня пар нет/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Можно успеть' }).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('неделя: 18 пар, изменения в строках, листание недель', async ({ page }) => {
    await page.goto(`/week?now=${at(A, '10:00')}`);
    await expect(page.getByText(/18/).filter(visible).first()).toBeVisible();
    await expect(page.getByText(/D734/).filter(visible).first()).toBeVisible();
    await page.getByRole('link', { name: 'Следующая неделя' }).filter(visible).click();
    await expect(page).toHaveURL(new RegExp(`w=${addDays(A, 7)}`));
  });

  test('выгрузка недели в календарь — только своя и только после входа', async ({ page, request }) => {
    const res = await page.request.get(`/api/calendar?w=${A}`);
    expect(res.headers()['content-type']).toContain('text/calendar');
    const body = await res.text();
    expect(body).toContain('BEGIN:VEVENT');
    expect(body).toContain('Машинное обучение');
    expect(body).not.toContain('Корейский язык'); // пары другой группы не попадают

    const anon = await request.get(`/api/calendar?w=${A}`, { headers: { cookie: '' }, maxRedirects: 0 });
    expect([302, 307, 401]).toContain(anon.status());
  });
});
