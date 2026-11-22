'use client';

import { m } from 'motion/react';
import { useOptimistic, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { spring } from '@/components/motion/tokens';
import { useToast } from '@/components/motion/Toast';
import { savePrefsAction } from './actions';

const COLORS = ['#ff6a3d', '#c6f24e', '#7cc4ff', '#ff8fc7', '#ffc93c'] as const;
const NAMES: Record<string, string> = {
  '#ff6a3d': 'оранжевый',
  '#c6f24e': 'лаймовый',
  '#7cc4ff': 'голубой',
  '#ff8fc7': 'розовый',
  '#ffc93c': 'жёлтый',
};

/** «Цвет главной» (макет B2Core1) и «Демо-время» для жюри. Меняется сразу, сохраняется в профиле. */
export function PrefsControls({
  heroColor,
  demoClock,
  variant = 'phone',
}: {
  heroColor: string;
  demoClock: boolean;
  variant?: 'phone' | 'desk';
}) {
  const [pending, start] = useTransition();
  const [state, set] = useOptimistic(
    { heroColor, demoClock },
    (s, p: Partial<{ heroColor: string; demoClock: boolean }>) => ({ ...s, ...p }),
  );
  const toast = useToast();
  const save = (p: Partial<{ heroColor: string; demoClock: boolean }>) =>
    start(async () => {
      set(p);
      // Цвет меняем сразу у всей страницы — не дожидаясь сервера.
      if (p.heroColor)
        document.querySelector<HTMLElement>('[style*="--hero"]')?.style.setProperty('--hero', p.heroColor);
      const r = await savePrefsAction(p);
      if (r.ok && p.demoClock !== undefined)
        toast.show({
          title: p.demoClock ? 'Демо-время включено' : 'Демо-время выключено',
          body: p.demoClock ? 'Кабинет показывает учебный день, 10:00' : 'Снова настоящее время',
          tone: 'ok',
        });
    });
  const line = variant === 'phone' ? 'border-line' : 'border-desk-line';

  return (
    <>
      <div className={cn('flex min-h-11 flex-col justify-center border-t py-[11px] text-[15px]', line)}>
        <span className="text-[13px] font-semibold text-ink-2">Цвет главной</span>
        <div className="mt-1.5 flex gap-1.5" role="radiogroup" aria-label="Цвет главной">
          {COLORS.map((c) => {
            const on = state.heroColor === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={NAMES[c]}
                disabled={pending}
                onClick={() => save({ heroColor: c })}
                className="relative flex size-11 items-center justify-center"
              >
                <span className="block size-[26px] rounded-full" style={{ background: c }} />
                {on && (
                  <m.span
                    layoutId={`swatch-${variant}`}
                    transition={spring.snappy}
                    className="absolute size-[34px] rounded-full border-2 border-ink"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className={cn('flex min-h-11 items-center gap-3 border-t py-[11px] text-[15px]', line)}>
        <div className="flex-1">
          <div>Демо-время</div>
          <div className="mt-0.5 text-[13px] leading-snug font-semibold text-ink-2">
            Для показа: кабинет живёт как в учебный день, 10:00
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.demoClock}
          aria-label="Демо-время"
          disabled={pending}
          onClick={() => save({ demoClock: !state.demoClock })}
          className={cn(
            'relative h-8 w-[52px] shrink-0 rounded-full transition-colors',
            state.demoClock ? 'bg-ink' : 'bg-line',
          )}
        >
          <m.span
            layout
            transition={spring.snappy}
            className={cn(
              'absolute top-1 size-6 rounded-full bg-surface shadow',
              state.demoClock ? 'right-1' : 'left-1',
            )}
          />
        </button>
      </div>
    </>
  );
}
