import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { loginAttempts } from '@/server/db/schema';

/** Лимит попыток входа: 5 неудач за 15 минут на пару «логин + IP» → блокировка на 15 минут. */
export const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export type Gate = { allowed: true; left: number } | { allowed: false; retryAfterMin: number };

export async function checkGate(key: string): Promise<Gate> {
  return withDb({ role: 'auth' }, async (tx) => {
    const [row] = await tx.select().from(loginAttempts).where(eq(loginAttempts.key, key));
    const now = Date.now();
    if (row?.lockedUntil && row.lockedUntil.getTime() > now) {
      return { allowed: false, retryAfterMin: Math.ceil((row.lockedUntil.getTime() - now) / 60000) };
    }
    const fresh = !row || now - row.windowStart.getTime() > WINDOW_MS;
    return { allowed: true, left: MAX_ATTEMPTS - (fresh ? 0 : row.count) };
  });
}

/** Записывает неудачу; возвращает, сколько попыток осталось (0 — заблокировано). */
export async function recordFailure(key: string): Promise<number> {
  return withDb({ role: 'auth' }, async (tx) => {
    const now = new Date();
    // Время окна считает сама БД (now()), чтобы копии приложения с разными часами не спорили.
    const expired = sql`${loginAttempts.windowStart} < now() - interval '15 minutes'`;
    const [row] = await tx
      .insert(loginAttempts)
      .values({ key, count: 1 })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: {
          count: sql`case when ${expired} then 1 else ${loginAttempts.count} + 1 end`,
          windowStart: sql`case when ${expired} then now() else ${loginAttempts.windowStart} end`,
          lockedUntil: sql`null`,
        },
      })
      .returning();
    const left = MAX_ATTEMPTS - (row?.count ?? 1);
    if (left <= 0) {
      await tx
        .update(loginAttempts)
        .set({ lockedUntil: new Date(now.getTime() + WINDOW_MS) })
        .where(eq(loginAttempts.key, key));
    }
    return Math.max(0, left);
  });
}

export async function clearFailures(key: string) {
  await withDb({ role: 'auth' }, (tx) => tx.delete(loginAttempts).where(eq(loginAttempts.key, key)));
}
