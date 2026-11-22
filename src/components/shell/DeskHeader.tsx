'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Avatar, Wordmark } from '@/components/ui/primitives';
import { SlidingPill } from '@/components/motion/SlidingPill';
import { AskBar } from './AskBar';
import { BellButton } from './BellButton';
import { NAV, isActive } from './TabBar';

/** Шапка компьютерной версии (B2Next): логотип, «Помощник», разделы, колокольчик, аватар. */
export function DeskHeader({
  unread,
  initials,
  avatarColor,
  activeHref,
}: {
  unread: number;
  initials: string;
  avatarColor?: string;
  /** Для демо и тестов: какой раздел считать активным. */
  activeHref?: string;
}) {
  const current = usePathname();
  const pathname = activeHref ?? current;
  return (
    <header className="flex items-center gap-3.5">
      <Link href="/" className="mr-1" aria-label="деканат — на главную">
        <Wordmark variant="desk" />
      </Link>
      <AskBar variant="desk" className="flex-1" />
      <nav aria-label="Разделы" className="flex gap-0.5 rounded-[16px] bg-surface p-[3px]">
        {NAV.map((n) => {
          const on = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'relative isolate flex h-[42px] items-center rounded-[13px] px-3.5 text-[14px] transition-colors',
                on ? 'font-bold text-surface' : 'font-semibold text-ink-2 hover:text-ink-desk',
              )}
            >
              {on && <SlidingPill id="desk-nav" className="rounded-[13px] bg-ink-desk" />}
              {n.deskLabel}
            </Link>
          );
        })}
      </nav>
      <BellButton count={unread} variant="desk" />
      <Link href="/profile" aria-label="Профиль">
        <Avatar initials={initials} variant="desk" color={avatarColor} />
      </Link>
    </header>
  );
}
