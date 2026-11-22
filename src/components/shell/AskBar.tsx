'use client';

import { useRouter } from 'next/navigation';
import { m } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { spring } from '@/components/motion/tokens';

/**
 * Строка «Помощник» — главный вход в ИИ. Общий элемент `layoutId="ask"`:
 * при переходе к помощнику строка «разворачивается» в панель (фаза 8).
 */
export function AskBar({ variant = 'phone', className }: { variant?: 'phone' | 'desk'; className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const desk = variant === 'desk';

  return (
    <m.form
      layoutId="ask"
      transition={spring.soft}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const text = q.trim();
        router.push(text ? `/assistant?q=${encodeURIComponent(text)}` : '/assistant');
      }}
      className={cn(
        'flex h-12 items-center gap-2.5 pr-3 pl-1.5',
        desk ? 'rounded-[16px] bg-surface pr-3.5' : 'rounded-[15px] bg-glass-92',
        className,
      )}
    >
      <label
        htmlFor={`ask-${variant}`}
        className={cn(
          'flex h-9 shrink-0 items-center gap-1.5 bg-ink text-[13px] font-bold whitespace-nowrap text-surface',
          desk ? 'rounded-[12px] px-3' : 'rounded-[11px] px-2.5',
        )}
      >
        {desk && <Icon name="chat" size={16} stroke={2.2} />}
        Помощник
      </label>
      <input
        id={`ask-${variant}`}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        enterKeyHint="send"
        autoComplete="off"
        placeholder={desk ? 'опишите, что нужно — оформлю' : 'что нужно?'}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-ink-2',
          desk ? 'text-[14px]' : 'text-[15px]',
        )}
      />
    </m.form>
  );
}
