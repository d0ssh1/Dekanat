import 'server-only';
import { sql } from 'drizzle-orm';
import type { Tx } from '@/server/db';

export type LiveEvent =
  | {
      kind: 'notification';
      userId: string;
      title: string;
      body?: string | null;
      tone?: 'ok' | 'danger' | 'neutral';
      link?: string | null;
    }
  | { kind: 'request'; userId: string; requestId: string; status: string }
  | { kind: 'queue'; requestId: string }
  | { kind: 'schedule'; groupId: string };

/**
 * Событие в канал Postgres `events` — в той же транзакции, что и изменение данных:
 * если транзакция откатится, событие не уйдёт. Все копии приложения слушают канал и
 * раздают события своим подключённым пользователям (docs/architecture.md §11).
 */
export async function publish(tx: Tx, e: LiveEvent) {
  await tx.execute(sql`select pg_notify('events', ${JSON.stringify(e)})`);
}
