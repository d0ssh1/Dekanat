'use client';

import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from '@/components/motion/tokens';

/**
 * Полоса прогресса баллов: заполняется слева направо при загрузке.
 * При «меньше движения» MotionConfig (reducedMotion="user") сразу показывает её заполненной.
 */
export function Bar({
  value,
  max,
  danger,
  accent,
  className,
  mark,
}: {
  value: number;
  max: number;
  danger?: boolean;
  /** Цвет главной (из профиля) вместо чёрного — для акцента на белой карточке. */
  accent?: boolean;
  className?: string;
  mark?: number;
}) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn('relative h-[5px] rounded-full bg-line', className)} role="presentation">
      <m.i
        className={cn(
          'block h-full origin-left rounded-full',
          danger ? 'bg-danger' : accent ? 'bg-hero' : 'bg-ink',
        )}
        style={{ width: `${pct}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }}
      />
      {mark !== undefined && max > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 h-[13px] w-0.5 rounded-full bg-ink-2"
          style={{ left: `${Math.min(100, (mark / max) * 100)}%` }}
          title="порог допуска"
        />
      )}
    </div>
  );
}
