import { expect, test } from '@playwright/test';
import { credentials, login, baseOrigin } from './helpers';

test.describe('Вход и сессия', () => {
  test('без входа любая страница ведёт на вход и потом возвращает обратно', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile/);
    const { login: l, password } = credentials('student1');
    await page.getByLabel('Логин или почта').fill(l);
    await page.getByLabel('Пароль', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('Воронцова Алина').filter({ visible: true }).first()).toBeVisible();
  });

  test('неверный пароль: понятная ошибка, сколько попыток осталось, логин не стирается', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Логин или почта').fill('daniil.kim');
    await page.getByLabel('Пароль', { exact: true }).fill('definitely-wrong');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.locator('#login-error')).toContainText('Неверный логин или пароль');
    await expect(page.getByLabel('Логин или почта')).toHaveValue('daniil.kim');
    await expect(page.getByLabel('Пароль', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  });

  test('несуществующий логин даёт тот же ответ, что и неверный пароль', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Логин или почта').fill(`nobody-${Date.now()}`);
    await page.getByLabel('Пароль', { exact: true }).fill('whatever');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.locator('#login-error')).toContainText(
      'Неверный логин или пароль. Проверьте раскладку и Caps Lock.',
    );
  });

  test('после 5 неудач вход блокируется', async ({ page }) => {
    const fake = `brute-${Date.now()}`;
    await page.goto('/login');
    // Счётчик виден только на последних попытках.
    const expected = [
      'Проверьте раскладку',
      'Проверьте раскладку',
      'Ещё 2',
      'Ещё 1',
      'Слишком много попыток',
    ];
    for (const [i, text] of expected.entries()) {
      await page.getByLabel('Логин или почта').fill(fake);
      await page.getByLabel('Пароль', { exact: true }).fill(`guess-${i}`);
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Войти' }).click(),
      ]);
      // Ждём ответ именно на эту попытку, иначе сброс формы сотрёт следующий ввод.
      await expect(page.locator('#login-error')).toContainText(text);
    }
    // Даже верный по форме ввод больше не проверяется, пока действует блокировка.
    await page.getByLabel('Пароль', { exact: true }).fill('another-guess');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.locator('#login-error')).toContainText('Слишком много попыток');
  });

  test('выход завершает сессию на сервере: старая cookie больше не пускает', async ({ page, context }) => {
    await login(page, 'student1');
    const before = (await context.cookies()).find((c) => c.name.includes('session'));
    expect(before?.httpOnly).toBe(true);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Выйти', exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/login/);
    // Подкладываем старую cookie обратно — сессии на сервере уже нет.
    await context.addCookies([before!]);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?.*expired=1/);
    await expect(page.getByRole('heading', { name: 'Сессия истекла' })).toBeVisible();
  });

  test('подделанная cookie не пускает', async ({ page, context }) => {
    await context.addCookies([{ name: 'dekanat-session', value: 'forged-token-value', url: baseOrigin() }]);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  test('next не уводит на чужой сайт', async ({ page }) => {
    const { login: l, password } = credentials('student1');
    await page.goto('/login?next=//evil.example/steal');
    await page.getByLabel('Логин или почта').fill(l);
    await page.getByLabel('Пароль', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(`${baseOrigin()}/`);
  });
});
