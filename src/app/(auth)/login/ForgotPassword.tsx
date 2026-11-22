'use client';

import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { DEAN_OFFICE } from '@/lib/university';
import { spring } from '@/components/motion/tokens';

/** «Забыли пароль?» — в прототипе честно объясняем, куда обратиться (настоящего сброса по почте нет). */
export function ForgotPassword() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-center">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
        className="min-h-11 px-3 py-[13px] text-[14px] font-bold"
      >
        Забыли пароль?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="m-0 overflow-hidden text-[13px] leading-snug font-medium text-ink-2"
          >
            Новый пароль выдают в дирекции института: ауд. {DEAN_OFFICE.room}, {DEAN_OFFICE.hours}. С
            паспортом или студенческим.
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
