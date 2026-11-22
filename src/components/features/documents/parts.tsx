'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useRef, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import type { Step } from '@/lib/requests';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { DEAN_OFFICE } from '@/lib/university';
import { StatefulButton, type ButtonState } from '@/components/motion/StatefulButton';
import { useShake } from '@/components/motion/useShake';
import { useToast } from '@/components/motion/Toast';
import { ease, spring } from '@/components/motion/tokens';
import { cancelRequestAction } from '@/app/(student)/documents/actions';

/** «Как идёт»: шаги вертикально, линия рисуется сверху вниз, текущий шаг подсвечен. */
export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="m-0 list-none p-0">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const done = s.state === 'done';
        const hot = s.state === 'current' || s.state === 'alert';
        return (
          <m.li
            key={s.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring.soft, delay: 0.08 * i }}
            className={cn(
              'flex gap-3',
              hot && '-mx-2.5 rounded-[12px] px-2.5 pt-2',
              hot && (s.state === 'alert' ? 'bg-danger-wash' : 'bg-hero-wash'),
            )}
            aria-current={hot ? 'step' : undefined}
          >
            <div className="flex w-4 flex-col items-center">
              <span
                className={cn(
                  'mt-[3px] block size-3.5 shrink-0 rounded-full',
                  done && 'bg-ink',
                  s.state === 'current' && 'border-[3px] border-hero bg-surface',
                  s.state === 'alert' && 'border-[3px] border-danger bg-surface',
                  s.state === 'todo' && 'border-2 border-ink-4',
                )}
              >
                {hot && (
                  <span className="block size-full animate-ping rounded-full bg-hero/40 [animation-iteration-count:2]" />
                )}
              </span>
              {!last && (
                <m.span
                  className={cn(
                    'my-[3px] block min-h-4 w-0.5 flex-1 origin-top',
                    done ? 'bg-ink' : 'bg-canvas',
                  )}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.45, ease: ease.out, delay: 0.12 + 0.08 * i }}
                />
              )}
            </div>
            <div className={cn('pb-3 text-[15px]', s.state === 'todo' && 'text-ink-2', last && 'pb-1.5')}>
              {hot ? <b className={s.state === 'alert' ? 'text-danger' : undefined}>{s.title}</b> : s.title}
              {s.note && <div className="mt-0.5 text-[13px] font-semibold text-ink-2">{s.note}</div>}
            </div>
          </m.li>
        );
      })}
    </ol>
  );
}

/** «Написать специалисту»: кто ведёт заявку и как связаться (в прототипе — контакты дирекции). */
export function SpecialistLink({ who, className }: { who: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-12 w-full items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 text-left text-[14px] font-bold',
          className,
        )}
      >
        <span className="flex-1">Написать специалисту</span>
        <span aria-hidden>→</span>
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Специалист деканата"
        description="Заявку ведёт методист дирекции."
      >
        <div className="rounded-[18px] bg-surface-2 p-4 text-[15px]">
          <b>{who}</b>
          <div className="mt-1 text-[14px] text-ink-2">
            ауд. {DEAN_OFFICE.room} · {DEAN_OFFICE.hours}
          </div>
          <div className="mt-1 text-[14px] text-ink-2">metodist@dekanat.test</div>
        </div>
        <p className="m-0 mt-3 text-[13px] text-ink-2">
          Быстрее — спросить помощника: он видит вашу заявку и ответит сразу.
        </p>
        <Link
          href="/assistant"
          className="mt-3 flex h-12 items-center justify-center rounded-[15px] bg-ink text-[15px] font-extrabold text-surface"
        >
          Спросить помощника
        </Link>
      </Sheet>
    </>
  );
}

/** «Отменить заявку» с подтверждением прямо на месте (без системных диалогов). */
export function CancelRequest({ id }: { id: string }) {
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!ask ? (
        <m.button
          key="a"
          type="button"
          onClick={() => setAsk(true)}
          exit={{ opacity: 0 }}
          className="mt-1 min-h-11 text-left text-[14px] font-bold text-danger"
        >
          Отменить заявку
        </m.button>
      ) : (
        <m.div
          key="b"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 rounded-[14px] bg-danger-wash p-2 pl-3.5"
        >
          <span className="flex-1 text-[14px] font-bold text-danger">Точно отменить?</span>
          <Button size="sm" variant="white" onClick={() => setAsk(false)}>
            Нет
          </Button>
          <Button
            size="sm"
            className="bg-danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelRequestAction(id);
                if (r.ok) {
                  toast.show({ title: 'Заявка отменена', tone: 'neutral' });
                  router.refresh();
                } else toast.show({ title: r.error ?? 'Не получилось', tone: 'danger' });
                setAsk(false);
              })
            }
          >
            Да, отменить
          </Button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** Загрузка файла в заявку: кнопка → выбор файла → индикатор → галочка; ошибка — покачивание и текст. */
export function UploadButton({
  requestId,
  requirementId,
  label = 'Загрузить файл',
  className,
}: {
  requestId: string;
  requirementId?: string;
  label?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ButtonState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ref, shake] = useShake<HTMLDivElement>();
  const router = useRouter();
  const toast = useToast();

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError('Файл больше 10 МБ');
      shake();
      return;
    }
    setState('loading');
    const fd = new FormData();
    fd.set('file', file);
    if (requirementId) fd.set('requirementId', requirementId);
    try {
      const res = await fetch(`/api/documents/${requestId}/attachments`, { method: 'POST', body: fd });
      const json = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
      if (!res.ok) throw new Error(json.error ?? 'Не удалось загрузить');
      setState('success');
      toast.show({
        title: 'Файл приложен',
        body: json.status === 'in_progress' ? 'Все документы на месте — заявка снова в работе' : file.name,
        tone: 'ok',
      });
      window.setTimeout(() => router.refresh(), 700);
    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
      shake();
    }
  };

  return (
    <div ref={ref} className={className}>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />
      <StatefulButton
        state={state}
        successLabel="Приложено"
        className="w-full"
        onClick={() => input.current?.click()}
      >
        <Icon name="upload" size={18} />
        {label}
      </StatefulButton>
      <AnimatePresence>
        {error && (
          <m.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 text-[13px] font-bold text-danger">! {error}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
