'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { login } from '@/server/auth/login';
import { destroyAllSessions, destroySession, getSessionUser } from '@/server/auth/session';

export type LoginState = { error?: string; left?: number; values?: { login: string } } | undefined;

const schema = z.object({
  login: z.string().trim().min(1, 'Введите логин или почту').max(100),
  password: z.string().min(1, 'Введите пароль').max(200),
  next: z.string().max(300).optional(),
});

/** Разрешаем возвращаться только на свои страницы: «/путь», но не «//чужой-сайт». */
function safeNext(next: string | undefined, role: 'student' | 'staff') {
  const fallback = role === 'staff' ? '/staff' : '/';
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (role === 'student' && next.startsWith('/staff')) return fallback;
  return next;
}

function plural(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'попытка';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'попытки';
  return 'попыток';
}

export async function loginAction(_: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    login: form.get('login'),
    password: form.get('password'),
    next: form.get('next') || undefined,
  });
  const loginValue = String(form.get('login') ?? '').slice(0, 100);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values: { login: loginValue } };

  const h = await headers();
  // Берём ПОСЛЕДНИЙ адрес из X-Forwarded-For: его дописывает наш Caddy. Первый клиент может подделать
  // и так обходить лимит попыток.
  const ip = (h.get('x-forwarded-for')?.split(',').at(-1) ?? h.get('x-real-ip') ?? 'local').trim();
  const res = await login({
    login: parsed.data.login,
    password: parsed.data.password,
    ip,
    userAgent: h.get('user-agent'),
  });

  if (!res.ok) {
    if (res.reason === 'locked')
      return {
        error: `Слишком много попыток. Попробуйте через ${res.retryAfterMin} мин.`,
        left: 0,
        values: { login: loginValue },
      };
    return {
      // Счётчик показываем, только когда до паузы осталось мало, — иначе он пугает с первой опечатки.
      error:
        res.left <= 2
          ? `Неверный логин или пароль. Ещё ${res.left} ${plural(res.left)} — потом вход закроется на 15 минут.`
          : 'Неверный логин или пароль. Проверьте раскладку и Caps Lock.',
      left: res.left,
      values: { login: loginValue },
    };
  }
  redirect(safeNext(parsed.data.next, res.role));
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

export async function logoutEverywhereAction() {
  const user = await getSessionUser();
  if (user) await destroyAllSessions(user.id);
  redirect('/login');
}
