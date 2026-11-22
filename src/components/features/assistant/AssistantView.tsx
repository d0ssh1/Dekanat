'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { AnswerCard, Card, DraftCard } from '@/server/ai/types';
import { Icon } from '@/components/ui/Icon';
import { HeroRing } from '@/components/shell/PhoneTop';
import { StatefulButton, type ButtonState } from '@/components/motion/StatefulButton';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { useToast } from '@/components/motion/Toast';
import { spring } from '@/components/motion/tokens';
import { createRequestAction } from '@/app/(student)/documents/actions';

type Turn = {
  id: string;
  q: string;
  text: string;
  card: Card | null;
  thinking: string | null;
  done: boolean;
  error?: string;
  fallback?: boolean;
};

const SUGGEST = [
  'Нужна справка в военкомат',
  'Какие пары завтра?',
  'Сколько не хватает до допуска?',
  'Что с моими заявками?',
  'Где взять справку о доходах?',
];

const twoLines = (t: string) => {
  const i = t.indexOf(' ');
  return i > 0 && t.length > 12 ? (
    <>
      {t.slice(0, i)}
      <br />
      {t.slice(i + 1)}
    </>
  ) : (
    t
  );
};

/**
 * Помощник (макет B2PhoneA «Помощник»): вопрос и результат — крупно вверху,
 * «что взяла и откуда» — на «простыне», внизу — «спросить ещё…». Ответ приходит потоком.
 */
export function AssistantView({
  firstName,
  initialQuestion,
  now,
}: {
  firstName: string;
  initialQuestion?: string;
  now?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const threadId = useRef<string>(crypto.randomUUID());
  const asked = useRef(false);
  const busy = turns.at(-1)?.done === false;

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      const id = crypto.randomUUID();
      const history = turns.flatMap((t) => [
        { role: 'user' as const, content: t.q },
        { role: 'assistant' as const, content: t.text },
      ]);
      setTurns((ts) => [...ts, { id, q, text: '', card: null, thinking: 'Читаю вопрос', done: false }]);
      setInput('');
      const patch = (p: Partial<Turn>) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, threadId: threadId.current, history: history.slice(-8), now }),
        });
        if (!res.ok || !res.body) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? 'Помощник не ответил');
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let text = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const ev = /^event: (.+)$/m.exec(chunk)?.[1];
            const data = JSON.parse(/^data: (.+)$/m.exec(chunk)?.[1] ?? '{}');
            if (ev === 'thinking') patch({ thinking: data.label });
            if (ev === 'delta') {
              text += data.text;
              patch({ text, thinking: null });
            }
            if (ev === 'card') patch({ card: data });
            if (ev === 'done') patch({ done: true, fallback: data.fallback });
            if (ev === 'error') patch({ done: true, error: data.error });
          }
        }
        patch({ done: true });
      } catch (e) {
        patch({ done: true, thinking: null, error: e instanceof Error ? e.message : 'Помощник не ответил' });
      }
    },
    [turns, now],
  );

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      void send(initialQuestion);
    }
  }, [initialQuestion, send]);

  const last = turns.at(-1);
  const earlier = turns.slice(0, -1);

  return (
    <div className="relative flex flex-1 flex-col lg:block">
      <div className="lg:hidden">
        <HeroRing />
      </div>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-3.5">
        {/* ---------- Оранжевый верх / карточка ---------- */}
        <section className="relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-6 lg:min-h-[420px] lg:overflow-hidden lg:rounded-[28px] lg:bg-accent-desk lg:p-[26px] lg:shadow-accent">
          <span
            aria-hidden
            className="absolute top-[-90px] right-[-80px] hidden size-60 animate-breathe rounded-full bg-glass-20 lg:block"
          />
          <div className="relative flex items-center gap-2">
            <Link
              href="/"
              aria-label="Назад"
              className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-glass-50 lg:hidden"
            >
              <Icon name="back" stroke={2.4} />
            </Link>
            <div className="flex-1">
              <h1 className="m-0 text-[17px] font-bold">Помощник</h1>
              <div className="text-[13px] font-semibold">видит только ваши данные</div>
            </div>
          </div>
          <div className="relative" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={last?.id ?? 'empty'}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={spring.soft}
              >
                {last ? <Hero turn={last} /> : <Welcome firstName={firstName} onPick={send} />}
              </m.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ---------- «Простыня» / правая колонка ---------- */}
        <section className="relative flex flex-1 flex-col rounded-t-[28px] bg-surface px-[18px] pt-4 shadow-sheet lg:rounded-[24px] lg:px-6 lg:pt-5 lg:pb-5 lg:shadow-none">
          {/* Без ожидания выезда: при быстрой смене «думаю → ответ» содержимое не застревает. */}
          <>
            <m.div
              key={(last?.id ?? 'empty') + String(Boolean(last?.card))}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1"
            >
              {last?.card?.kind === 'draft' ? (
                <DraftDetails card={last.card} q={last.q} />
              ) : last?.card?.kind === 'answer' ? (
                <AnswerDetails card={last.card} onAsk={send} />
              ) : last && !last.done ? (
                <Thinking label={last.thinking ?? 'Думаю'} />
              ) : (
                <Suggestions onPick={send} />
              )}
              {last?.fallback && (
                <p className="m-0 mt-3 text-[12px] font-semibold text-ink-2">
                  GigaChat не ответил — ответила встроенная справка.
                </p>
              )}
              {earlier.length > 0 && <Earlier turns={earlier} />}
            </m.div>
          </>

          <form
            className="sticky bottom-[calc(var(--safe-bottom)+80px)] z-10 -mx-[18px] mt-4 bg-surface px-[18px] pt-2.5 pb-3 lg:bottom-0 lg:mx-0 lg:px-0 lg:pb-0"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void send(input);
            }}
          >
            <label className="flex h-[52px] items-center gap-2.5 rounded-[16px] bg-surface-2 pr-1 pl-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Сообщение помощнику"
                placeholder={last ? 'спросить ещё…' : 'например: нужна справка в военкомат'}
                maxLength={500}
                enterKeyHint="send"
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-ink-2"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Отправить"
                className="flex size-11 items-center justify-center rounded-[13px] bg-surface transition-transform active:scale-95 disabled:opacity-40"
              >
                <Icon name="arrowRight" />
              </button>
            </label>
          </form>
        </section>
      </div>
    </div>
  );
}

