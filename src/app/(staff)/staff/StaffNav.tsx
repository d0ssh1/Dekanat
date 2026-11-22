'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { SlidingPill } from '@/components/motion/SlidingPill';

const ITEMS = [
  { href: '/staff', label: 'Заявки' },
  { href: '/staff/schedule', label: 'Расписание' },
  { href: '/staff/announce', label: 'Объявления' },
];

export function StaffNav() {
  const path = usePathname();
  return (
    <nav aria-label="Разделы сотрудника" className="flex gap-0.5 rounded-[16px] bg-surface p-[3px]">
      {ITEMS.map((i) => {
        const on =
          i.href === '/staff'
            ? path === '/staff' || path.startsWith('/staff/requests')
            : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'relative isolate flex h-[42px] items-center rounded-[13px] px-3.5 text-[14px]',
              on ? 'font-bold text-surface' : 'font-semibold text-ink-2',
            )}
          >
            {on && <SlidingPill id="staff-nav" className="rounded-[13px] bg-ink-desk" />}
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
