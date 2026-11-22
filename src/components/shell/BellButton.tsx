'use client';

import Link from 'next/link';
import { AnimatePresence, m, useAnimate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { Odometer } from '@/components/motion/Odometer';
import { spring } from '@/components/motion/tokens';

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'новое' : 'новых');

/**
 * Колокольчик со счётчиком. Когда счётчик растёт, колокольчик покачивается, а цифра «перекатывается».
 * phone — полупрозрачный на оранжевом (44 px), desk — белый на сером (48 px) с оранжевым счётчиком.
 */
export function BellButton({ count, variant = 'phone' }: { count: number; variant?: 'phone' | 'desk' }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const prev = useRef(count);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (count > prev.current && !reduce && scope.current) {
      animate(scope.current, { rotate: [0, -16, 14, -10, 6, 0] }, { duration: 0.7 });
    }
    prev.current = count;
  }, [count, animate, scope, reduce]);

  return (
    <Link
      href="/notifications"
      aria-label={count ? `Уведомления: ${count} ${plural(count)}` : 'Уведомления'}
      className={cn(
        'relative flex shrink-0 items-center justify-center',
        variant === 'phone'
          ? 'size-11 rounded-[15px] bg-glass-50'
          : 'size-12 rounded-[16px] bg-surface text-ink-desk',
      )}
    >
      <span ref={scope} className="flex origin-top">
        <Icon name="bell" size={20} stroke={variant === 'phone' ? 2 : 1.9} />
      </span>
      <AnimatePresence>
        {count > 0 && (
          <m.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={spring.bouncy}
            className={cn(
              'absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] leading-none font-extrabold',
              variant === 'phone'
                ? 'top-[5px] right-[5px] bg-ink text-surface'
                : 'top-[7px] right-[7px] bg-accent-desk text-ink-desk',
            )}
          >
            <Odometer value={count} />
          </m.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
