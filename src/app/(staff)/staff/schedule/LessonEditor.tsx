'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { addDays, dayOf, hhmm, shortDate } from '@/lib/time';
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
    <section className="mt-3.5 rounded-[24px] bg-surface px-5 py-3">
      {days.map((d) => (
        <div key={d}>
          <h2 className="m-0 mt-3 text-[14px] font-extrabold">{shortDate(d)}</h2>
          {lessons
            .filter((l) => dayOf(l.startsAt) === d)
            .map((l) => (
              <div key={l.id} className="border-t border-desk-line">
                <div className="flex flex-wrap items-center gap-3 py-2.5 text-[15px]">
                  <b className={cn('w-12 tabular', l.status !== 'scheduled' && 'line-through')}>
                    {hhmm(l.startsAt)}
                  </b>
                  <span className="min-w-[160px] flex-1">
                    {l.subject}{' '}
                    <span className="text-[13px] text-ink-2">
                      · {l.format === 'online' ? 'онлайн' : l.room}
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
                    <span className="text-[13px] font-bold text-danger">
                      {l.status === 'moved' ? 'перенесена' : 'отменена'}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {open === l.id && <Editor l={l} onDone={() => setOpen(null)} />}
                </AnimatePresence>
              </div>
            ))}
        </div>
      ))}
    </section>
  );
}

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
