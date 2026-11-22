import { z } from 'zod';
import { getViewer } from '@/server/auth/guards';
import { getShell } from '@/server/dal/me';
import { ask, saveExchange, underLimit } from '@/server/ai';
import { nowFor } from '@/server/clock';

export const dynamic = 'force-dynamic';

const schema = z.object({
  question: z.string().trim().min(1).max(500),
  threadId: z.string().uuid(),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(12)
    .default([]),
  now: z.string().optional(),
});

/**
 * Помощник отвечает потоком (SSE): сначала «думаю: смотрю расписание…», потом текст по кусочкам,
 * в конце — карточка (черновик заявки, пары, баллы). Только для студента, с лимитом и проверкой Origin.
 */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || new URL(origin).host !== req.headers.get('host'))
    return Response.json({ error: 'Запрос не с нашего сайта' }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer || viewer.role !== 'student') return Response.json({ error: 'Нужен вход' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Пустой вопрос' }, { status: 400 });
  if (!(await underLimit(viewer)))
    return Response.json({ error: 'Слишком много вопросов за час — попробуйте позже' }, { status: 429 });

  const shell = await getShell(viewer);
  const { question, threadId, history } = parsed.data;
  const now = await nowFor(viewer, parsed.data.now);
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      try {
        send('thinking', { label: 'Читаю вопрос' });
        const r = await ask({ viewer, now, firstName: shell.firstName, history, question });
        for (const label of r.thinking) {
          send('thinking', { label });
          await wait(260);
        }
        // Текст — по словам, чтобы читалось как живой ответ.
        const words = r.text.split(/(\s+)/);
        for (let i = 0; i < words.length; i += 4) {
          send('delta', { text: words.slice(i, i + 4).join('') });
          await wait(28);
        }
        if (r.card) send('card', r.card);
        send('done', { provider: r.provider, fallback: 'fallback' in r ? r.fallback : false });
        await saveExchange(viewer, threadId, question, r);
      } catch (e) {
        console.error('[assistant]', e);
        send('error', { error: 'Помощник не смог ответить. Попробуйте ещё раз.' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
