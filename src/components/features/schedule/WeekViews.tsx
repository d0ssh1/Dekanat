'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { cn } from '@/lib/cn';
import { focusOf, isActive, movedToLabel, type Lesson } from '@/lib/day';
import { addDays, cap, dayOf, dayNum, hhmm, mondayOf, pairs, wdGen, wdShort } from '@/lib/time';
import type { WeekNote } from '@/lib/week';
import { SLOTS } from '@/lib/university';
import { HeroRing, PhoneSheet } from '@/components/shell/PhoneTop';
import { Icon } from '@/components/ui/Icon';
import { Odometer } from '@/components/motion/Odometer';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { spring } from '@/components/motion/tokens';
import { useNow } from './useNow';

type WeekProps = {
  monday: string;
  today: string;
  label: string;
  weekNo: number;
  lessons: Lesson[];
  notes: WeekNote[];
  summary: string;
  serverNow: number;
};

const href = (monday: string, today: string) => (monday === mondayOf(today) ? '/week' : `/week?w=${monday}`);

// ======================= Телефон (макет B2Core2 «Неделя») =======================
export function PhoneWeek(p: WeekProps) {
  const router = useRouter();
  const now = useNow(p.serverNow);
  const total = p.lessons.filter(isActive).length;
  const focusId = focusOf(
    p.lessons.filter((l) => dayOf(l.startsAt) === p.today),
    now,
  )?.lesson.id;
  const days = Array.from({ length: 6 }, (_, i) => addDays(p.monday, i));
  const prev = addDays(p.monday, -7);
  const next = addDays(p.monday, 7);

  return (
    <div className="relative flex flex-1 flex-col">
      <HeroRing />
      <div className="relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[22px]">
        <div className="flex items-center gap-2">
          <Link
            href={href(prev, p.today)}
            scroll={false}
            aria-label="Предыдущая неделя"
            className="flex size-11 items-center justify-center rounded-[15px] bg-glass-50 text-[18px] font-bold"
          >
            ‹
          </Link>
          <h1 className="m-0 flex-1 text-center text-[15px] font-bold">
            {p.label} · неделя {p.weekNo}
          </h1>
          <Link
            href={href(next, p.today)}
            scroll={false}
            aria-label="Следующая неделя"
            className="flex size-11 items-center justify-center rounded-[15px] bg-glass-50 text-[18px] font-bold"
          >
            ›
          </Link>
        </div>
        <div className="mt-5 text-[14px] font-bold">На этой неделе</div>
        <div className="mt-1 text-[96px] leading-[.88] font-black tracking-[-0.06em]">
          <Odometer value={total} />
          <span className="ml-2 text-[32px] tracking-[-0.02em]">{pairs(total).split(' ')[1]}</span>
        </div>
        <div className="mt-1.5 text-[14px] leading-[1.45] font-semibold">{p.summary}</div>
      </div>
      <PhoneSheet>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div
            key={p.monday}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={spring.soft}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) router.push(href(next, p.today), { scroll: false });
              if (info.offset.x > 80) router.push(href(prev, p.today), { scroll: false });
            }}
          >
            {days.map((d, di) => {
              const ls = p.lessons.filter((l) => dayOf(l.startsAt) === d);
              const act = ls.filter(isActive).length;
              const isToday = d === p.today;
              return (
                <section key={d} aria-label={`${cap(wdShort(d))}, ${dayNum(d)}`}>
                  <h2
                    className={cn(
                      'm-0 flex items-baseline justify-between text-[14px] font-extrabold',
                      di > 0 && 'mt-3 border-t-2 border-ink pt-2.5',
                    )}
                  >
                    <span>
                      {cap(wdShort(d))}, {dayNum(d)}
                      {isToday && ' · сегодня'}
                    </span>
                    <span className="text-[12px] font-bold text-ink-2">{act ? pairs(act) : 'пар нет'}</span>
                  </h2>
                  {ls.map((l, i) => (
                    <PhoneWeekRow
                      key={l.id}
                      l={l}
                      first={i === 0}
                      focus={l.id === focusId}
                      past={Date.parse(l.endsAt) < now}
                    />
                  ))}
                </section>
              );
            })}
          </m.div>
        </AnimatePresence>
        <p className="m-0 mt-4 mb-2 text-center text-[12px] font-semibold text-ink-2">
          Недели листаются стрелками или свайпом
        </p>
      </PhoneSheet>
    </div>
  );
}

