'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';
import { spring } from '@/components/motion/tokens';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

/**
 * «Нет сети» (макет B2PhoneB): плашка выезжает сверху, кабинет не пустеет — показываем последние данные
 * и время, когда они получены. Связь вернулась — плашка уезжает, данные обновляются.
 */
export function NetworkStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const [since, setSince] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!online) {
      const t = new Date();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- фиксируем момент потери сети
      setSince(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`);
    } else if (since) {
      router.refresh();
      setSince(null);
    }
  }, [online, since, router]);

  return (
    <AnimatePresence>
      {!online && (
        <m.div
          role="status"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={spring.soft}
          className="fixed inset-x-3 top-[calc(var(--safe-top)+8px)] z-40 mx-auto flex max-w-[420px] items-center gap-2.5 rounded-[16px] bg-ink px-3.5 py-2.5 text-[14px] font-bold text-surface shadow-[0_12px_30px_rgba(20,20,26,.3)]"
        >
          <Icon name="wifiOff" size={18} />
          <span className="flex-1">Нет сети · данные на {since ?? 'сейчас'}</span>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="h-9 rounded-[10px] bg-surface/15 px-3 text-[13px]"
          >
            Обновить
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
