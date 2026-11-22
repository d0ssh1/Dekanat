'use client';

import Link from 'next/link';
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { bigCountdown, focusOf, isActive, phaseOf, placeLabel, statusOf, type Lesson } from '@/lib/day';
import { dayOf, diffDays, hhmm, longDate, pairs, shortDate } from '@/lib/time';
import type { TodoItem } from '@/lib/todo';
import { Row, SectionHead, StatusText } from '@/components/ui/primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { HeroRing, PhoneSheet, PhoneTop } from '@/components/shell/PhoneTop';
import { Odometer } from '@/components/motion/Odometer';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { spring } from '@/components/motion/tokens';
import { JoinLink, LessonSheet, TodoLink, TodoList } from './pieces';
import { useNow } from './useNow';

/** Больше стольки пар — «насыщенный день»: прошедшие сворачиваются (макет B2Busy). */
const BUSY = 4;

export function PhoneToday({
  today,
  lessons,
  next,
  todos,
  unread,
  initials,
  serverNow,
}: {
  today: string;
  lessons: Lesson[];
  /** Ближайшая пара после сегодняшних — для вечера и выходных. */
  next: Lesson | null;
  todos: TodoItem[];
  unread: number;
  initials: string;
  serverNow: number;
}) {
  const boundaries = lessons.flatMap((l) => [Date.parse(l.startsAt), Date.parse(l.endsAt)]);
  const now = useNow(serverNow, boundaries);
  const focus = focusOf(lessons, now);
  const active = lessons.filter(isActive);
  const busy = active.length > BUSY;

  return (
    <div className="relative flex flex-1 flex-col">
      <HeroRing />
      <PhoneTop unread={unread} initials={initials}>
        {focus ? (
          <FocusHero lesson={focus.lesson} mode={focus.mode} now={now} today={today} />
        ) : (
          <FreeHero next={next} now={now} today={today} hadLessons={active.length > 0} />
        )}
      </PhoneTop>
      <PhoneSheet>
        {lessons.length ? (
          <DayList lessons={lessons} focusId={focus?.lesson.id} now={now} busy={busy} today={today} />
        ) : (
          <FreeSheet todos={todos} />
        )}
        {lessons.length > 0 && <TodoLink items={todos} className="mt-2.5" />}
      </PhoneSheet>
    </div>
  );
}

function FocusHero({
  lesson,
  mode,
  now,
  today,
}: {
  lesson: Lesson;
  mode: 'current' | 'next';
  now: number;
  today: string;
}) {
  const target = mode === 'current' ? Date.parse(lesson.endsAt) : Date.parse(lesson.startsAt);
  const big = bigCountdown(now, target, today);
  return (
    <Stagger delay={0.04}>
      <StaggerItem className="mt-5 text-[15px] font-bold">
        {mode === 'current' ? 'Идёт сейчас · до конца пары' : 'До следующей пары'}
      </StaggerItem>
      <StaggerItem className="mt-1 text-[104px] leading-[.88] font-black tracking-[-0.06em]">
        <Odometer value={big.value} />
        <span className="ml-2 text-[36px] tracking-[-0.02em]">{big.unit}</span>
      </StaggerItem>
      <StaggerItem className="mt-3 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
        {lesson.subject}
      </StaggerItem>
      <StaggerItem className="mt-1.5 text-[14px] leading-[1.45] font-semibold">
        {lesson.online ? 'онлайн' : placeLabel(lesson.room)} · {lesson.teacher}
        {big.unit !== 'мин' && <> · {hhmm(lesson.startsAt)}</>}
        {lesson.previousRoom && (
          <>
            <br />
            аудиторию поменяли — была {lesson.previousRoom}
          </>
        )}
      </StaggerItem>
      <StaggerItem className="mt-4">
        {lesson.online ? (
          <JoinLink lesson={lesson} size="lg" className="h-12 rounded-[15px] bg-ink text-[15px]" />
        ) : (
          <LessonDetailsButton lesson={lesson} />
        )}
      </StaggerItem>
    </Stagger>
  );
}

function FreeHero({
  next,
  now,
  today,
  hadLessons,
}: {
  next: Lesson | null;
  now: number;
  today: string;
  hadLessons: boolean;
}) {
  if (!next) {
    return (
      <div className="mt-5">
        <div className="text-[15px] font-bold">Пар больше нет</div>
        <div className="mt-1 text-[48px] leading-none font-black tracking-[-0.04em]">Отдыхайте</div>
      </div>
    );
  }
  const big = bigCountdown(now, Date.parse(next.startsAt), today);
  const nd = dayOf(next.startsAt);
  return (
    <Stagger delay={0.04}>
      <StaggerItem className="mt-5 text-[15px] font-bold">
        {hadLessons ? 'Пары закончились' : 'Сегодня пар нет'} · до следующей
      </StaggerItem>
      <StaggerItem
        className={cn(
          'mt-1 leading-[.88] font-black tracking-[-0.06em]',
          big.value.includes(':') ? 'text-[80px] max-[370px]:text-[72px]' : 'text-[104px]',
        )}
      >
        <Odometer value={big.value} />
        {big.unit !== 'завтра' && <span className="ml-2 text-[36px] tracking-[-0.02em]">{big.unit}</span>}
      </StaggerItem>
      <StaggerItem className="mt-3 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
        {next.subject}
      </StaggerItem>
      <StaggerItem className="mt-1.5 text-[14px] leading-[1.45] font-semibold">
        {diffDays(today, nd) === 1 ? 'завтра' : shortDate(nd)}, {hhmm(next.startsAt)} ·{' '}
        {next.online ? 'онлайн' : next.room} · {next.teacher}
      </StaggerItem>
      <StaggerItem className="mt-4">
        <ButtonLink href="/week" block>
          Расписание на неделю
        </ButtonLink>
      </StaggerItem>
    </Stagger>
  );
}

