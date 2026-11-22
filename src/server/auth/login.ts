import 'server-only';
import { eq, or, sql } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { auditLog, students, users } from '@/server/db/schema';
import { verifyPassword } from './password';
import { checkGate, clearFailures, recordFailure } from './rate-limit';
import { createSession } from './session';

export type LoginResult =
  | { ok: true; role: 'student' | 'staff' }
  | { ok: false; reason: 'invalid'; left: number }
  | { ok: false; reason: 'locked'; retryAfterMin: number };

/**
 * Вход по логину или почте студента.
 * Одинаковый ответ и одинаковое время для «нет такого логина» и «неверный пароль».
 */
export async function login(input: {
  login: string;
  password: string;
  ip: string;
  userAgent: string | null;
}): Promise<LoginResult> {
  const loginNorm = input.login.trim().toLowerCase();
  const key = `${loginNorm}|${input.ip}`;

  const gate = await checkGate(key);
  if (!gate.allowed) return { ok: false, reason: 'locked', retryAfterMin: gate.retryAfterMin };

  const user = await withDb({ role: 'auth' }, async (tx) => {
    const rows = await tx
      .select({ id: users.id, role: users.role, hash: users.passwordHash })
      .from(users)
      .leftJoin(students, eq(students.userId, users.id))
      .where(or(eq(sql`lower(${users.login})`, loginNorm), eq(sql`lower(${students.email})`, loginNorm)))
      .limit(1);
    return rows[0] ?? null;
  });

  const ok = await verifyPassword(user?.hash ?? null, input.password);
  if (!user || !ok) {
    const left = await recordFailure(key);
    await audit(null, 'login_failed', { login: loginNorm.slice(0, 60) });
    if (left <= 0) return { ok: false, reason: 'locked', retryAfterMin: 15 };
    return { ok: false, reason: 'invalid', left };
  }

  await clearFailures(key);
  await createSession(user.id, input.userAgent);
  await audit(user.id, 'login', {});
  return { ok: true, role: user.role };
}

async function audit(actorUserId: string | null, action: string, meta: Record<string, unknown>) {
  await withDb({ role: 'auth' }, (tx) =>
    tx.insert(auditLog).values({ actorUserId, action, entity: 'session', meta }),
  );
}
