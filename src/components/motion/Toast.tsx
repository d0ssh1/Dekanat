'use client';

import { AnimatePresence, m } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { spring } from './tokens';

export type ToastTone = 'neutral' | 'ok' | 'danger';
type ToastItem = {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
};
type ToastApi = { show: (t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone; ttl?: number }) => void };

const Ctx = createContext<ToastApi | null>(null);

export function useToast() {
  const api = useContext(Ctx);
  if (!api) throw new Error('useToast вне ToastProvider');
  return api;
}

const DOT: Record<ToastTone, string> = { neutral: 'bg-hero', ok: 'bg-ok', danger: 'bg-danger' };

/**
 * Тосты: на телефоне выезжают сверху, на компьютере — справа снизу.
 * Живая область `aria-live` озвучивает их экранным дикторам.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    ({ ttl = 5000, tone = 'neutral', ...t }) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-2), { id, tone, ...t }]);
      window.setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+10px)] z-50 flex flex-col items-center gap-2 px-3 lg:top-auto lg:right-6 lg:bottom-6 lg:left-auto lg:items-end"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.18 } }}
              transition={spring.bouncy}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dismiss(t.id)}
              className="pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-[18px] bg-ink px-4 py-3 text-surface shadow-[0_18px_40px_rgba(20,20,26,.28)]"
              role="status"
            >
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[t.tone]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold leading-snug">{t.title}</div>
                {t.body && <div className="mt-0.5 text-[13px] font-medium text-surface/75">{t.body}</div>}
              </div>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="-my-1 min-h-11 shrink-0 rounded-[12px] px-3 text-[13px] font-extrabold text-hero"
                >
                  {t.action.label}
                </button>
              )}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
