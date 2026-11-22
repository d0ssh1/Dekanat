'use client';

import Link from 'next/link';
import { AnimatePresence, LayoutGroup, m } from 'motion/react';
import { useOptimistic, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import type { Notice } from '@/server/dal/notifications';
import { dayMonth, dayOf, diffDays, hhmm } from '@/lib/time';
import { IconTile, type TileTone } from '@/components/ui/primitives';
import type { IconName } from '@/components/ui/Icon';
import { SlidingPill } from '@/components/motion/SlidingPill';
import { SwipeRow } from '@/components/motion/SwipeRow';
import { spring } from '@/components/motion/tokens';
import { markReadAction } from '@/app/(student)/notifications/actions';

const FILTERS = [
  { key: 'all', label: 'Все', kinds: null },
  { key: 'change', label: 'Расписание', kinds: ['change'] },
  { key: 'document', label: 'Документы', kinds: ['document'] },
  { key: 'dean', label: 'Деканат', kinds: ['news', 'deadline', 'grade', 'system'] },
] as const;

function look(n: Notice): { icon: IconName; tone: TileTone } {
  if (n.kind === 'change') return { icon: 'calendar', tone: 'hero' };
  if (n.kind === 'document') {
    if (/готова/.test(n.title)) return { icon: 'check', tone: 'ok' };
    if (/нужен|отклонена/.test(n.title)) return { icon: 'alert', tone: 'danger' };
    return { icon: 'doc', tone: 'neutral' };
  }
  if (n.kind === 'deadline') return { icon: 'clock', tone: 'hero' };
  if (n.kind === 'grade') return { icon: 'chart', tone: 'neutral' };
  return { icon: 'megaphone', tone: 'neutral' };
}

const groupLabel = (day: string, today: string) => {
  const d = diffDays(day, today);
  return d === 0 ? 'Сегодня' : d === 1 ? 'Вчера' : dayMonth(day);
};

/** Лента уведомлений (макет B2Core1): фильтр по типу, группы по дням, новые — с точкой и жирным. */
export function NoticeList({
  items,
  today,
  variant = 'phone',
}: {
  items: Notice[];
  today: string;
  variant?: 'phone' | 'desk';
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [, start] = useTransition();
  const [list, setRead] = useOptimistic(items, (state, id: string) =>
    state.map((n) => (id === 'all' || n.id === id ? { ...n, read: true } : n)),
  );
  const f = FILTERS.find((x) => x.key === filter)!;
  const shown = list.filter((n) => !f.kinds || (f.kinds as readonly string[]).includes(n.kind));
  const days = [...new Set(shown.map((n) => dayOf(n.createdAt)))];
  const read = (id: string) =>
    start(async () => {
      setRead(id);
      await markReadAction(id);
    });
  const line = variant === 'phone' ? 'border-line' : 'border-desk-line';

  return (
    <div>
      <LayoutGroup id={`nf-${variant}`}>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]"
          role="tablist"
          aria-label="Тип уведомлений"
        >
          {FILTERS.map((x) => {
            const on = x.key === filter;
            return (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(x.key)}
                className={cn(
                  'relative isolate h-11 shrink-0 rounded-[11px] px-3 text-[13px] font-bold whitespace-nowrap transition-colors',
                  on ? 'text-surface' : 'bg-surface-2 text-ink',
                )}
              >
                {on && <SlidingPill id="nf-pill" className="rounded-[11px] bg-ink" />}
                {x.label}
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={filter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={spring.soft}
        >
          {days.length === 0 && (
            <p className="m-0 py-6 text-center text-[15px] text-ink-2">Здесь пока пусто.</p>
          )}
          {days.map((d) => (
            <section key={d}>
              <h2 className="m-0 mt-3.5 mb-0.5 text-[12px] font-bold tracking-[.04em] text-ink-2 uppercase">
                {groupLabel(d, today)}
              </h2>
              {shown
                .filter((n) => dayOf(n.createdAt) === d)
                .map((n, i) => {
                  const lk = look(n);
                  const row = (
                    <Link
                      href={n.link ?? '/notifications'}
                      onClick={() => !n.read && read(n.id)}
                      className={cn(
                        'flex min-h-11 items-center gap-3 py-[11px] text-[15px]',
                        i > 0 && `border-t ${line}`,
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'h-9 w-1 shrink-0 rounded-full transition-colors',
                          n.read ? 'bg-transparent' : 'bg-hero',
                        )}
                      />
                      <IconTile icon={lk.icon} tone={lk.tone} size={36} />
                      <div className="min-w-0 flex-1">
                        {n.read ? <div>{n.title}</div> : <b>{n.title}</b>}
                        {n.body && (
                          <div className="mt-0.5 text-[13px] leading-[1.35] font-semibold text-ink-2">
                            {n.body}
                          </div>
                        )}
                      </div>
                      <span className="flex flex-col items-end gap-1">
                        <span className="text-[13px] font-bold whitespace-nowrap text-ink-2 tabular">
                          {hhmm(n.createdAt)}
                        </span>
                        {!n.read && (
                          <span className="rounded-[7px] bg-hero px-1.5 py-px text-[11px] font-extrabold">
                            новое
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                  return variant === 'phone' && !n.read ? (
                    <SwipeRow key={n.id} label="Прочитано" onSwipe={() => read(n.id)}>
                      {row}
                    </SwipeRow>
                  ) : (
                    <div key={n.id}>{row}</div>
                  );
                })}
            </section>
          ))}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

export function ReadAllButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => markReadAction('all'))}
      className={cn(
        'h-11 rounded-[13px] bg-glass-50 px-3 text-[13px] font-extrabold disabled:opacity-60',
        className,
      )}
    >
      Прочитать все
    </button>
  );
}
