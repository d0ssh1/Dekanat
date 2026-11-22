'use client';

import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from '@/components/motion/tokens';

/** Полоса прогресса баллов: заполняется слева направо при появлении. */
export function Bar({
  value,
  max,
  danger,
  className,
  mark,
}: {
  value: number;
  max: number;
  danger?: boolean;
  className?: string;
  mark?: number;
}) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn('relative h-[5px] rounded-full bg-line', className)} role="presentation">
      <m.i
        className={cn('block h-full origin-left rounded-full', danger ? 'bg-danger' : 'bg-ink')}
        style={{ width: `${pct}%` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
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