function PhoneWeekRow({
  l,
  first,
  focus,
  past,
}: {
  l: Lesson;
  first: boolean;
  focus: boolean;
  past: boolean;
}) {
  const off = l.status !== 'scheduled';
  let st: { text: string; cls: string };
  if (l.status === 'moved') st = { text: `→ ${movedToLabel(l)}`, cls: 'text-danger' };
  else if (l.status === 'cancelled') st = { text: 'отменена', cls: 'text-danger' };
  else if (l.movedFrom)
    st = { text: `${l.room} · перенос с ${wdShort(dayOf(l.movedFrom))}`, cls: 'text-danger' };
  else if (l.previousRoom) st = { text: `${l.room} · изменено`, cls: 'text-danger' };
  else if (l.online) st = { text: 'онлайн', cls: 'text-online' };
  else st = { text: l.room ?? '', cls: 'text-ink-2' };
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 py-2 text-[14px] tabular',
        !first && 'border-t border-line',
        focus &&
          '-mx-2.5 rounded-[12px] border-t-transparent bg-hero-wash px-2.5 shadow-[inset_4px_0_0_var(--hero)]',
        (past || off) && !focus && 'text-ink-2',
      )}
    >
      <b className={cn('w-[46px]', off && 'line-through')}>{hhmm(l.startsAt)}</b>
      <span
        className={cn('min-w-0 flex-1', focus && 'font-extrabold', l.kind === 'exam' && 'font-extrabold')}
      >
        {l.kind === 'exam' ? `Экзамен · ${l.short}` : l.subject}
      </span>
      <span className={cn('text-[12px] font-bold whitespace-nowrap', st.cls)}>{st.text}</span>
    </div>
  );
}

