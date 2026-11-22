'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ease } from './tokens';

const fmt = (v: number, decimals: number) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Число считается вверх от нуля, когда появляется на экране (баллы, средний балл). */
export function CountUp({
  value,
  decimals = 0,
  duration = 0.9,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const controls = animate(0, value, {
      duration,
      ease: ease.out,
      onUpdate: (v) => (el.textContent = fmt(v, decimals)),
    });
    return () => controls.stop();
  }, [inView, value, decimals, duration, reduce]);

  // На сервере и без JS показываем итог.
  return (
    <span ref={ref} className={className}>
      {fmt(value, decimals)}
    </span>
  );
}
