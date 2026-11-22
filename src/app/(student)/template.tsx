'use client';

import { m } from 'motion/react';
import { spring } from '@/components/motion/tokens';

/** Переход между разделами: новая страница мягко поднимается и проявляется. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
    >
      {children}
    </m.div>
  );
}