// ======================= Компьютер (макет B2WeekNext) =======================
export function DeskWeek(p: WeekProps & { calendarHref: string }) {
  const now = useNow(p.serverNow);
  const total = p.lessons.filter(isActive).length;
  const focusId = focusOf(
    p.lessons.filter((l) => dayOf(l.startsAt) === p.today),
    now,
  )?.lesson.id;
  const hasSat = p.lessons.some((l) => dayOf(l.startsAt) === addDays(p.monday, 5));
  const days = Array.from({ length: hasSat ? 6 : 5 }, (_, i) => addDays(p.monday, i));
  const maxSlot = Math.max(4, ...p.lessons.map((l) => l.slot));
  const slots = SLOTS.filter((s) => s.slot <= maxSlot);
  const prev = addDays(p.monday, -7);
  const next = addDays(p.monday, 7);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between">
        <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">
          Неделя — {total ? pairs(total) : 'пар нет'}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={href(prev, p.today)}
            scroll={false}
            aria-label="Предыдущая неделя"
            className="flex size-11 items-center justify-center rounded-[14px] bg-surface text-[20px] font-bold"
          >
            ‹
          </Link>
          <div className="flex h-11 items-center rounded-[14px] bg-surface px-4 text-[14px] font-bold">
            {p.label} · неделя {p.weekNo}
          </div>
          <Link
            href={href(next, p.today)}
            scroll={false}
            aria-label="Следующая неделя"
            className="flex size-11 items-center justify-center rounded-[14px] bg-surface text-[20px] font-bold"
          >
            ›
          </Link>
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={p.monday}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={spring.soft}
          className="grid gap-2"
          style={{
            gridTemplateColumns: `62px repeat(${days.length}, minmax(0, 1fr)) minmax(0, 1.45fr)`,
            gridTemplateRows: `58px repeat(${slots.length}, minmax(92px, auto))`,
          }}
        >
          <div />
          {days.map((d, i) => {
            const act = p.lessons.filter((l) => dayOf(l.startsAt) === d && isActive(l)).length;
            const isToday = d === p.today;
            return (
              <m.div
                key={d}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: i * 0.04 }}
                className={cn(
                  'flex items-center gap-2 rounded-[16px] px-3 text-[13px] font-semibold',
                  isToday ? 'bg-ink-desk text-surface' : 'bg-surface text-ink-2',
                )}
                aria-current={isToday ? 'date' : undefined}
              >
                {wdShort(d)}
                <b
                  className={cn('text-[20px] tracking-[-0.02em]', isToday ? 'text-surface' : 'text-ink-desk')}
                >
                  {dayNum(d)}
                </b>
                <span className="ml-auto text-[12px] font-bold">
                  {isToday ? 'сегодня' : act ? pairs(act) : 'пар нет'}
                </span>
              </m.div>
            );
          })}
          <div className="flex items-center gap-2 px-3 text-[13px] font-semibold text-ink-2">
            {!hasSat && (
              <>
                сб<b className="text-[20px] text-ink-2">{dayNum(addDays(p.monday, 5))}</b>
                <span className="ml-auto text-[12px] font-bold">пар нет</span>
              </>
            )}
          </div>

          {slots.map((s, si) => (
            <SlotRow
              key={s.slot}
              si={si}
              slot={s}
              days={days}
              lessons={p.lessons}
              focusId={focusId}
              now={now}
            />
          ))}

          <aside
            className="flex min-h-0 flex-col rounded-[22px] bg-surface px-4 pt-4 pb-3.5"
            style={{ gridColumn: days.length + 2, gridRow: `2 / span ${slots.length}` }}
          >
            <b className="text-[18px] font-black">На этой неделе</b>
            <div className="mt-0.5 text-[12px] text-ink-2">что изменилось и что важно</div>
            <Stagger className="mt-2.5" delay={0.2}>
              {p.notes.length ? (
                p.notes.map((n, i) => (
                  <StaggerItem key={n.key}>
                    <Note n={n} first={i === 0} />
                  </StaggerItem>
                ))
              ) : (
                <div className="py-2.5 text-[13px] text-ink-2">Изменений нет — всё по плану.</div>
              )}
            </Stagger>
            <a
              href={p.calendarHref}
              className="mt-auto flex min-h-11 items-center gap-2 rounded-[14px] bg-desk-chip px-3 text-[13px] font-bold whitespace-nowrap"
            >
              <Icon name="download" size={16} />
              <span className="flex-1">В календарь телефона</span>
              <span aria-hidden>→</span>
            </a>
          </aside>
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function SlotRow({
  si,
  slot,
  days,
  lessons,
  focusId,
  now,
}: {
  si: number;
  slot: (typeof SLOTS)[number];
  days: string[];
  lessons: Lesson[];
  focusId?: string;
  now: number;
}) {
  return (
    <>
      <div
        className="flex flex-col justify-center text-[11px] font-semibold text-ink-3 tabular"
        style={{ gridRow: si + 2 }}
      >
        {slot.slot} пара<b className="text-[14px] text-ink-desk">{slot.start}</b>
      </div>
      {days.map((d, di) => {
        const ls = lessons.filter((l) => dayOf(l.startsAt) === d && l.slot === slot.slot);
        const l = ls.find(isActive) ?? ls[0];
        return (
          <m.div
            key={d}
            style={{ gridRow: si + 2, gridColumn: di + 2 }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring.soft, delay: 0.03 * (di + si) }}
            className="min-w-0"
          >
            {l ? (
              <WeekCell
                l={l}
                focus={l.id === focusId}
                past={Date.parse(l.endsAt) < now}
                now={now}
                extra={ls.length - 1}
              />
            ) : (
              <div className="h-full rounded-[16px] bg-surface/40" aria-hidden />
            )}
          </m.div>
        );
      })}
    </>
  );
}

