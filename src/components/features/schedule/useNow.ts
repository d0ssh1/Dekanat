'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Живое «сейчас»: обновляется каждые `stepMs`. Отсчитывается от времени сервера со смещением —
 * так одинаково работают обычные часы, демо-время для жюри и подмена времени в разработке.
 * Когда проходит граница (пара началась/кончилась) — просит сервер обновить данные страницы.
 */
export function useNow(serverNow: number, boundaries: number[] = [], stepMs = 15_000) {
  const [now, setNow] = useState(serverNow);
  const router = useRouter();
  const crossed = useRef(new Set<number>());

  useEffect(() => {
    const offset = serverNow - Date.now();
    const tick = () => {
      const t = Date.now() + offset;
      setNow(t);
      for (const b of boundaries) {
        if (t >= b && serverNow < b && !crossed.current.has(b)) {
          crossed.current.add(b);
          router.refresh();
        }
      }
    };
    const id = window.setInterval(tick, stepMs);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverNow, stepMs, boundaries.join(',')]);

  return now;
}
