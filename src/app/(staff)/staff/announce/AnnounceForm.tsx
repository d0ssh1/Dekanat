'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/motion/Toast';
import { announceAction } from '../actions';

export function AnnounceForm({ groups }: { groups: { id: string; short: string }[] }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const toast = useToast();
  const field =
    'w-full rounded-[12px] border-[1.5px] border-field-line bg-surface px-3 text-[15px] outline-none focus:border-ink-desk';
  return (
    <form
      className="mt-4 flex max-w-[640px] flex-col gap-3 rounded-[24px] bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await announceAction({ title, body, groupIds: picked });
          if (r.ok) {
            toast.show({ title: r.message, tone: 'ok' });
            setTitle('');
            setBody('');
          } else toast.show({ title: r.error, tone: 'danger' });
        });
      }}
    >
      <label className="flex flex-col gap-1 text-[13px] font-bold text-ink-2">
        Заголовок
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={80}
          className={cn(field, 'h-11')}
        />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-bold text-ink-2">
        Текст
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={3}
          maxLength={1000}
          rows={4}
          className={cn(field, 'py-2')}
        />
      </label>
      <fieldset className="m-0 border-0 p-0">
        <legend className="text-[13px] font-bold text-ink-2">Кому (ничего не выбрано — всем)</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {groups.map((g) => {
            const on = picked.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== g.id) : [...p, g.id]))}
                className={cn(
                  'h-11 rounded-[11px] px-3 text-[13px] font-bold',
                  on ? 'bg-ink-desk text-surface' : 'bg-desk-chip',
                )}
              >
                {g.short}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" disabled={pending} className="self-start">
        Отправить объявление
      </Button>
    </form>
  );
}
