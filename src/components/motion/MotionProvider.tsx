'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import { spring } from './tokens';

const loadFeatures = () => import('./features').then((r) => r.default);

/**
 * Корень системы движения.
 * - LazyMotion + strict: в компонентах только `m.*`, функции Motion приезжают отдельным чанком.
 * - reducedMotion="user": при «уменьшить движение» в ОС трансформации отключаются, остаётся прозрачность.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={spring.soft}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
