import { existsSync, readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

export type Account = 'student1' | 'student2' | 'staff';
const LOGINS: Record<Account, string> = {
  student1: 'alina.vorontsova',
  student2: 'daniil.kim',
  staff: 'metodist.ivanova',
};

/** Пароли — из SEED_PASSWORD_* (CI) или из test-accounts.local.md после локального сида. В коде их нет. */
export function credentials(who: Account) {
  const env = {
    student1: 'SEED_PASSWORD_STUDENT1',
    student2: 'SEED_PASSWORD_STUDENT2',
    staff: 'SEED_PASSWORD_STAFF',
  }[who];
  let password = process.env[env];
  if (!password && existsSync('test-accounts.local.md')) {
    const row = readFileSync('test-accounts.local.md', 'utf8')
      .split('\n')
      .map((l) => l.split('|').map((c) => c.trim()))
      .find((cells) => cells[2] === LOGINS[who]);
    password = row?.[3];
  }
  if (!password) throw new Error(`Нет пароля для ${who}: задайте ${env} или запустите npm run db:seed`);
  return { login: LOGINS[who], password };
}

export async function login(page: Page, who: Account) {
  const { login, password } = credentials(who);
  await page.goto('/login');
  await page.getByLabel('Логин или почта').fill(login);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

/** Адрес сервера, на котором идёт прогон (локально — тестовый :3100, в CI — :3000). */
export const baseOrigin = () => new URL(test.info().project.use.baseURL!).origin;
