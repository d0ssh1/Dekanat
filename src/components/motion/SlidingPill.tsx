'use client';

import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { spring } from './tokens';

/**
 * Подложка активного элемента, которая скользит между вариантами (полоса дней, вкладки, меню).
 * Кладётся внутрь активного элемента (у него `relative isolate`); одинаковый `id` в группе → общий элемент.
 */
export function SlidingPill({ id, className }: { id: string; className?: string }) {
  return (
    <m.span
      layoutId={id}
      aria-hidden
      className={cn('absolute inset-0 -z-10', className)}
      transition={spring.snappy}
    />
  );
}
