'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useToast } from '@/components/motion/Toast';

/**
 * Реальное время: слушает /api/events (SSE). Пришло уведомление — тост и обновление данных страницы;
 * поменялся статус заявки или расписание — тихо обновляем страницу (карточка вспыхнет сама).
 * Обрыв связи — браузер переподключается сам; пропущенное подтянется из ленты уведомлений.
 */
export function LiveEvents() {
  const router = useRouter();
  const toast = useToast();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/events');
    const refresh = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => router.refresh(), 150);
    };
    es.addEventListener('notification', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as {
          title: string;
          body?: string;
          tone?: 'ok' | 'danger' | 'neutral';
          link?: string;
        };
        toast.show({
          title: d.title,
          body: d.body ?? undefined,
          tone: d.tone ?? 'neutral',
          action: d.link ? { label: 'Открыть', onClick: () => router.push(d.link!) } : undefined,
          ttl: 7000,
        });
      } catch {}
      refresh();
    });
    for (const k of ['request', 'schedule', 'queue']) es.addEventListener(k, refresh);
    return () => {
      window.clearTimeout(timer.current);
      es.close();
    };
  }, [router, toast]);

  return null;
}