function WeekCell({
  l,
  focus,
  past,
  now,
  extra,
}: {
  l: Lesson;
  focus: boolean;
  past: boolean;
  now: number;
  extra: number;
}) {
  const off = l.status !== 'scheduled';
  let tone = 'bg-surface';
  if (focus) tone = 'bg-accent-desk shadow-[0_12px_26px_rgba(255,107,44,.32)]';
  else if (off) tone = 'border-[1.5px] border-dashed border-ink-4 bg-transparent';
  else if (past) tone = 'bg-desk-muted';
  else if (l.online) tone = 'bg-online-wash';

  let tm: React.ReactNode = hhmm(l.startsAt);
  if (focus)
    tm =
      Date.parse(l.startsAt) > now
        ? `${hhmm(l.startsAt)} · через ${Math.ceil((Date.parse(l.startsAt) - now) / 60000)} мин`
        : `${hhmm(l.startsAt)} · идёт сейчас`;
  if (past && !focus && !off) tm = `${hhmm(l.startsAt)} · прошла`;
  if (l.online && !off && !past) tm = <span className="text-online-desk">{hhmm(l.startsAt)} · онлайн</span>;
  if (l.status === 'moved')
    tm = (
      <>
        <s>{hhmm(l.startsAt)}</s> · <span className="font-extrabold text-danger">перенос</span>
      </>
    );
  if (l.status === 'cancelled')
    tm = (
      <>
        <s>{hhmm(l.startsAt)}</s> · <span className="font-extrabold text-danger">отменена</span>
      </>
    );
  if (l.movedFrom && !off)
    tm = (
      <>
        {hhmm(l.startsAt)} ·{' '}
        <span className="font-extrabold text-danger">перенос с {wdShort(dayOf(l.movedFrom))}</span>
      </>
    );
  if (l.kind === 'exam')
    tm = (
      <>
        {hhmm(l.startsAt)} · <span className="font-extrabold text-danger">экзамен</span>
      </>
    );

  let rm: React.ReactNode = l.online ? l.teacher : `ауд. ${l.room}`;
  if (l.status === 'moved' && l.movedTo) rm = `теперь ${movedToLabel(l)}`;
  if (l.status === 'cancelled') rm = l.changeNote ?? '';
  if (l.previousRoom && !off)
    rm = (
      <>
        <b className="text-[12px]">{l.room}</b> · была {l.previousRoom}
      </>
    );

  return (
    <article
      className={cn('flex h-full min-w-0 flex-col gap-px overflow-hidden rounded-[16px] px-3 py-[9px]', tone)}
    >
      <span className={cn('text-[12px] font-bold tabular', focus ? 'text-ink-desk' : 'text-ink-2')}>
        {tm}
      </span>
      <b
        className={cn(
          'text-[14px] leading-tight font-extrabold tracking-[-0.01em]',
          (off || (past && !focus)) && 'text-ink-soft',
          off && 'text-ink-2',
        )}
      >
        {l.subject}
      </b>
      <span className={cn('mt-auto truncate text-[12px]', focus ? 'text-ink-desk' : 'text-ink-2')}>
        {rm}
        {extra > 0 && ` · +${extra}`}
      </span>
    </article>
  );
}

function Note({ n, first }: { n: WeekNote; first: boolean }) {
  const dot = {
    danger: 'bg-danger-wash text-danger',
    hero: 'bg-hero-wash text-ink',
    ok: 'bg-ok-wash text-ok',
    neutral: 'bg-desk-chip text-ink',
  }[n.tone];
  const body = (
    <div
      className={cn(
        'flex items-start gap-2.5 py-2.5 text-[13px] leading-snug',
        !first && 'border-t border-desk-line',
      )}
    >
      <span
        className={cn(
          'flex size-[26px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-black',
          dot,
        )}
        aria-hidden
      >
        {n.mark}
      </span>
      <div>
        <b>{n.strong}</b>
        {n.text}
      </div>
    </div>
  );
  return n.href ? <Link href={n.href}>{body}</Link> : body;
}

export { wdGen };
