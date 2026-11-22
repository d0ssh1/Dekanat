import 'server-only';
import { and, count, eq, gt } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { assistantMessages } from '@/server/db/schema';
import { ctxOf, type StudentViewer } from '@/server/auth/guards';

export async function questionsLastHour(viewer: StudentViewer) {
  const since = new Date(Date.now() - 3600_000);
  const [r] = await withDb(ctxOf(viewer), (tx) =>
    tx
      .select({ n: count() })
      .from(assistantMessages)
      .where(
        and(
          eq(assistantMessages.userId, viewer.userId),
          eq(assistantMessages.role, 'user'),
          gt(assistantMessages.createdAt, since),
        ),
      ),
  );
  return r?.n ?? 0;
}

export async function saveMessages(
  viewer: StudentViewer,
  threadId: string,
  rows: { role: 'user' | 'assistant'; content: string; cards?: unknown[]; provider?: string }[],
) {
  await withDb(ctxOf(viewer), (tx) =>
    tx
      .insert(assistantMessages)
      .values(
        rows.map((r) => ({
          userId: viewer.userId,
          threadId,
          role: r.role,
          content: r.content,
          cards: r.cards ?? [],
          provider: r.provider,
        })),
      ),
  );
}
