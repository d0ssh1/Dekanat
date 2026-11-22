'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { focusOf, isActive, movedToLabel, phaseOf, placeLabel, type Lesson } from '@/lib/day';
import {
  addDays,
  cap,
  dayOf,
  dayNum,
  hhmm,
  pairs,
  relativeIn,
  shortDate,
  wdFull,
  wdGen,
  wdShort,
} from '@/lib/time';
import type { TodoItem } from '@/lib/todo';
import { DeskBlock, DeskCard, DeskRow, DeskValue } from '@/components/ui/desk';
import { DayStrip, type DayItem } from '@/components/shell/DayStrip';
import { Icon } from '@/components/ui/Icon';
import { Odometer } from '@/components/motion/Odometer';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { spring } from '@/components/motion/tokens';
import { FloorPlanButton, JoinLink } from './pieces';
import { useNow } from './useNow';
import { HomeGrid, useHomeEdit, type Block } from '@/components/features/home/HomeGrid';
import { Icon as MoreIcon } from '@/components/ui/Icon';

/** «···» в шапке блока — включает настройку главной. */
function EditMore() {
  const { start, editing } = useHomeEdit();
  if (editing) return null;
  return (
    <button
      type="button"
      onClick={start}
      aria-label="Настроить главную"
      className="flex size-9 items-center justify-center rounded-[11px] bg-desk-chip text-ink-desk"
    >
      <MoreIcon name="more" size={18} />
    </button>
  );
}

export type DocLine = { id: string; title: string; text: string; tone: 'ok' | 'danger' | 'ink' | 'muted' };

