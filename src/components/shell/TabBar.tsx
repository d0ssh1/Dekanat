'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { m } from 'motion/react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SlidingPill } from '@/components/motion/SlidingPill';
import { press, spring } from '@/components/motion/tokens';

export const NAV: { href: string; label: string; deskLabel: string; icon: IconName }[] = [
  { href: '/', label: 'Сегодня', deskLabel: 'День', icon: 'home' },
  { href: '/week', label: 'Неделя', deskLabel: 'Неделя', icon: 'calendar' },
  { href: '/study', label: 'Учёба', deskLabel: 'Учёба', icon: 'chart' },
  { href: '/documents', label: 'Документы', deskLabel: 'Документы', icon: 'doc' },
];

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

const MotionLink = m.create(Link);

/** Нижняя навигация телефона: подложка активной вкладки скользит между иконками. */
export function TabBar({ className, activeHref }: { className?: string; activeHref?: string }) {
  const current = usePathname();
  const pathname = activeHref ?? current;
  return (
    <nav
      aria-label="Разделы"
      className={cn(
        'sticky bottom-0 z-20 flex shrink-0 justify-around border-t border-line bg-surface px-2.5 pt-1.5 pb-[calc(var(--safe-bottom)+16px)]',
        className,
      )}
    >
      {NAV.map((n) => {
        const on = isActive(pathname, n.href);
        return (
          <MotionLink
            key={n.href}
            href={n.href}
            whileTap={press}
            transition={spring.snappy}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex min-h-[52px] w-[72px] flex-col items-center justify-center gap-[3px] text-[11px]',
              on ? 'font-extrabold text-ink' : 'font-semibold text-ink-2',
            )}
          >
            <span className="relative isolate flex h-[30px] w-14 items-center justify-center">
              {on && <SlidingPill id="tab-pill" className="rounded-[15px] bg-hero-wash" />}
              <Icon name={n.icon} size={22} stroke={1.9} />
            </span>
            {n.label}
          </MotionLink>
        );
      })}
    </nav>
  );
}