function Welcome({ firstName, onPick }: { firstName: string; onPick: (q: string) => void }) {
  return (
    <Stagger delay={0.05}>
      <StaggerItem className="mt-[18px] text-[14px] font-bold">Спросите что угодно</StaggerItem>
      <StaggerItem className="mt-1.5 text-[36px] leading-none font-black tracking-[-0.04em]">
        Чем помочь, {firstName}?
      </StaggerItem>
      <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
        Расписание, баллы, справки — отвечаю по вашим данным и собираю заявки сама.
      </StaggerItem>
      <StaggerItem className="mt-4">
        <button
          type="button"
          onClick={() => onPick(SUGGEST[0]!)}
          className="h-12 w-full rounded-[15px] bg-ink text-[15px] font-extrabold text-surface lg:w-auto lg:px-6"
        >
          Попробовать: «{SUGGEST[0]}»
        </button>
      </StaggerItem>
    </Stagger>
  );
}

function Hero({ turn }: { turn: Turn }) {
  const c = turn.card;
  return (
    <div>
      <div className="mt-[18px] text-[14px] font-semibold">Вы: «{turn.q}»</div>
      {turn.error ? (
        <div role="alert" className="mt-4 rounded-[14px] bg-surface/90 px-3.5 py-3 text-[14px] font-semibold">
          <b className="text-danger">!</b> {turn.error}
        </div>
      ) : !turn.done && !turn.text ? (
        <div className="mt-4">
          <div className="text-[14px] font-bold">{turn.thinking ?? 'Думаю'}…</div>
          <div className="mt-2 h-9 w-3/4 animate-pulse rounded-[12px] bg-glass-20" />
        </div>
      ) : c?.kind === 'draft' ? (
        <DraftHero card={c} meta={c.meta} />
      ) : (
        <>
          <div className="mt-4 text-[14px] font-bold">{c?.kind === 'answer' ? c.cap : 'Ответ'}</div>
          {c?.kind === 'answer' && (
            <div className="mt-1.5 text-[36px] leading-none font-black tracking-[-0.04em]">{c.headline}</div>
          )}
          <p className="m-0 mt-2.5 text-[14px] leading-[1.45] font-semibold">
            {turn.text}
            {!turn.done && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-ink align-middle" aria-hidden />
            )}
          </p>
        </>
      )}
    </div>
  );
}

function DraftHero({ card, meta }: { card: DraftCard; meta: string }) {
  const [state, setState] = useState<ButtonState>('idle');
  const router = useRouter();
  const toast = useToast();
  const [draftId] = useState(() => crypto.randomUUID());
  return (
    <>
      <div className="mt-4 text-[14px] font-bold">Собрала заявку</div>
      <div className="mt-1.5 text-[36px] leading-none font-black tracking-[-0.04em]">
        {twoLines(card.title)}
      </div>
      <div className="mt-2.5 text-[14px] leading-[1.45] font-semibold">{meta}</div>
      <StatefulButton
        state={state}
        successLabel="Отправлено"
        className="mt-4 w-full lg:w-auto lg:px-6"
        onClick={async () => {
          setState('loading');
          const r = await createRequestAction({
            typeCode: card.typeCode,
            delivery: card.delivery,
            copies: 1,
            payload: {},
            source: 'assistant',
            draftId,
          });
          if (!r.ok) {
            setState('idle');
            toast.show({ title: 'Не отправилось', body: r.error, tone: 'danger' });
            return;
          }
          setState('success');
          toast.show({ title: `Заявка №${r.number} отправлена`, body: card.title, tone: 'ok' });
          window.setTimeout(() => router.push(`/documents/${r.id}`), 700);
        }}
      >
        Отправить в деканат
      </StatefulButton>
    </>
  );
}

