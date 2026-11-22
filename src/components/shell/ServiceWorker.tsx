'use client';

import { useEffect } from 'react';

/** Регистрирует сервис-воркер (только в продакшене) или очищает его кэш страниц (на странице входа). */
export function ServiceWorker({ clear = false }: { clear?: boolean }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (clear) {
      navigator.serviceWorker.controller?.postMessage('clear');
      caches?.delete('pages-v1').catch(() => {});
      return;
    }
    if (process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [clear]);
  return null;
}
