'use client';

import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { SlidingPill } from '@/components/motion/SlidingPill';
import { press, spring } from '@/components/motion/tokens';

export type DayItem = { key: string; weekday: string; day: number; muted?: boolean; label: string };

/**
 * Полоса дней недели (B2Next): белые кнопки 52×60, выбранный день — чёрный, подложка скользит.
 * Стрелками ← → можно ходить по дням с клавиатуры.
 */
export function DayStrip({
  days,
  selected,
  onSelect,
  layoutId = 'day-pill',
}: {
  days: DayItem[];
  selected: string;
  onSelect: (key: string) => void;
  layoutId?: string;
}) {
  const move = (dir: 1 | -1) => {
    const i = days.findIndex((d) => d.key === selected);
    const next = days[i + dir];
    if (next) onSelect(next.key);
  };
  return (
    <div
      role="tablist"
      aria-label="Дни недели"
      className="flex gap-1.5"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1);
        if (e.key === 'ArrowLeft') move(-1);
      }}
    >
      {days.map((d) => {
        const on = d.key === selected;
        return (
          <m.button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={d.label}
            tabIndex={on ? 0 : -1}
            whileTap={press}
            transition={spring.snappy}
            onClick={() => onSelect(d.key)}
            className={cn(
              'relative isolate flex h-[60px] w-[52px] flex-col items-center justify-center gap-px rounded-[16px] text-[12px] font-medium transition-colors duration-200',
              on ? 'text-surface' : d.muted ? 'bg-transparent text-ink-2' : 'bg-surface text-ink-desk',
            )}
          >
            {on && <SlidingPill id={layoutId} className="rounded-[16px] bg-ink-desk" />}
            {d.weekday}
            <b className="text-[18px] font-bold tabular">{d.day}</b>
          </m.button>
        );
      })}
    </div>
  );
}
