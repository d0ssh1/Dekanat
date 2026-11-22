'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { movedToLabel, placeLabel, type Lesson } from '@/lib/day';
import { cap, dayOf, hhmm, longDate } from '@/lib/time';
import type { TodoItem } from '@/lib/todo';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { FloorPlan } from './FloorPlan';

/** Кнопка «Войти»/«Подключиться» у онлайн-пары: внешняя ссылка в новой вкладке. */
export function JoinLink({
  lesson,
  size = 'sm',
  className,
}: {
  lesson: Lesson;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  if (!lesson.onlineUrl) return null;
  return (
    <a
      href={lesson.onlineUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-extrabold transition-transform active:scale-[.97]',
        size === 'sm'
          ? '-my-0.5 h-[34px] rounded-[10px] bg-join px-3 text-[13px] text-online'
          : 'h-[46px] w-full rounded-[14px] bg-online-desk text-[14px] text-surface',
        className,
      )}
    >
      {size === 'sm' ? 'Войти' : 'Подключиться'}
      <span className="sr-only"> к занятию «{lesson.subject}» (откроется в новой вкладке)</span>
    </a>
  );
}

/** «Схема этажа»: кнопка открывает лист со схемой. */
export function FloorPlanButton({
  room,
  className,
  variant = 'primary',
  size = 'lg',
  block,
}: {
  room: string;
  className?: string;
  variant?: 'primary';
  size?: 'lg' | 'md';
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} block={block} className={className} onClick={() => setOpen(true)}>
        Схема этажа
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Схема этажа">
        <FloorPlan room={room} />
      </Sheet>
    </>
  );
}

/** «По делам»: плашка на главной и лист со всеми делами. */
export function TodoLink({ items, className }: { items: TodoItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!items.length) {
    return (
      <Link
        href="/documents"
        className={cn(
          'flex min-h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 pr-3.5 pl-2 text-[14px] font-semibold',
          className,
        )}
      >
        <IconTile icon="check" tone="ok" />
        <b>Срочных дел нет</b>
        <span className="min-w-0 flex-1 truncate text-ink-2">заказать справку</span>
        <span aria-hidden>→</span>
      </Link>
    );
  }
  const first = items[0]!;
  const rest = items.length - 1;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-12 w-full items-center gap-2.5 rounded-[14px] bg-surface-2 pr-3.5 pl-2 text-left text-[14px] font-semibold transition-colors hover:bg-line',
          className,
        )}
      >
        <IconTile icon="clock" tone="hero" />
        <b>По делам</b>
        <span className="min-w-0 flex-1 truncate text-ink-2">
          {first.short}
          {rest > 0 && ` и ещё ${rest}`}
        </span>
        <span aria-hidden>→</span>
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="По делам"
        description="Что стоит сделать в ближайшие дни."
      >
        <TodoList items={items} onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

export function TodoList({ items, onNavigate }: { items: TodoItem[]; onNavigate?: () => void }) {
  return (
    <Stagger>
      {items.map((t, i) => (
        <StaggerItem key={t.key}>
          <Link
            href={t.href}
            onClick={onNavigate}
            className={cn('flex min-h-[52px] items-center gap-3 py-2.5', i > 0 && 'border-t border-line')}
          >
            <IconTile icon={t.icon} tone={t.tone} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{t.title}</span>
              <span
                className={cn(
                  'block text-[13px] font-semibold',
                  t.urgent && t.tone === 'danger' ? 'text-danger' : 'text-ink-2',
                )}
              >
                {t.hint}
              </span>
            </span>
            <span aria-hidden className="text-[18px] font-bold text-ink-2">
              ›
            </span>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/**
 * Окно «О паре»: всё про пару в одном месте — предмет, время, аудитория, преподаватель,
 * изменения, подключение к онлайн-паре и материалы курса. Открывается по нажатию на карточку пары.
 */
export function LessonSheet({
  lesson: l,
  open,
  onOpenChange,
}: {
  lesson: Lesson;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const off = l.status === 'moved' || l.status === 'cancelled';
  const rows: [string, React.ReactNode][] = [
    ['Предмет', <b key="s">{l.subject}</b>],
    ['Когда', `${cap(longDate(dayOf(l.startsAt)))}, ${hhmm(l.startsAt)}–${hhmm(l.endsAt)}`],
    ['Занятие', cap(l.kindLabel)],
    ['Где', l.online ? 'онлайн' : placeLabel(l.room)],
    ['Преподаватель', l.teacher],
  ];
  if (l.status === 'moved' && l.movedTo) rows.push(['Перенесена', movedToLabel(l)]);
  if (l.status === 'cancelled') rows.push(['Отменена', l.changeNote ?? 'пары не будет']);
  if (l.movedFrom) rows.push(['Перенос', 'перенесена с другого дня']);
  if (l.previousRoom) rows.push(['Аудитория', `поменяли, была ${l.previousRoom}`]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="О паре">
      <div className="flex flex-col">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={cn('flex items-baseline gap-4 py-2.5 text-[15px]', i > 0 && 'border-t border-line')}
          >
            <span className="w-32 shrink-0 text-[13px] font-semibold text-ink-2">{k}</span>
            <span
              className={cn('min-w-0', (k === 'Перенесена' || k === 'Отменена') && 'font-bold text-danger')}
            >
              {v}
            </span>
          </div>
        ))}
        {!off && l.online && <JoinLink lesson={l} size="lg" className="mt-3" />}
        <Link
          href={`/study/${l.courseId}`}
          className="mt-3 flex min-h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-4 text-[15px] font-bold"
        >
          <span className="flex-1">Материалы и баллы по предмету</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </Sheet>
  );
}

/** Карточка пары, которая открывает «О занятии». Ссылки и кнопки внутри работают как обычно. */
export function LessonOpener({
  lesson,
  className,
  children,
}: {
  lesson: Lesson;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${lesson.subject}, ${hhmm(lesson.startsAt)} — подробнее`}
      onClick={(e) => {
        // Клики из окна (оно в портале) и по ссылкам внутри карточки окно не открывают.
        if (!e.currentTarget.contains(e.target as Node) || (e.target as Element).closest('a,button')) return;
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={cn(
        'flex min-w-0 cursor-pointer rounded-[28px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        className,
      )}
    >
      {children}
      <LessonSheet lesson={lesson} open={open} onOpenChange={setOpen} />
    </div>
  );
}
