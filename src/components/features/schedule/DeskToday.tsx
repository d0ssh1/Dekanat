'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { focusOf, isActive, movedToLabel, phaseOf, placeLabel, type Lesson } from '@/lib/day';
import {
  addDays,
  cap,
  dayOf,
  dayNum,
  hhmm,
  mondayOf,
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
import { Odometer } from '@/components/motion/Odometer';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { spring } from '@/components/motion/tokens';
import { JoinLink, LessonOpener } from './pieces';
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
  initialDay,
  today,
  lessons2w,
  docs,
  study,
  serverNow,
  layout,
  todos,
}: {
  initialDay: string;
  today: string;
  /** Пары двух недель: выбранной и следующей. Дни внутри недели переключаются без запроса к серверу. */
  lessons2w: Lesson[];
  docs: DocLine[];
  study: TodoItem[];
  serverNow: number;
  layout: Block[];
  todos: TodoItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [day, setDay] = useState(initialDay);
  // Новая неделя пришла с сервера (стрелки ‹ ›) — встаём на её день.
  const [prevInitial, setPrevInitial] = useState(initialDay);
  if (initialDay !== prevInitial) {
    setPrevInitial(initialDay);
    setDay(initialDay);
  }
  // Мемоизацию делает React Compiler — здесь обычные вычисления.
  const lessons = lessons2w.filter((l) => dayOf(l.startsAt) === day);
  const after = nextStudyDay(lessons2w, day);
  const boundaries = lessons.flatMap((l) => [Date.parse(l.startsAt), Date.parse(l.endsAt)]);
  const now = useNow(serverNow, boundaries);
  // Направление листания дня: запоминаем прошлый день в состоянии (паттерн «предыдущее значение»).
  const [prevDay, setPrevDay] = useState(day);
  const [dir, setDir] = useState(0);
  if (day !== prevDay) {
    setDir(day > prevDay ? 1 : -1);
    setPrevDay(day);
  }

  const monday = mondayOf(initialDay);
  const urlOf = (d: string) => (d === today ? '/' : `/?day=${d}`);
  // День внутри недели — мгновенно; адрес обновляем, чтобы ссылка и перезагрузка открывали тот же день.
  const pick = (d: string) => {
    setDay(d);
    window.history.replaceState(null, '', urlOf(d));
  };
  const goWeek = (d: string) => startTransition(() => router.push(urlOf(d), { scroll: false }));
  const days: DayItem[] = Array.from({ length: 6 }, (_, i) => {
    const d = addDays(monday, i);
    const count = lessons2w.filter((l) => dayOf(l.startsAt) === d && isActive(l)).length;
    return {
      key: d,
      weekday: wdShort(d),
      day: dayNum(d),
      muted: count === 0,
      label: `${cap(wdFull(d))}, ${dayNum(d)} — ${count ? pairs(count) : 'пар нет'}${d === today ? ', сегодня' : ''}`,
    };
  });
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
          <WeekArrow label="Предыдущая неделя" onClick={() => goWeek(addDays(monday, -7))}>
            ‹
          </WeekArrow>
          <DayStrip days={days} selected={day} onSelect={pick} />
          <WeekArrow label="Следующая неделя" onClick={() => goWeek(addDays(monday, 7))}>
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
          <Cards
            lessons={lessons}
            isToday={day === today}
            now={now}
            after={after}
            today={today}
            todos={todos}
          />
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
                  {after.lessons.length === 2 ? (
                    <DeskRow>
                      <b className="w-11 tabular">{hhmm(after.lessons[1]!.startsAt)}</b>
                      <span className="min-w-0 flex-1 truncate">{after.lessons[1]!.short}</span>
                      <DeskValue>{after.lessons[1]!.online ? 'онлайн' : after.lessons[1]!.room}</DeskValue>
                    </DeskRow>
                  ) : (
                    <DeskRow>
                      <span className="flex-1 text-ink-2">
                        {after.lessons.length > 2
                          ? `ещё ${pairs(after.lessons.length - 1)}, последняя до ${hhmm(after.lessons.at(-1)!.endsAt)}`
                          : `одна пара, до ${hhmm(after.lessons[0]!.endsAt)}`}
                      </span>
                    </DeskRow>
                  )}
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

/** Ближайший после выбранного день с парами — для «Завтра» и пустого дня. */
function nextStudyDay(lessons: Lesson[], day: string) {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(day, i);
    const ls = lessons.filter((l) => dayOf(l.startsAt) === d && isActive(l));
    if (ls.length) return { day: d, lessons: ls };
  }
  return null;
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
  todos,
}: {
  lessons: Lesson[];
  isToday: boolean;
  now: number;
  after: { day: string; lessons: Lesson[] } | null;
  today: string;
  todos: TodoItem[];
}) {
  const focus = isToday
    ? focusOf(lessons, now)
    : lessons.find(isActive)
      ? { lesson: lessons.find(isActive)!, mode: 'first' as const }
      : null;

  if (!lessons.length || (isToday && !focus)) {
    return <EmptyDay hadLessons={lessons.length > 0} after={after} today={today} todos={todos} />;
  }

  // Каждая прошедшая пара — своя узкая серая карточка: видно, что было, и не отнимает место.
  const models: CardModel[] = [];
  for (const l of lessons) {
    if (isToday && isActive(l) && phaseOf(l, focus?.lesson.id, now) === 'past') {
      models.push({ kind: 'past', lessons: [l] });
      continue;
    }
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

  // До 6 карточек помещаются в один ряд целиком — без прокрутки. Высота у всех одна.
  if (models.length <= 6) {
    const cols = models
      .map((c) => (c.kind === 'past' ? '0.62fr' : c.kind === 'focus' ? '1.6fr' : '1fr'))
      .join(' ');
    return (
      <Stagger className="grid min-h-[340px] gap-3.5" style={{ gridTemplateColumns: cols }}>
        {models.map((c, i) => (
          <StaggerItem key={i} className="flex min-w-0">
            <CardView c={c} now={now} className="flex-1" compact={models.length >= 5} />
          </StaggerItem>
        ))}
      </Stagger>
    );
  }
  return <Carousel models={models} now={now} />;
}

/** Больше 6 пар: ряд листается. Кнопки появляются только с той стороны, куда ещё можно листать. */
function Carousel({ models, now }: { models: CardModel[]; now: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const sync = () => {
    const el = ref.current;
    if (el) setEdge({ start: el.scrollLeft <= 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    // Колесо мыши листает ряд по горизонтали — у многих мышей нет горизонтальной прокрутки.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const canMove = e.deltaY > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0;
      if (!canMove) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 440, behavior: 'smooth' });
  return (
    <div className="relative">
      <Stagger
        ref={ref}
        role="list"
        aria-label="Пары дня, прокручиваются по горизонтали"
        onScroll={sync}
        className="flex h-[360px] snap-x snap-proximity gap-3.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
      >
        {models.map((c, i) => (
          <StaggerItem
            key={i}
            role="listitem"
            className="flex snap-start"
            style={{ flex: '0 0 auto', width: c.kind === 'past' ? 150 : c.kind === 'focus' ? 380 : 220 }}
          >
            <CardView c={c} now={now} className="flex-1" />
          </StaggerItem>
        ))}
      </Stagger>
      <ScrollEdge side="start" show={!edge.start} onClick={() => scroll(-1)} />
      <ScrollEdge side="end" show={!edge.end} onClick={() => scroll(1)} />
    </div>
  );
}

function ScrollEdge({ side, show, onClick }: { side: 'start' | 'end'; show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'pointer-events-none absolute inset-y-0 flex w-24 items-center',
            side === 'start'
              ? 'left-0 justify-start bg-gradient-to-r from-desk-bg to-transparent'
              : 'right-0 justify-end bg-gradient-to-l from-desk-bg to-transparent',
          )}
        >
          <button
            type="button"
            onClick={onClick}
            aria-label={side === 'start' ? 'Предыдущие пары' : 'Следующие пары'}
            className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-surface text-ink-desk shadow-[0_6px_18px_rgba(22,22,29,.12)] ring-1 ring-desk-line transition-transform hover:scale-105 active:scale-95"
          >
            <MoreIcon name={side === 'start' ? 'back' : 'arrowRight'} size={18} stroke={2.4} />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function CardView({
  c,
  now,
  className,
  compact,
}: {
  c: CardModel;
  now: number;
  className?: string;
  compact?: boolean;
}) {
  const lesson = c.kind === 'past' ? c.lessons[0]! : c.lesson;
  return (
    <LessonOpener lesson={lesson} className={className}>
      {c.kind === 'past' ? (
        <PastCard lessons={c.lessons} className="flex-1" />
      ) : c.kind === 'focus' ? (
        <FocusCard c={c} now={now} className="flex-1" compact={compact} />
      ) : (
        <LessonCard l={c.lesson} className="flex-1" />
      )}
    </LessonOpener>
  );
}

function PastCard({ lessons, className }: { lessons: Lesson[]; className: string }) {
  const l = lessons[0]!;
  return (
    <DeskCard tone="muted" className={className}>
      <span className="text-[13px] font-bold text-ink-2 tabular">{hhmm(l.startsAt)}</span>
      <span className="text-[12px] font-semibold text-ink-2">прошла</span>
      <b className="mt-auto text-[15px] leading-tight text-ink-soft">{l.subject}</b>
      <span className="text-[13px] text-ink-2">{l.online ? 'онлайн' : `ауд. ${l.room}`}</span>
    </DeskCard>
  );
}

function FocusCard({
  c,
  now,
  className,
  compact,
}: {
  c: Extract<CardModel, { kind: 'focus' }>;
  now: number;
  className: string;
  compact?: boolean;
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
      <div
        className={cn(
          'relative leading-[.9] font-black tracking-[-0.05em] tabular',
          compact ? 'text-[64px]' : 'text-[88px]',
        )}
      >
        {hhmm(l.startsAt)}
      </div>
      <div className="relative mt-auto">
        <div
          className={cn(
            compact ? 'text-[24px]' : 'text-[clamp(24px,2.6vw,34px)]',
            'leading-[1.05] font-black tracking-[-0.02em] [overflow-wrap:anywhere] hyphens-auto',
          )}
        >
          {l.subject}
        </div>
        <div className="mt-2 text-[14px] font-semibold">
          {cap(l.kindLabel)} · <b>{l.online ? 'онлайн' : placeLabel(l.room)}</b> · {l.teacher}
          {l.previousRoom && <> · была {l.previousRoom}</>}
        </div>
        {l.online && (
          <div className="mt-3.5">
            <JoinLink lesson={l} size="lg" className="w-auto bg-ink-desk px-5" />
          </div>
        )}
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
      <b className="text-[19px] leading-tight font-extrabold tracking-[-0.02em] hyphens-auto [overflow-wrap:anywhere]">
        {l.subject}
      </b>
      <span className="text-[13px] text-ink-2">{l.kindLabel}</span>
      <span className="text-[13px] whitespace-nowrap text-ink-2">{l.teacher}</span>
      <div className="mt-auto flex flex-col items-start gap-2 pt-2">
        {(l.movedFrom || l.previousRoom) && (
          <span className="text-[13px] leading-snug font-bold text-danger">
            {l.movedFrom
              ? `перенесена с ${wdGen(dayOf(l.movedFrom))}`
              : `аудиторию поменяли — была ${l.previousRoom}`}
          </span>
        )}
        <span className="rounded-[11px] bg-desk-chip px-2.5 py-1.5 text-[13px] font-bold">
          {placeLabel(l.room)}
        </span>
      </div>
    </DeskCard>
  );
}

function EmptyDay({
  hadLessons,
  after,
  today,
  todos,
}: {
  hadLessons: boolean;
  after: { day: string; lessons: Lesson[] } | null;
  today: string;
  todos: TodoItem[];
}) {
  const first = after?.lessons[0];
  return (
    <div className="grid min-h-[340px] grid-cols-[1.6fr_1fr] gap-3.5">
      <DeskCard tone="accent" className="p-[26px]">
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
      <DeskCard tone="white">
        <b className="text-[19px] font-extrabold tracking-[-0.02em]">Можно успеть</b>
        {todos.length ? (
          todos.slice(0, 4).map((t, i) => (
            <Link
              key={t.key}
              href={t.href}
              className={cn(
                'flex items-center gap-3 py-2.5 text-[14px]',
                i > 0 && 'border-t border-desk-line',
              )}
            >
              <span className="min-w-0 flex-1">
                <b className="block truncate">{t.title}</b>
                <span className={cn('text-[13px]', t.tone === 'danger' ? 'text-danger' : 'text-ink-2')}>
                  {t.hint}
                </span>
              </span>
              <span aria-hidden className="text-ink-2">
                ›
              </span>
            </Link>
          ))
        ) : (
          <span className="text-[14px] text-ink-2">Срочных дел нет — можно отдохнуть.</span>
        )}
        <Link href="/week" className="mt-auto text-[14px] font-bold hover:underline">
          Вся неделя →
        </Link>
      </DeskCard>
    </div>
  );
}