function DraftDetails({ card, q }: { card: DraftCard; q: string }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[18px] font-bold">Что взяла и откуда</h2>
        <Link
          href={`/documents/new?type=${card.typeCode}&q=${encodeURIComponent(q)}`}
          className="py-3 text-[13px] font-bold"
        >
          Изменить
        </Link>
      </div>
      <Stagger>
        {card.sources.map((s, i) => (
          <StaggerItem key={i}>
            <div
              className={cn(
                'flex items-center gap-2.5 py-[9px] text-[15px]',
                i > 0 && 'border-t border-line',
              )}
            >
              <span className="min-w-0 flex-1">{s.label}</span>
              <span className="text-right text-[12px] font-bold text-ink-2">{s.src}</span>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      {card.related.length > 0 && (
        <>
          <h2 className="m-0 mt-2 text-[18px] font-bold">Может понадобиться</h2>
          {card.related.map((r) => (
            <Link
              key={r.code}
              href={`/documents/new?type=${r.code}`}
              className="mt-2 flex min-h-[46px] items-center rounded-[14px] bg-surface-2 px-3.5 text-[14px] font-bold"
            >
              <span className="flex-1">{r.title}</span>
              <span aria-hidden>→</span>
            </Link>
          ))}
        </>
      )}
    </>
  );
}

function AnswerDetails({ card, onAsk }: { card: AnswerCard; onAsk: (q: string) => void }) {
  const isSuggest = card.headline === 'Что умею';
  return (
    <>
      <h2 className="m-0 text-[18px] font-bold">{isSuggest ? 'Например' : 'Подробнее'}</h2>
      <Stagger>
        {(card.rows ?? []).map((r, i) => {
          const body = (
            <div
              className={cn(
                'flex min-h-11 items-center gap-2.5 py-2.5 text-[15px] tabular',
                i > 0 && 'border-t border-line',
              )}
            >
              {r.left && <b className="w-[46px]">{r.left}</b>}
              <span className="min-w-0 flex-1">{r.main}</span>
              {r.right && (
                <span
                  className={cn(
                    'text-right text-[12px] font-bold',
                    r.tone === 'danger'
                      ? 'text-danger'
                      : r.tone === 'ok'
                        ? 'text-ok'
                        : r.tone === 'online'
                          ? 'text-online'
                          : 'text-ink-2',
                  )}
                >
                  {r.right}
                </span>
              )}
              {(r.href || isSuggest) && (
                <span aria-hidden className="text-ink-2">
                  ›
                </span>
              )}
            </div>
          );
          return (
            <StaggerItem key={i}>
              {isSuggest ? (
                <button type="button" className="block w-full text-left" onClick={() => onAsk(r.main)}>
                  {body}
                </button>
              ) : r.href ? (
                <Link href={r.href}>{body}</Link>
              ) : (
                body
              )}
            </StaggerItem>
          );
        })}
      </Stagger>
      {card.links?.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="mt-2.5 flex min-h-12 items-center rounded-[14px] bg-surface-2 px-3.5 text-[14px] font-bold"
        >
          <span className="flex-1">{l.label}</span>
          <span aria-hidden>→</span>
        </Link>
      ))}
    </>
  );
}

function Thinking({ label }: { label: string }) {
  return (
    <div aria-live="polite">
      <h2 className="m-0 text-[18px] font-bold">Думаю</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="relative overflow-hidden rounded-[11px] bg-surface-2 px-3 py-2 text-[13px] font-bold">
          {label}…
          <span
            className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent"
            aria-hidden
          />
        </span>
      </div>
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <>
      <h2 className="m-0 text-[18px] font-bold">Можно спросить</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGEST.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="min-h-11 rounded-[12px] bg-surface-2 px-3.5 text-left text-[14px] font-bold transition-transform active:scale-[.97]"
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}

function Earlier({ turns }: { turns: Turn[] }) {
  return (
    <section className="mt-6">
      <h2 className="m-0 text-[12px] font-bold tracking-[.04em] text-ink-2 uppercase">Раньше в разговоре</h2>
      {[...turns].reverse().map((t) => (
        <div key={t.id} className="border-t border-line py-2.5 text-[14px] first-of-type:border-t-0">
          <b>«{t.q}»</b>
          <div className="mt-0.5 text-ink-2">{t.text || t.error}</div>
        </div>
      ))}
    </section>
  );
}
