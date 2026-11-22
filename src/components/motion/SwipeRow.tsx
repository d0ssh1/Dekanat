'use client';

import { m, useMotionValue, useTransform } from 'motion/react';
import { spring } from './tokens';

/**
 * Строка, которую на телефоне можно смахнуть влево (отметить уведомление прочитанным).
 * С клавиатуры действие доступно отдельной кнопкой внутри строки — жест только ускоряет.
 */
export function SwipeRow({
  children,
  onSwipe,
  label,
}: {
  children: React.ReactNode;
  onSwipe: () => void;
  label: string;
}) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-120, -40, 0], [1, 0.6, 0]);
  return (
    <div className="relative overflow-hidden">
      <m.div
        aria-hidden
        style={{ opacity: reveal }}
        className="absolute inset-y-0 right-0 flex items-center rounded-[14px] bg-hero-wash px-4 text-[13px] font-extrabold text-hero-ink"
      >
        {label}
      </m.div>
      <m.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0.05 }}
        transition={spring.snappy}
        onDragEnd={(_, info) => {
          if (info.offset.x < -90) onSwipe();
        }}
        className="relative bg-surface"
      >
        {children}
      </m.div>
    </div>
  );
}
