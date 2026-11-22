'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { addDays, cap, dayOf, hhmm, longDate, pairs } from '@/lib/time';
import { SLOTS } from '@/lib/university';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/motion/Toast';
import { spring } from '@/components/motion/tokens';
import { changeLessonAction } from '../actions';

type L = {
  id: string;
  startsAt: string;
  slot: number;
  room: string | null;
  status: string;
  subject: string;
  kind: string;
  format: string;
};

export function LessonEditor({ lessons }: { lessons: L[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const days = [...new Set(lessons.map((l) => dayOf(l.startsAt)))];
  return (
    // Дни — карточками в две колонки (CSS columns: плотно, без пустот), сверху вниз по порядку дней.
    <div className="mt-3.5 gap-3.5 lg:columns-2">
      {days.map((d) => {
        const ls = lessons.filter((l) => dayOf(l.startsAt) === d);
        const active = ls.filter((l) => l.status === 'scheduled').length;
        const changed = ls.length - active;
        return (
          <section key={d} className="mb-3.5 break-inside-avoid rounded-[24px] bg-surface px-5 pt-4 pb-2">
            <div className="flex items-baseline gap-2 pb-2">
              <h2 className="m-0 flex-1 text-[17px] font-extrabold">{cap(longDate(d))}</h2>
              <span className="text-[13px] font-semibold text-ink-2">
                {pairs(active)}
                {changed > 0 && <span className="text-danger"> · изменений: {changed}</span>}
              </span>
            </div>
            {ls.map((l) => (
              <div key={l.id} className="border-t border-desk-line">
                <div className="flex items-center gap-3 py-2.5">
                  <b
                    className={cn(
                      'w-12 shrink-0 text-[15px] tabular',
                      l.status !== 'scheduled' && 'text-ink-3 line-through',
                    )}
                  >
                    {hhmm(l.startsAt)}
                  </b>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-[15px] leading-snug',
                        l.status !== 'scheduled' && 'text-ink-2',
                      )}
                    >
                      {l.subject}
                    </span>
                    <span className="text-[12px] font-semibold text-ink-2">
                      {KIND[l.kind] ?? l.kind} · {l.format === 'online' ? 'онлайн' : `ауд. ${l.room}`}
                    </span>
                  </span>
                  {l.status === 'scheduled' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-expanded={open === l.id}
                      onClick={() => setOpen(open === l.id ? null : l.id)}
                    >
                      Изменить
                    </Button>
                  ) : (
                    <span className="rounded-[9px] bg-danger-wash px-2.5 py-1 text-[12px] font-bold text-danger">
                      {l.status === 'moved' ? 'перенесена' : 'отменена'}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {open === l.id && <Editor l={l} onDone={() => setOpen(null)} />}
                </AnimatePresence>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

const KIND: Record<string, string> = {
  lecture: 'лекция',
  practice: 'практика',
  lab: 'лабораторная',
  seminar: 'семинар',
  consult: 'консультация',
  exam: 'экзамен',
};

function Editor({ l, onDone }: { l: L; onDone: () => void }) {
  const [room, setRoom] = useState('');
  const [day, setDay] = useState(addDays(dayOf(l.startsAt), 3));
  const [slot, setSlot] = useState(l.slot);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const go = (input: Parameters<typeof changeLessonAction>[0]) =>
    start(async () => {
      const r = await changeLessonAction(input);
      if (r.ok) {
        toast.show({ title: r.message, tone: 'ok' });
        onDone();
        router.refresh();
      } else toast.show({ title: r.error, tone: 'danger' });
    });
  const field =
    'h-11 rounded-[12px] border-[1.5px] border-field-line bg-surface px-3 text-[15px] outline-none focus:border-ink-desk';
  return (
    <m.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={spring.soft}
      className="overflow-hidden"
    >
      <div className="mb-3 grid gap-3 rounded-[18px] bg-desk-chip p-4 md:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ lessonId: l.id, room });
          }}
          className="flex flex-col gap-2"
        >
          <b className="text-[14px]">Замена аудитории</b>
          <input
            aria-label="Новая аудитория"
            placeholder="например, D734"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className={field}
            required
          />
          <Button type="submit" size="md" disabled={pending}>
            Заменить аудиторию
          </Button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ lessonId: l.id, moveTo: { day, slot, room: room || l.room || '' } });
          }}
          className="flex flex-col gap-2"
        >
          <b className="text-[14px]">Перенос</b>
          <div className="flex gap-2">
            <input
              aria-label="Новая дата"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={cn(field, 'flex-1')}
              required
            />
            <select
              aria-label="Пара"
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value))}
              className={field}
            >
              {SLOTS.map((s) => (
                <option key={s.slot} value={s.slot}>
                  {s.slot} · {s.start}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="md" disabled={pending}>
            Перенести пару
          </Button>
        </form>
      </div>
    </m.div>
  );
}
