'use client';

import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { gpa } from '@/lib/grades';
import type { FinalGrade } from '@/server/dal/study';
import { spring } from '@/components/motion/tokens';

export const semesterLabel = (code: string) => {
  const [y, sem] = code.split('-');
  return sem === 'весна' ? `Весна ${y}` : `Осень ${y}`;
};
const subjects = (n: number) =>
  `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'предмет' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'предмета' : 'предметов'}`;
const fmt = (v: number | null) => (v === null ? null : v.toFixed(2).replace('.', ','));

/** Оценка «таблеткой»: цвет говорит раньше слова. */
function GradePill({ grade }: { grade: string }) {
  const tone =
    grade === 'отлично' || grade === 'зачтено'
      ? 'bg-ok-wash text-ok'
      : grade === 'хорошо'
        ? 'bg-desk-chip text-ink'
        : grade === 'удовлетворительно'
          ? 'bg-hero-wash text-hero-ink'
          : 'bg-danger-wash text-danger';
  return (
    <b
      className={cn('shrink-0 rounded-[9px] px-2.5 py-1 text-[12px] font-extrabold whitespace-nowrap', tone)}
    >
      {grade === 'удовлетворительно' ? 'удовл.' : grade}
    </b>
  );
}

function Rows({ rows, line }: { rows: FinalGrade[]; line: string }) {
  return (
    <>
      {rows.map((r, i) => (
        <li
          key={r.subject}
          className={cn('flex items-center gap-3 py-2 text-[14px]', i > 0 && 'border-t', line)}
        >
          <span className="min-w-0 flex-1 leading-snug">{r.subject}</span>
          {r.points !== null && (
            <span className="text-[12px] font-semibold text-ink-3 tabular" title="баллы из 100">
              {r.points}
            </span>
          )}
          <GradePill grade={r.grade} />
        </li>
      ))}
    </>
  );
}

/** Зачётная книжка: итоги прошлых сессий. На компьютере — карточки семестров, на телефоне — раскрываются. */
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
  const [openSet, setOpenSet] = useState<string[]>(semesters.slice(0, 1));

  if (variant === 'desk')
    return (
      <section className={className} aria-label="Зачётная книжка">
        <h2 className="m-0 text-[22px] font-black tracking-[-0.02em]">Зачётная книжка</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {semesters.map((s) => {
            const rows = finals.filter((f) => f.semester === s);
            const avg = fmt(gpa(rows));
            return (
              <div key={s} className="rounded-[18px] bg-desk-bg/60 px-4 pt-3 pb-1.5">
                <div className="flex items-baseline gap-3">
                  <b className="flex-1 text-[15px]">{semesterLabel(s)}</b>
                  <span className="text-[13px] font-semibold text-ink-2">
                    {subjects(rows.length)}
                    {avg && (
                      <>
                        {' '}
                        · средний <b className="text-ink-desk">{avg}</b>
                      </>
                    )}
                  </span>
                </div>
                <ul className="m-0 mt-1 list-none p-0">
                  <Rows rows={rows} line="border-desk-line" />
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    );

  return (
    <section className={className} aria-label="Зачётная книжка">
      <h2 className="m-0 text-[18px] font-bold">Зачётная книжка</h2>
      {semesters.map((s, si) => {
        const rows = finals.filter((f) => f.semester === s);
        const isOpen = openSet.includes(s);
        const avg = fmt(gpa(rows));
        return (
          <div key={s} className={cn(si > 0 && 'border-t border-line')}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenSet((xs) => (isOpen ? xs.filter((x) => x !== s) : [...xs, s]))}
              className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
            >
              <span className="flex-1 text-[15px] font-bold">{semesterLabel(s)}</span>
              <span className="text-[13px] font-semibold text-ink-2">
                {avg ? `средний ${avg}` : subjects(rows.length)}
              </span>
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
                  <Rows rows={rows} line="border-line" />
                </m.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </section>
  );
}

/** Средний балл по семестрам — маленький столбиковый график для карточки «Средний балл». */
export function SemesterTrend({ finals }: { finals: FinalGrade[] }) {
  const sems = [...new Set(finals.map((f) => f.semester))].slice(-4);
  const data = sems
    .map((s) => ({ s, v: gpa(finals.filter((f) => f.semester === s)) }))
    .filter((d): d is { s: string; v: number } => d.v !== null);
  if (data.length < 2) return null;
  return (
    <div className="flex items-end gap-2.5" aria-label="Средний балл по семестрам">
      {data.map((d, i) => (
        <div key={d.s} className="flex flex-1 flex-col items-center gap-1">
          <b className="text-[13px] tabular">{fmt(d.v)}</b>
          <m.div
            className="w-full origin-bottom rounded-[8px] bg-glass-50"
            style={{ height: `${Math.max(12, (d.v - 3) * 36)}px` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ ...spring.soft, delay: 0.15 + i * 0.06 }}
          />
          <span className="text-[11px] font-semibold whitespace-nowrap">{semesterLabel(d.s)}</span>
        </div>
      ))}
    </div>
  );
}
