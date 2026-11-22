import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { notifications, type NotificationKindValue } from '@/server/db/schema';
import { ctxOf, type Viewer } from '@/server/auth/guards';

export type { NotificationKindValue };

export type Notice = {
  id: string;
  kind: NotificationKindValue;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  read: boolean;
};

export async function listNotifications(viewer: Viewer, limit = 60): Promise<Notice[]> {
  return withDb(ctxOf(viewer), async (tx) => {
    const rows = await tx
      .select()
      .from(notifications)
      .where(eq(notifications.userId, viewer.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
      read: Boolean(n.readAt),
    }));
  });
}

export async function markRead(viewer: Viewer, id: string | 'all') {
  return withDb(ctxOf(viewer), (tx) =>
    tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, viewer.userId),
          isNull(notifications.readAt),
          id === 'all' ? undefined : eq(notifications.id, id),
        ),
      ),
  );
}
