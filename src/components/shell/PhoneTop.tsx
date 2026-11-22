import { cn } from '@/lib/cn';
import { Avatar, Wordmark } from '@/components/ui/primitives';
import { BellButton } from './BellButton';
import { AskBar } from './AskBar';

/**
 * Оранжевый верх телефонного экрана (.top в макете): строка с логотипом, колокольчиком и аватаром,
 * строка «Помощник» и крупный «герой» экрана (children).
 */
export function PhoneTop({
  unread,
  initials,
  ask = true,
  children,
  className,
}: {
  unread: number;
  initials: string;
  ask?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[22px]', className)}>
      <div className="flex items-center gap-2">
        <Wordmark className="flex-1" />
        <BellButton count={unread} />
        <Avatar initials={initials} />
      </div>
      {ask && <AskBar className="mt-3.5" />}
      {children}
    </div>
  );
}

/** Медленно «дышащее» кольцо в правом верхнем углу оранжевого фона. */
export function HeroRing({ variant = 'phone' }: { variant?: 'phone' | 'desk' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute animate-breathe rounded-full border-glass-16',
        variant === 'phone'
          ? 'top-[-110px] right-[-130px] size-[340px] border-[54px]'
          : 'top-[-90px] right-[-80px] size-[240px] border-0 bg-glass-20',
      )}
    />
  );
}

/** Белая «простыня» под оранжевым верхом. */
export function PhoneSheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'relative flex flex-1 flex-col rounded-t-[28px] bg-surface px-[18px] pt-4 pb-4 shadow-sheet',
        className,
      )}
    >
      {children}
    </section>
  );
}
