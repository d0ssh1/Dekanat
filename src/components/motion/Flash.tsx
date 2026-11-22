'use client';

import { m, useReducedMotion } from 'motion/react';

/**
 * Мягкая вспышка фона, когда что-то изменилось само (статус заявки пришёл в реальном времени).
 * Меняйте `signal` — вспышка повторится.
 */
export function Flash({
  signal,
  children,
  className,
  color = 'rgba(255,226,212,1)',
}: {
  signal: string | number;
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <m.div
      key={signal}
      className={className}
      initial={reduce ? false : { backgroundColor: color }}
      animate={{ backgroundColor: 'rgba(255,226,212,0)' }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
    >
      {children}
    </m.div>
  );
}
