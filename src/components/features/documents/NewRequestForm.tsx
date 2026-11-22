'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { DeliveryValue, DocType } from '@/server/dal/documents';
import { DELIVERY } from '@/lib/requests';
import { DEAN_OFFICE } from '@/lib/university';
import { Icon } from '@/components/ui/Icon';
import { Odometer } from '@/components/motion/Odometer';
import { StatefulButton, type ButtonState } from '@/components/motion/StatefulButton';
import { useToast } from '@/components/motion/Toast';
import { spring } from '@/components/motion/tokens';
import { createRequestAction } from '@/app/(student)/documents/actions';

type Draft = { payload: Record<string, string>; delivery: DeliveryValue; copies: number; draftId: string };

/**
 * Новая заявка (макет B2DocFlow «Новая заявка», ошибка — B2Errors «Не отправилось»).
 * Всё уже заполнено — студент только проверяет; каждое поле можно поменять на месте.
 * Черновик хранится в браузере: при ошибке сети ничего вводить заново не нужно.
 */
export function NewRequestForm({
  type,
  studentLine,
  related,
  source,
}: {
  type: DocType;
  studentLine: string;
  related: { code: string; title: string }[];
  source: 'assistant' | 'form';
}) {
  const storageKey = `draft:${type.code}`;
  const initial = (): Draft => ({
    payload: Object.fromEntries(type.fields.map((f) => [f.key, f.default ?? f.options?.[0] ?? ''])),
    delivery: type.deliveries.includes('pdf_and_paper') ? 'pdf_and_paper' : type.deliveries[0]!,
    copies: 1,
    draftId: crypto.randomUUID(),
  });
  const [d, setD] = useState<Draft>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [state, setState] = useState<ButtonState>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  // Восстановить черновик после ошибки или перезагрузки.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // Черновик живёт во внешнем хранилище браузера — читаем его один раз после монтирования.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setD((x) => ({ ...x, ...(JSON.parse(saved) as Draft) }));
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(d));
    } catch {}
  }, [d, storageKey]);

  const submit = async () => {
    setError(null);
    setState('loading');
    try {
      const r = await createRequestAction({
        typeCode: type.code,
        delivery: d.delivery,
        copies: d.copies,
        payload: d.payload,
        source,
        draftId: d.draftId,
      });
      if (!r.ok) throw new Error(r.error);
      setState('success');
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      toast.show({
        title: `Заявка №${r.number} отправлена`,
        body: `${type.title} · ${type.etaText}`,
        tone: 'ok',
      });
      window.setTimeout(() => router.push(`/documents/${r.id}`), 650);
    } catch (e) {
      setState('idle');
      setError(
        e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Сервер деканата не ответил',
      );
    }
  };

  const kv = 'flex min-h-[56px] items-center gap-2.5 border-t border-line py-2.5';
  const pen = (key: string, label: string) => (
    <button
      type="button"
      aria-label={`Изменить: ${label}`}
      aria-expanded={editing === key}
      onClick={() => setEditing(editing === key ? null : key)}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-[12px]',
        editing === key ? 'bg-ink text-surface' : 'bg-surface-2',
      )}
    >
      <Icon name={editing === key ? 'check' : 'pencil'} size={18} />
    </button>
  );

  return (
    // flex-1: на компьютере форма тянется по высоте колонки, подсказка о выдаче — внизу.
    <div className="flex flex-1 flex-col">
      <AnimatePresence>
        {error && (
          <m.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-start gap-3 rounded-[14px] bg-danger-wash px-3.5 py-3 text-[14px] leading-snug">
              <b className="text-danger">!</b>
              <span>
                <b>Не отправилось.</b> {error}. Черновик сохранён — ничего вводить заново не нужно.
              </span>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <h2 className="m-0 text-[18px] font-bold">Проверьте</h2>
      <div className={cn(kv, 'border-t-0')}>
        <div className="flex-1">
          <div className="text-[12px] font-bold text-ink-2">Студент · из профиля</div>
          <div className="mt-0.5 text-[15px] font-semibold">{studentLine}</div>
        </div>
      </div>

      {type.fields.map((f) => (
        <div key={f.key} className={kv}>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-ink-2">{f.label}</div>
            {editing === f.key ? (
              f.type === 'select' ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={f.label}>
                  {f.options?.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={d.payload[f.key] === o}
                      onClick={() => setD((x) => ({ ...x, payload: { ...x.payload, [f.key]: o } }))}
                      className={cn(
                        'min-h-11 rounded-[11px] px-3 text-[13px] font-bold',
                        d.payload[f.key] === o ? 'bg-ink text-surface' : 'bg-surface-2',
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  autoFocus
                  aria-label={f.label}
                  value={d.payload[f.key] ?? ''}
                  maxLength={200}
                  onChange={(e) =>
                    setD((x) => ({ ...x, payload: { ...x.payload, [f.key]: e.target.value } }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                  className="mt-1 h-11 w-full rounded-[12px] border-[1.5px] border-field-line bg-surface px-3 text-[15px] outline-none focus:border-ink"
                />
              )
            ) : (
              <div className="mt-0.5 text-[15px] font-semibold">{d.payload[f.key] || '—'}</div>
            )}
          </div>
          {pen(f.key, f.label)}
        </div>
      ))}

      <div className={kv}>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-ink-2">Формат</div>
          {editing === 'delivery' ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Формат">
              {type.deliveries.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={d.delivery === o}
                  onClick={() => setD((x) => ({ ...x, delivery: o }))}
                  className={cn(
                    'min-h-11 rounded-[11px] px-3 text-[13px] font-bold',
                    d.delivery === o ? 'bg-ink text-surface' : 'bg-surface-2',
                  )}
                >
                  {DELIVERY[o]}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-0.5 text-[15px] font-semibold">{DELIVERY[d.delivery]}</div>
          )}
        </div>
        {type.deliveries.length > 1 && pen('delivery', 'Формат')}
      </div>

      {d.delivery !== 'pdf' && (
        <div className={kv}>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-ink-2">Экземпляров</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular">
              <Odometer value={d.copies} />
            </div>
          </div>
          <button
            type="button"
            aria-label="Меньше экземпляров"
            disabled={d.copies <= 1}
            onClick={() => setD((x) => ({ ...x, copies: Math.max(1, x.copies - 1) }))}
            className="size-11 rounded-[11px] bg-surface-2 text-[18px] font-extrabold disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Больше экземпляров"
            disabled={d.copies >= 5}
            onClick={() => setD((x) => ({ ...x, copies: Math.min(5, x.copies + 1) }))}
            className="size-11 rounded-[11px] bg-surface-2 text-[18px] font-extrabold disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}

      {type.requirements.length > 0 && (
        <div className="mt-1 rounded-[14px] bg-surface-2 px-3.5 py-3 text-[13px] leading-snug">
          <b>Понадобятся документы:</b> {type.requirements.join(', ').toLowerCase()}. Загрузите их в заявку
          после отправки.
        </div>
      )}
      <div className="mt-2.5 text-[12px] font-semibold text-ink-2">Основание: {type.legalBasis}</div>

      {related.length > 0 && (
        <>
          <h2 className="m-0 mt-4 text-[18px] font-bold">Может понадобиться ещё</h2>
          {related.map((t, i) => (
            <Link
              key={t.code}
              href={`/documents/new?type=${t.code}`}
              className={cn(
                'flex min-h-12 items-center gap-3 py-2.5 text-[15px]',
                i > 0 && 'border-t border-line',
              )}
            >
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-[9px] bg-hero-wash text-[16px] font-black"
              >
                +
              </span>
              <span className="flex-1">{t.title}</span>
              <span aria-hidden className="text-[18px] font-bold text-ink-2">
                ›
              </span>
            </Link>
          ))}
        </>
      )}
      {type.pickupPlace && (
        <div className="mt-auto pt-2.5">
          <div className="rounded-[14px] bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.45]">
            Готовую справку пришлём уведомлением. Бумажную — ауд. {type.pickupPlace}, {DEAN_OFFICE.hours}.
          </div>
        </div>
      )}

      {/* Главная кнопка — в оранжевом верху (HeroSubmit); форма отдаёт ей отправку и состояние. */}
      <SubmitBridge submit={submit} state={state} retry={Boolean(error)} />
    </div>
  );
}

/** Мост: кнопка в оранжевом верху телефона вызывает отправку этой формы. */
function SubmitBridge({ submit, state, retry }: { submit: () => void; state: ButtonState; retry: boolean }) {
  useEffect(() => {
    const h = () => submit();
    window.addEventListener('dekanat:submit-request', h);
    return () => window.removeEventListener('dekanat:submit-request', h);
  }, [submit]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dekanat:request-state', { detail: { state, retry } }));
  }, [state, retry]);
  return null;
}

/** Главная кнопка «Отправить в деканат» в оранжевом верху телефона. */
export function HeroSubmit() {
  const [s, setS] = useState<{ state: ButtonState; retry: boolean }>({ state: 'idle', retry: false });
  useEffect(() => {
    const h = (e: Event) => setS((e as CustomEvent).detail);
    window.addEventListener('dekanat:request-state', h);
    return () => window.removeEventListener('dekanat:request-state', h);
  }, []);
  return (
    <StatefulButton
      state={s.state}
      successLabel="Отправлено"
      className="w-full"
      onClick={() => window.dispatchEvent(new Event('dekanat:submit-request'))}
    >
      {s.retry ? 'Повторить отправку' : 'Отправить в деканат'}
    </StatefulButton>
  );
}
