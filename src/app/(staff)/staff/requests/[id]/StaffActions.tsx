'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/motion/Toast';
import { spring } from '@/components/motion/tokens';
import { transitionAction } from '../../actions';

type Mode = null | 'need' | 'reject';

/** Действия методиста по статусу заявки. Каждое действие сразу уходит студенту уведомлением. */
export function StaffActions({ id, status, hasPdf }: { id: string; status: string; hasPdf: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [eta, setEta] = useState(1);
  const [title, setTitle] = useState('Справка о доходах семьи');
  const [comment, setComment] = useState('');
  const [due, setDue] = useState(3);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const run = (input: Parameters<typeof transitionAction>[1]) =>
    start(async () => {
      const r = await transitionAction(id, input);
      if (r.ok) {
        toast.show({ title: r.message, tone: 'ok' });
        setMode(null);
        router.refresh();
      } else toast.show({ title: r.error, tone: 'danger' });
    });

  const field =
    'h-11 w-full rounded-[12px] border-[1.5px] border-field-line bg-surface px-3 text-[15px] outline-none focus:border-ink-desk';

  return (
    <section className="rounded-[24px] bg-surface px-6 py-5">
      <h2 className="m-0 text-[16px] font-bold">Действия</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {(status === 'sent' || status === 'need_action') && (
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={pending} onClick={() => run({ action: 'take', etaDays: eta || undefined })}>
              Взять в работу
            </Button>
            <label className="flex items-center gap-2 text-[14px] text-ink-2">
              срок, дней
              <input
                type="number"
                min={0}
                max={30}
                value={eta}
                onChange={(e) => setEta(Number(e.target.value))}
                className={cn(field, 'w-20')}
              />
            </label>
          </div>
        )}
        {status === 'in_progress' && (
          <Button disabled={pending} onClick={() => run({ action: 'ready' })}>
            Готова — собрать PDF и сообщить
          </Button>
        )}
        {status === 'ready' && (
          <Button disabled={pending} onClick={() => run({ action: 'issue' })}>
            Отметить выданной
          </Button>
        )}
        {hasPdf && (
          <a
            href={`/api/documents/${id}/pdf`}
            className="flex h-11 items-center justify-center rounded-[14px] bg-desk-chip text-[14px] font-bold"
          >
            Посмотреть PDF
          </a>
        )}
        {(status === 'sent' || status === 'in_progress') && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => setMode(mode === 'need' ? null : 'need')}
          >
            Запросить документ
          </Button>
        )}
        {['sent', 'in_progress', 'need_action'].includes(status) && (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => setMode(mode === 'reject' ? null : 'reject')}
          >
            Отклонить
          </Button>
        )}
        {['issued', 'rejected', 'cancelled'].includes(status) && (
          <p className="m-0 text-[14px] text-ink-2">Заявка закрыта — действий нет.</p>
        )}
      </div>

      <AnimatePresence>
        {mode && (
          <m.form
            key={mode}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === 'need')
                run({
                  action: 'need',
                  title,
                  comment: comment || `Приложите: ${title.toLowerCase()}`,
                  dueDays: due,
                });
              else run({ action: 'reject', comment });
            }}
          >
            <div className="mt-4 flex flex-col gap-2.5 rounded-[18px] bg-desk-chip p-4">
              {mode === 'need' && (
                <label className="flex flex-col gap-1 text-[13px] font-bold text-ink-2">
                  Какой документ
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={field}
                    required
                    minLength={2}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-[13px] font-bold text-ink-2">
                {mode === 'need' ? 'Комментарий студенту' : 'Причина отказа'}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  required={mode === 'reject'}
                  minLength={2}
                  className={cn(field, 'h-auto py-2')}
                />
              </label>
              {mode === 'need' && (
                <label className="flex items-center gap-2 text-[13px] font-bold text-ink-2">
                  срок, дней
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={due}
                    onChange={(e) => setDue(Number(e.target.value))}
                    className={cn(field, 'w-20')}
                  />
                </label>
              )}
              <Button
                type="submit"
                disabled={pending}
                className={mode === 'reject' ? 'bg-danger' : undefined}
              >
                {mode === 'need' ? 'Запросить у студента' : 'Отклонить заявку'}
              </Button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </section>
  );
}
