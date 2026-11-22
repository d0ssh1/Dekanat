import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import type { Tx } from '@/server/db';
import { notifications, type NotificationKindValue } from '@/server/db/schema';
import { publish } from '@/server/events/publish';

export type NotifyInput = {
  kind: NotificationKindValue;
  title: string;
  body?: string | null;
  link?: string | null;
  tone?: 'ok' | 'danger' | 'neutral';
  /** Ключ идемпотентности: одно и то же напоминание не придёт дважды (используется системой). */
  dedupeKey?: string;
};

/**
 * Уведомление нескольким пользователям + событие в реальном времени каждому — в той же транзакции.
 * Без RETURNING: сотрудник вправе создать уведомление студенту, но не читать его (RLS),
 * а RETURNING потребовал бы права на чтение.
 */
export async function notify(tx: Tx, userIds: string[], n: NotifyInput) {
  let targets = [...new Set(userIds)];
  if (!targets.length) return 0;
  if (n.dedupeKey) {
    const seen = await tx
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(and(inArray(notifications.userId, targets), eq(notifications.dedupeKey, n.dedupeKey)));
    const s = new Set(seen.map((x) => x.userId));
    targets = targets.filter((id) => !s.has(id));
    if (!targets.length) return 0;
  }
  await tx
    .insert(notifications)
    .values(
      targets.map((userId) => ({
        userId,
        kind: n.kind,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
        dedupeKey: n.dedupeKey ?? null,
      })),
    )
    .onConflictDoNothing();
  for (const userId of targets) {
    await publish(tx, {
      kind: 'notification',
      userId,
      title: n.title,
      body: n.body,
      tone: n.tone,
      link: n.link,
    });
  }
  return targets.length;
}
