import { expect, test } from '@playwright/test';
import { login } from './helpers';
import { idOf } from './db';

const visible = { visible: true } as const;

test.describe('Успеваемость', () => {
  test('средний балл, предметы и предупреждение о допуске', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/study');
    await expect(page.getByText('4,62').filter(visible).first()).toBeVisible({ timeout: 8000 });
    await expect(
      page
        .getByText(/Машинное\sобучение:\sне\sхватает\s2\sбаллов/)
        .filter(visible)
        .first(),
    ).toBeVisible();
    await page
      .getByRole('link', { name: /Как добрать баллы до допуска/ })
      .filter(visible)
      .first()
      .click();
    await expect(page).toHaveURL(/\/study\/[0-9a-f-]{36}$/);
    await expect(
      page
        .getByText(/Из чего баллы · 48 из \d+/)
        .filter(visible)
        .first(),
    ).toBeVisible();
  });

  test('калькулятор пересчитывает оценку', async ({ page }) => {
    await login(page, 'student1');
    await page.goto('/study');
    await page
      .getByRole('link', { name: /Как добрать баллы до допуска/ })
      .filter(visible)
      .first()
      .click();
    const exam = page.getByRole('slider', { name: 'Экзамен' }).filter(visible).first();
    await exam.fill('40');
    await expect(page.getByText('отлично').filter(visible).first()).toBeVisible();
    await exam.fill('0');
    await expect(page.getByText('неудовлетворительно').filter(visible).first()).toBeVisible();
  });

  test('зачётная книжка: семестры видны (на телефоне раскрываются)', async ({ page, isMobile }) => {
    await login(page, 'student1');
    await page.goto('/study');
    const book = page.getByRole('region', { name: 'Зачётная книжка' }).filter(visible).first();
    // На компьютере все семестры открыты карточками, на телефоне — раскрываются по нажатию.
    if (isMobile) await book.getByRole('button', { name: /Осень 2024/ }).click();
    await expect(book.getByText('Математический анализ')).toBeVisible();
  });

  test('чужой предмет по прямой ссылке — 404', async ({ page }) => {
    const kimCourse = await idOf('kimCourse');
    await login(page, 'student1');
    const res = await page.goto(`/study/${kimCourse}`);
    expect(res?.status()).toBe(404);
  });

  test('у второго студента другие данные', async ({ page }) => {
    await login(page, 'student2');
    await page.goto('/study');
    await expect(page.getByText('Корейский язык').filter(visible).first()).toBeVisible();
    await expect(page.getByText('Машинное обучение').filter(visible)).toHaveCount(0);
  });
});
