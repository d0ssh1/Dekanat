/**
 * Токены движения (docs/architecture.md §9.2). Новые числа в анимациях — только отсюда.
 */
import type { Transition, Variants } from 'motion/react';

export const spring = {
  /** Переключатели, «таблетки» выбора, вкладки. */
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 },
  /** Карточки, листы, общий элемент между экранами. */
  soft: { type: 'spring', stiffness: 260, damping: 30 },
  /** Успех, счётчик колокольчика, «перекат» цифр. */
  bouncy: { type: 'spring', stiffness: 420, damping: 18 },
} as const satisfies Record<string, Transition>;

export const dur = { fast: 0.14, base: 0.24, slow: 0.42 } as const;

export const ease = {
  out: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

/** Задержка между элементами списка/сетки при каскадном появлении. */
export const STAGGER = 0.04;

/** Сдвиг при появлении снизу. */
export const RISE = 12;

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: RISE },
  show: { opacity: 1, y: 0, transition: spring.soft },
};

/** Нажатие: лёгкое «проседание» любой кнопки и карточки. */
export const press = { scale: 0.97 } as const;