function LessonRow({
  l,
  phase,
  now,
  first,
}: {
  l: Lesson;
  phase: ReturnType<typeof phaseOf>;
  now: number;
  first?: boolean;
}) {
  const st = statusOf(l, phase, now);
  const focus = phase === 'current' || phase === 'next';
  const dim = phase === 'past' || l.status !== 'scheduled';
  return (
    <Row current={focus} first={first} className={cn(dim && 'text-ink-2')}>
      <b className={cn('w-[46px]', l.status !== 'scheduled' && 'line-through')}>{hhmm(l.startsAt)}</b>
      <span className={cn('min-w-0 flex-1', focus && 'font-extrabold')}>
        {l.subject}
        {l.online && phase !== 'past' && !focus && (
          <span className="ml-1 text-[12px] font-bold text-online">онлайн</span>
        )}
      </span>
      {l.online && phase !== 'past' && l.status === 'scheduled' && !focus ? (
        <JoinLink lesson={l} />
      ) : (
        <StatusText
          tone={
            st.tone === 'online'
              ? 'online'
              : st.tone === 'hero'
                ? 'hero'
                : st.tone === 'danger'
                  ? 'danger'
                  : 'muted'
          }
          strong={focus}
        >
          {st.text}
        </StatusText>
      )}
    </Row>
  );
}

function DayList({
  lessons,
  focusId,
  now,
  busy,
  today,
}: {
  lessons: Lesson[];
  focusId?: string;
  now: number;
  busy: boolean;
  today: string;
}) {
  const [showPast, setShowPast] = useState(false);
  const withPhase = lessons.map((l) => ({ l, p: phaseOf(l, focusId, now) }));
  const past = withPhase.filter((x) => x.p === 'past' && x.l.status === 'scheduled');
  const collapse = busy && past.length > 1 && !showPast;
  const visible = collapse ? withPhase.filter((x) => !past.includes(x)) : withPhase;
  const activeCount = lessons.filter(isActive).length;

  return (
    <>
      {busy ? (
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-[18px] font-bold">{longDate(today)}</h2>
          <Link href="/week" className="py-3 text-[13px] font-bold">
            {pairs(activeCount)} · неделя →
          </Link>
        </div>
      ) : (
        <SectionHead title="Сегодня" link={{ href: '/week', label: 'Неделя →' }} />
      )}
      <AnimatePresence initial={false}>
        {collapse && (
          <m.button
            key="past"
            type="button"
            onClick={() => setShowPast(true)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            aria-expanded={false}
            className="flex w-full items-center gap-2.5 overflow-hidden py-2.5 text-left text-ink-2"
          >
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
              {past.length === 1 ? '1 пара прошла' : `${pairs(past.length)} прошли`} ·{' '}
              {past.map((x) => x.l.short).join(', ')}
            </span>
            <StatusText>показать ▾</StatusText>
          </m.button>
        )}
      </AnimatePresence>
      <Stagger delay={0.12}>
        <AnimatePresence initial={false}>
          {visible.map(({ l, p }, i) => (
            <m.div
              key={l.id}
              layout="position"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring.soft}
            >
              <LessonRow
                l={l}
                phase={p}
                now={now}
                first={i === 0 || visible[i - 1]?.p === 'next' || visible[i - 1]?.p === 'current'}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </Stagger>
    </>
  );
}

function FreeSheet({ todos }: { todos: TodoItem[] }) {
  return (
    <>
      <SectionHead title="Можно успеть" />
      {todos.length ? (
        <TodoList items={todos.slice(0, 4)} />
      ) : (
        <p className="m-0 py-3 text-[15px] text-ink-2">Срочных дел нет — можно просто отдохнуть.</p>
      )}
      <Link
        href="/documents"
        className="mt-2.5 flex min-h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 text-[14px] font-semibold"
      >
        <span className="min-w-0 flex-1 text-ink-2">Нужна справка?</span>
        <b>Заказать</b>
        <span aria-hidden>→</span>
      </Link>
    </>
  );
}

/** «Подробнее о паре» в оранжевом верху: открывает окно занятия. */
function LessonDetailsButton({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button block onClick={() => setOpen(true)}>
        Подробнее о паре
      </Button>
      <LessonSheet lesson={lesson} open={open} onOpenChange={setOpen} />
    </>
  );
}
