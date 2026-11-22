import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { and, eq, gt } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { sessions, users } from '@/server/db/schema';

/**
 * Сессии (docs/architecture.md §5.1).
 * В cookie — 32 случайных байта; в БД — только SHA-256 от них. Утечка БД не даёт войти.
 */
const SESSION_DAYS = 7;
const TOUCH_AFTER_MS = 60 * 60 * 1000; // продлеваем не чаще раза в час

const secure = (process.env.PUBLIC_URL ?? '').startsWith('https://');
/** `__Host-` запрещает поддомены и требует Secure — используем, когда сайт на HTTPS. */
export const SESSION_COOKIE = secure ? '__Host-session' : 'dekanat-session';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export type SessionUser = { id: string; role: 'student' | 'staff'; login: string };

export async function createSession(userId: string, userAgent: string | null) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await withDb({ role: 'auth' }, async (tx) => {
    await tx
      .insert(sessions)
      .values({ id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) });
    await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/** Текущий пользователь по cookie. Кешируется в пределах одного запроса. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const now = new Date();

  return withDb({ role: 'auth' }, async (tx) => {
    const rows = await tx
      .select({ userId: users.id, role: users.role, login: users.login, lastSeenAt: sessions.lastSeenAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
      await tx
        .update(sessions)
        .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_DAYS * 86400_000) })
        .where(eq(sessions.id, id));
    }
    return { id: row.userId, role: row.role, login: row.login };
  });
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token)
    await withDb({ role: 'auth' }, (tx) => tx.delete(sessions).where(eq(sessions.id, sha256(token))));
  jar.delete(SESSION_COOKIE);
}

/** «Выйти на всех устройствах». */
export async function destroyAllSessions(userId: string) {
  await withDb({ role: 'auth' }, (tx) => tx.delete(sessions).where(eq(sessions.userId, userId)));
  (await cookies()).delete(SESSION_COOKIE);
}