export function DeskToday({
  day,
  today,
  week,
  lessons,
  docs,
  study,
  after,
  serverNow,
  layout,
}: {
  day: string;
  today: string;
  week: { day: string; count: number }[];
  lessons: Lesson[];
  docs: DocLine[];
  study: TodoItem[];
  after: { day: string; lessons: Lesson[] } | null;
  serverNow: number;
  layout: Block[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const boundaries = lessons.flatMap((l) => [Date.parse(l.startsAt), Date.parse(l.endsAt)]);
  const now = useNow(serverNow, boundaries);
  // Направление листания дня: запоминаем прошлый день в состоянии (паттерн «предыдущее значение»).
  const [prevDay, setPrevDay] = useState(day);
  const [dir, setDir] = useState(0);
  if (day !== prevDay) {
    setDir(day > prevDay ? 1 : -1);
    setPrevDay(day);
  }

  const go = (d: string) =>
    startTransition(() => router.push(d === today ? '/' : `/?day=${d}`, { scroll: false }));
  const monday = week[0]!.day;
  const days: DayItem[] = week.map((w) => ({
    key: w.day,
    weekday: wdShort(w.day),
    day: dayNum(w.day),
    muted: w.count === 0,
    label: `${cap(wdFull(w.day))}, ${dayNum(w.day)} — ${w.count ? pairs(w.count) : 'пар нет'}${w.day === today ? ', сегодня' : ''}`,
  }));
  const active = lessons.filter(isActive);
  const title = `${cap(wdFull(day))} — ${active.length ? pairs(active.length) : 'пар нет'}`;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.h1
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring.soft}
            className="m-0 text-[36px] font-black tracking-[-0.03em]"
          >
            {title}
          </m.h1>
        </AnimatePresence>
        <div className="flex items-center gap-1.5">
          <WeekArrow label="Предыдущая неделя" onClick={() => go(addDays(monday, -7))}>
            ‹
          </WeekArrow>
          <DayStrip days={days} selected={day} onSelect={go} />
          <WeekArrow label="Следующая неделя" onClick={() => go(addDays(monday, 7))}>
            ›
          </WeekArrow>
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <m.div
          key={day}
          custom={dir}
          initial={{ opacity: 0, x: dir * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -60 }}
          transition={spring.soft}
        >
          <Cards lessons={lessons} isToday={day === today} now={now} after={after} today={today} />
        </m.div>
      </AnimatePresence>

      <HomeGrid
        initial={layout}
        render={{
          docs: (
            <DeskBlock
              more={<EditMore />}
              title="Документы"
              link={{ href: '/documents', label: 'Все →' }}
              className="h-full"
            >
              {docs.length ? (
                docs.slice(0, 2).map((d) => (
                  <DeskRow key={d.id}>
                    <Link href={`/documents/${d.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {d.title}
                    </Link>
                    <DeskValue tone={d.tone === 'danger' ? 'danger' : d.tone === 'muted' ? 'muted' : 'ink'}>
                      {d.text}
                    </DeskValue>
                  </DeskRow>
                ))
              ) : (
                <DeskRow>
                  <span className="flex-1 text-ink-2">Заявок в работе нет</span>
                  <Link href="/documents" className="text-[13px] font-bold">
                    Заказать →
                  </Link>
                </DeskRow>
              )}
            </DeskBlock>
          ),
          study: (
            <DeskBlock
              more={<EditMore />}
              title="Учёба"
              link={{ href: '/study', label: 'Все →' }}
              className="h-full"
            >
              {study.length ? (
                study.slice(0, 2).map((t) => (
                  <DeskRow key={t.key}>
                    <Link href={t.href} className="min-w-0 flex-1 truncate hover:underline">
                      {t.title}
                    </Link>
                    <DeskValue tone={t.tone === 'danger' ? 'danger' : 'ink'}>{t.hint}</DeskValue>
                  </DeskRow>
                ))
              ) : (
                <DeskRow>
                  <span className="flex-1 text-ink-2">Ближайших дедлайнов нет</span>
                </DeskRow>
              )}
            </DeskBlock>
          ),
          tomorrow: (
            <DeskBlock
              more={<EditMore />}
              title={after ? (after.day === addDays(today, 1) ? 'Завтра' : cap(wdFull(after.day))) : 'Дальше'}
              link={{ href: '/week', label: 'Неделя →' }}
              className="h-full"
            >
              {after && after.lessons.length ? (
                <>
                  <DeskRow>
                    <b className="w-11 tabular">{hhmm(after.lessons[0]!.startsAt)}</b>
                    <span className="min-w-0 flex-1 truncate">{after.lessons[0]!.short}</span>
                    <DeskValue>{after.lessons[0]!.online ? 'онлайн' : after.lessons[0]!.room}</DeskValue>
                  </DeskRow>
                  <DeskRow>
                    <span className="flex-1 text-ink-2">
                      {after.lessons.length > 1
                        ? `ещё ${pairs(after.lessons.length - 1)} · до ${hhmm(after.lessons.at(-1)!.endsAt)}`
                        : `одна пара · до ${hhmm(after.lessons[0]!.endsAt)}`}
                    </span>
                  </DeskRow>
                </>
              ) : (
                <DeskRow>
                  <span className="flex-1 text-ink-2">Пар нет</span>
                </DeskRow>
              )}
            </DeskBlock>
          ),
        }}
      />
    </div>
  );
}

function WeekArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[60px] w-10 items-center justify-center rounded-[16px] text-[20px] font-bold text-ink-desk hover:bg-surface"
    >
      {children}
    </button>
  );
}

// ---------------- Карточки пар ----------------
type CardModel =
  | { kind: 'past'; lessons: Lesson[] }
  | { kind: 'focus'; lesson: Lesson; label: string; mode: 'current' | 'next' | 'first' }
  | { kind: 'lesson'; lesson: Lesson };

function Cards({
  lessons,
  isToday,
  now,
  after,
  today,
}: {
  lessons: Lesson[];
  isToday: boolean;
  now: number;
  after: { day: string; lessons: Lesson[] } | null;
  today: string;
}) {
  const focus = isToday
    ? focusOf(lessons, now)
    : lessons.find(isActive)
      ? { lesson: lessons.find(isActive)!, mode: 'first' as const }
      : null;

  if (!lessons.length || (isToday && !focus)) {
    return <EmptyDay hadLessons={lessons.length > 0} after={after} today={today} />;
  }

  const models: CardModel[] = [];
  const past = isToday
    ? lessons.filter((l) => isActive(l) && phaseOf(l, focus?.lesson.id, now) === 'past')
    : [];
  if (past.length) models.push({ kind: 'past', lessons: past });
  for (const l of lessons) {
    if (past.includes(l)) continue;
    if (focus && l.id === focus.lesson.id) {
      const label =
        focus.mode === 'current'
          ? `Идёт сейчас · ещё ${Math.max(1, Math.round((Date.parse(l.endsAt) - now) / 60000))} мин`
          : focus.mode === 'next'
            ? `Следующая · ${relativeIn(now, Date.parse(l.startsAt))}`
            : 'Первая пара';
      models.push({ kind: 'focus', lesson: l, label, mode: focus.mode });
    } else models.push({ kind: 'lesson', lesson: l });
  }

  if (models.length <= 4) {
    const cols = models
      .map((c) => (c.kind === 'past' ? '0.62fr' : c.kind === 'focus' ? '1.6fr' : '1fr'))
      .join(' ');
    return (
      <Stagger className="grid h-[452px] items-end gap-3.5" style={{ gridTemplateColumns: cols }}>
        {models.map((c, i) => (
          <StaggerItem key={i}>
            <CardView c={c} now={now} tall={c.kind === 'focus'} />
          </StaggerItem>
        ))}
      </Stagger>
    );
  }
  return <Carousel models={models} now={now} />;
}

function Carousel({ models, now }: { models: CardModel[]; now: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const hidden = Math.max(0, models.length - 4);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 420, behavior: 'smooth' });
  return (
    <div className="relative h-[476px]">
      <Stagger
        ref={ref}
        role="list"
        aria-label="Пары дня, прокручиваются по горизонтали"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
        }}
        className="flex h-full snap-x snap-mandatory items-end gap-3.5 overflow-x-auto overscroll-x-contain pr-24 [scrollbar-width:none]"
      >
        {models.map((c, i) => (
          <StaggerItem
            key={i}
            role="listitem"
            className="snap-start"
            style={{ flex: '0 0 auto', width: c.kind === 'past' ? 132 : c.kind === 'focus' ? 360 : 200 }}
          >
            <CardView c={c} now={now} tall={c.kind === 'focus'} busy />
          </StaggerItem>
        ))}
      </Stagger>
      <AnimatePresence>
        {!atEnd && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -right-7 w-[120px] bg-gradient-to-r from-transparent to-desk-bg to-70%"
            />
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Показать следующие пары"
              className="absolute top-1/2 right-0 flex size-[52px] -translate-y-1/2 items-center justify-center rounded-full bg-ink-desk text-[22px] font-bold text-surface shadow-[0_10px_24px_rgba(20,20,26,.25)] transition-transform hover:scale-105 active:scale-95"
            >
              ›
            </button>
            {hidden > 0 && (
              <span className="absolute top-[calc(50%+36px)] right-0 w-[52px] text-center text-[12px] font-bold text-ink-2">
                ещё {hidden}
              </span>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardView({ c, now, tall, busy }: { c: CardModel; now: number; tall?: boolean; busy?: boolean }) {
  const h = busy ? (tall ? 'h-[476px]' : 'h-[410px]') : tall ? 'h-[452px]' : 'h-[388px]';
  if (c.kind === 'past') return <PastCard lessons={c.lessons} className={h} />;
  if (c.kind === 'focus') return <FocusCard c={c} now={now} className={h} />;
  return <LessonCard l={c.lesson} className={h} />;
}

function PastCard({ lessons, className }: { lessons: Lesson[]; className: string }) {
  const [open, setOpen] = useState(false);
  if (lessons.length === 1) {
    const l = lessons[0]!;
    return (
      <DeskCard tone="muted" className={className}>
        <span className="text-[13px] font-bold text-ink-2">{hhmm(l.startsAt)} · прошла</span>
        <b className="mt-auto text-[15px] text-ink-soft">{l.subject}</b>
        <span className="text-[13px] text-ink-2">{l.online ? 'онлайн' : `ауд. ${l.room}`}</span>
      </DeskCard>
    );
  }
  return (
    <DeskCard tone="muted" className={className}>
      <span className="text-[13px] font-bold text-ink-2">{lessons.length} прошли</span>
      <div className="mt-auto text-[14px] leading-normal text-ink-soft">
        {(open ? lessons : lessons.slice(-2)).map((l) => (
          <div key={l.id}>
            <b>{hhmm(l.startsAt)}</b> {l.short}
          </div>
        ))}
      </div>
      {lessons.length > 2 && (
        <button
          type="button"
          onClick={() => setOpen((x) => !x)}
          className="mt-2 h-10 rounded-[12px] bg-surface text-[13px] font-bold"
        >
          {open ? 'Скрыть' : 'Показать'}
        </button>
      )}
    </DeskCard>
  );
}

function FocusCard({
  c,
  now,
  className,
}: {
  c: Extract<CardModel, { kind: 'focus' }>;
  now: number;
  className: string;
}) {
  const l = c.lesson;
  const minutes = c.mode === 'next' ? Math.ceil((Date.parse(l.startsAt) - now) / 60000) : null;
  return (
    <DeskCard tone="accent" className={cn('p-[26px]', className)}>
      <span
        aria-hidden
        className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
      />
      <div className="relative text-[14px] font-bold">
        {minutes !== null && minutes < 100 ? (
          <>
            Следующая · через <Odometer value={minutes} /> мин
          </>
        ) : (
          c.label
        )}
      </div>
      <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em] tabular">
        {hhmm(l.startsAt)}
      </div>
      <div className="relative mt-auto">
        <div className="text-[34px] leading-[1.05] font-black tracking-[-0.02em]">{l.subject}</div>
        <div className="mt-2 text-[14px] font-semibold">
          {cap(l.kindLabel)} · <b>{l.online ? 'онлайн' : placeLabel(l.room)}</b> · {l.teacher}
          {l.previousRoom && <> · была {l.previousRoom}</>}
        </div>
        <div className="mt-3.5 flex items-center gap-4">
          {l.online ? (
            <JoinLink lesson={l} size="lg" className="w-auto bg-ink-desk px-5" />
          ) : (
            l.room && <FloorPlanButton room={l.room} size="md" className="h-[46px] px-5" />
          )}
          <Link href={`/study/${l.courseId}`} className="text-[14px] font-bold hover:underline">
            Материалы →
          </Link>
        </div>
      </div>
    </DeskCard>
  );
}

function LessonCard({ l, className }: { l: Lesson; className: string }) {
  if (l.status === 'moved' || l.status === 'cancelled') {
    return (
      <DeskCard tone="moved" className={className}>
        <span className="text-[13px] font-bold text-ink-2">
          <s>{hhmm(l.startsAt)}</s> ·{' '}
          <span className="text-danger">{l.status === 'moved' ? 'перенесена' : 'отменена'}</span>
        </span>
        <b className="mt-1 text-[19px] font-extrabold tracking-[-0.03em] text-ink-2">{l.subject}</b>
        {l.status === 'moved' && l.movedTo ? (
          <div className="mt-auto rounded-[14px] bg-desk-chip p-3">
            <div className="text-[12px] text-ink-2">Новое время</div>
            <b className="text-[15px]">{movedToLabel(l)}</b>
            <div className="text-[13px]">ауд. {l.room}</div>
          </div>
        ) : (
          <div className="mt-auto rounded-[14px] bg-desk-chip p-3 text-[13px] leading-snug">
            {l.changeNote}
          </div>
        )}
      </DeskCard>
    );
  }
  if (l.online) {
    return (
      <DeskCard tone="online" className={className}>
        <span className="text-[13px] font-extrabold text-online-desk">{hhmm(l.startsAt)} · онлайн</span>
        <b className="mt-1 text-[19px] font-extrabold tracking-[-0.03em]">{l.subject}</b>
        <span className="text-[13px] text-ink-2">{l.teacher}</span>
        <JoinLink lesson={l} size="lg" className="mt-auto" />
      </DeskCard>
    );
  }
  return (
    <DeskCard tone="white" className={className}>
      <span className="text-[13px] font-bold text-ink-2 tabular">{hhmm(l.startsAt)}</span>
      <b className="text-[19px] leading-tight font-extrabold tracking-[-0.02em]">{l.subject}</b>
      <span className="text-[13px] text-ink-2">
        {l.kindLabel} · ауд. {l.room}
      </span>
      <span className="text-[13px] text-ink-2">{l.teacher}</span>
      {(l.movedFrom || l.previousRoom) && (
        <span className="mt-auto text-[13px] font-bold text-danger">
          {l.movedFrom
            ? `перенесена с ${wdGen(dayOf(l.movedFrom))}`
            : `новая аудитория · была ${l.previousRoom}`}
        </span>
      )}
    </DeskCard>
  );
}

function EmptyDay({
  hadLessons,
  after,
  today,
}: {
  hadLessons: boolean;
  after: { day: string; lessons: Lesson[] } | null;
  today: string;
}) {
  const first = after?.lessons[0];
  return (
    <div className="grid h-[452px] grid-cols-[1.6fr_1fr] items-end gap-3.5">
      <DeskCard tone="accent" className="h-[452px] p-[26px]">
        <span
          aria-hidden
          className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
        />
        <div className="relative text-[14px] font-bold">
          {hadLessons ? 'Пары на сегодня закончились' : 'В этот день пар нет'}
        </div>
        {first ? (
          <>
            <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em] tabular">
              {hhmm(first.startsAt)}
            </div>
            <div className="relative mt-auto">
              <div className="text-[14px] font-bold">
                Следующая — {after!.day === addDays(today, 1) ? 'завтра' : shortDate(after!.day)}
              </div>
              <div className="mt-1 text-[34px] leading-[1.05] font-black">{first.subject}</div>
              <div className="mt-2 text-[14px] font-semibold">
                {first.online ? 'онлайн' : placeLabel(first.room)} · {first.teacher}
              </div>
            </div>
          </>
        ) : (
          <div className="relative mt-auto text-[34px] font-black">Отдыхайте</div>
        )}
      </DeskCard>
      <DeskCard tone="white" className="h-[388px]">
        <Icon name="calendar" size={28} />
        <b className="mt-auto text-[19px] font-extrabold">Вся неделя</b>
        <span className="text-[13px] text-ink-2">пары, переносы и изменения</span>
        <Link
          href="/week"
          className="mt-3 inline-flex h-[46px] items-center justify-center rounded-[14px] bg-ink-desk text-[14px] font-extrabold text-surface"
        >
          Открыть неделю
        </Link>
      </DeskCard>
    </div>
  );
}
