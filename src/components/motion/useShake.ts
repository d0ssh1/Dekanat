'use client';

import { useAnimate, useReducedMotion } from 'motion/react';

/** Короткое «покачивание» поля с ошибкой. Возвращает ref и функцию запуска. */
export function useShake<T extends Element = HTMLDivElement>() {
  const [scope, animate] = useAnimate<T>();
  const reduce = useReducedMotion();
  const shake = () => {
    if (reduce || !scope.current) return;
    animate(scope.current, { x: [0, -8, 8, -5, 5, -2, 0] }, { duration: 0.42 });
  };
  return [scope, shake] as const;
}
