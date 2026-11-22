'use client';

import { m, type HTMLMotionProps } from 'motion/react';
import { STAGGER, fadeRise } from './tokens';

/** Контейнер каскадного появления: дети `StaggerItem` появляются по очереди. */
export function Stagger({
  children,
  delay = 0,
  step = STAGGER,
  ...rest
}: HTMLMotionProps<'div'> & { delay?: number; step?: number }) {
  return (
    <m.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <m.div variants={fadeRise} {...rest}>
      {children}
    </m.div>
  );
}
