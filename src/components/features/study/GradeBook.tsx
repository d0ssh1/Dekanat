'use client';

import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { FinalGrade } from '@/server/dal/study';
import { spring } from '@/components/motion/tokens';

const SEM_LABEL: Record<string, string> = { осень: 'осенний', весна: 'весенний' };
const label = (code: string) => {
  const [y, s] = code.split('-');
  return `${SEM_LABEL[s ?? ''] ?? s} семестр ${s === 'весна' ? Number(y) : `${y}/${String(Number(y) + 1).slice(2)}`}`;
};
const tone = (g: string) =>
  g === 'отлично' ? 'text-ok' : g === 'неудовлетворительно' ? 'text-danger' : 'text-ink';

/** Зачётная книжка: итоги прошлых сессий, семестры раскрываются. */
export function GradeBook({
  finals,
  variant = 'phone',
  className,
}: {
  finals: FinalGrade[];
  variant?: 'phone' | 'desk';
  className?: string;
}) {
  const semesters = [...new Set(finals.map((f) => f.semester))].reverse();
  const [open, setOpen] = useState<string | null>(semesters[0] ?? null);
  const line = variant === 'phone' ? 'border-line' : 'border-desk-line';
  return (
    <section className={className} aria-label="Зачётная книжка">
      <h2
        className={cn(
          'm-0 font-bold',
          variant === 'phone' ? 'text-[18px]' : 'text-[22px] font-black tracking-[-0.02em]',
        )}
      >
        Зачётная книжка
      </h2>
      {semesters.map((s, si) => {
        const rows = finals.filter((f) => f.semester === s);
        const isOpen = open === s;
        return (
          <div key={s} className={cn(si > 0 && 'border-t', line)}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : s)}
              className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
            >
              <span className="flex-1 text-[15px] font-bold">{label(s)}</span>
              <span className="text-[13px] font-semibold text-ink-2">{rows.length} предм.</span>
              <m.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={spring.snappy}
                aria-hidden
                className="text-ink-2"
              >
                ▾
              </m.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring.soft}
                  className="m-0 list-none overflow-hidden p-0 pb-2"
                >
                  {rows.map((r) => (
                    <li key={r.subject} className="flex items-baseline gap-3 py-1.5 text-[14px]">
                      <span className="min-w-0 flex-1">{r.subject}</span>
                      {r.points !== null && (
                        <span className="text-[12px] font-semibold text-ink-2 tabular">{r.points}</span>
                      )}
                      <b className={cn('w-[110px] text-right text-[13px]', tone(r.grade))}>{r.grade}</b>
                    </li>
                  ))}
                </m.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </section>
  );
}
