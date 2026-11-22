'use client';

import { AnimatePresence, m } from 'motion/react';
import { cn } from '@/lib/cn';
import { press, spring } from './tokens';

export type ButtonState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Кнопка, которая превращается: текст → индикатор → галочка (отправка заявки).
 * Ширина меняется плавно через layout, текст сменяется вертикальным «перекатом».
 */
export function StatefulButton({
  state,
  children,
  successLabel = 'Готово',
  className,
  ...rest
}: Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
  state: ButtonState;
  successLabel?: string;
}) {
  const busy = state === 'loading';
  return (
    <m.button
      layout
      whileTap={busy ? undefined : press}
      transition={spring.soft}
      aria-busy={busy}
      disabled={busy || rest.disabled}
      className={cn(
        'relative inline-flex h-12 items-center justify-center overflow-hidden rounded-[15px] px-5 text-[15px] font-extrabold',
        state === 'success' ? 'bg-ok text-surface' : 'bg-ink text-surface',
        className,
      )}
      {...rest}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={state}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={spring.snappy}
          className="flex items-center gap-2"
        >
          {state === 'loading' && (
            <span
              className="size-5 animate-spin rounded-full border-[2.5px] border-surface/30 border-t-surface"
              aria-hidden
            />
          )}
          {state === 'success' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <m.path
                d="m5 12 5 5 9-10"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.05 }}
              />
            </svg>
          )}
          {state === 'loading' ? (
            <span className="sr-only">Отправляем…</span>
          ) : state === 'success' ? (
            successLabel
          ) : (
            children
          )}
        </m.span>
      </AnimatePresence>
    </m.button>
  );
}
