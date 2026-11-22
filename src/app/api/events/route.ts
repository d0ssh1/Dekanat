import { getViewer } from '@/server/auth/guards';
import { subscribe } from '@/server/events/hub';
import type { LiveEvent } from '@/server/events/publish';
import { myGroupId } from '@/server/dal/schedule';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Поток событий (Server-Sent Events) для текущего пользователя.
 * Студент получает только свои события и события своей группы; сотрудник — очередь заявок.
 * Пульс раз в 25 секунд держит соединение через прокси.
 */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return new Response('Нужен вход', { status: 401 });
  const groupId = viewer.role === 'student' ? await myGroupId(viewer) : null;

  const mine = (e: LiveEvent) => {
    if (e.kind === 'notification' || e.kind === 'request') return e.userId === viewer.userId;
    if (e.kind === 'schedule') return e.groupId === groupId;
    if (e.kind === 'queue') return viewer.role === 'staff';
    return false;
  };

  const enc = new TextEncoder();
  let cleanup: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          cleanup?.();
        }
      };
      send('retry: 4000\n\n');
      const unsub = await subscribe((e) => {
        if (mine(e)) send(`event: ${e.kind}\ndata: ${JSON.stringify(e)}\n\n`);
      });
      const ping = setInterval(() => send(': ping\n\n'), 25_000);
      cleanup = () => {
        clearInterval(ping);
        unsub();
      };
      req.signal.addEventListener('abort', () => {
        cleanup?.();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
