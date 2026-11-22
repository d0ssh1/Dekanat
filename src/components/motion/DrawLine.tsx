'use client';

import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from './tokens';

/** Вертикальная линия таймлайна, которая «рисуется» сверху вниз (шаги заявки). */
export function DrawLine({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <m.span
      aria-hidden
      className={cn('block w-0.5 origin-top', className)}
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.5, ease: ease.out, delay }}
    />
  );
}
