/**
 * Примитивы компьютерной версии (B2Next): карточки пар, блоки главной, строки блоков.
 */
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

const CARD = {
  muted: 'bg-desk-muted',
  accent: 'bg-accent-desk shadow-accent',
  online: 'bg-online-wash',
  moved: 'bg-surface border-[1.5px] border-dashed border-ink-4',
  white: 'bg-surface',
} as const;
export type CardTone = keyof typeof CARD;

/** Карточка пары/события (.card): радиус 28, отступ 20. */
export function DeskCard({
  tone = 'white',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { tone?: CardTone }) {
  return (
    <article
      className={cn(
        'relative flex flex-col gap-1.5 overflow-hidden rounded-[28px] p-5',
        CARD[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </article>
  );
}

/** Блок главной (.blk) с ручкой перетаскивания, заголовком, ссылкой и меню «···». */
export function DeskBlock({
  title,
  link,
  children,
  className,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={`Блок «${title}»`}
      className={cn(
        'relative flex min-w-0 flex-col rounded-[24px] bg-surface px-[18px] pt-3 pb-4',
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          aria-hidden
          className="-ml-2 flex size-8 cursor-grab items-center justify-center rounded-[10px] text-ink-3"
        >
          <Icon name="grip" size={18} />
        </span>
        <h2 className="m-0 flex-1 text-[16px] font-bold">{title}</h2>
        {link && (
          <Link
            href={link.href}
            className="px-1.5 py-2.5 text-[13px] font-bold text-ink-2 hover:text-ink-desk"
          >
            {link.label}
          </Link>
        )}
        <button
          type="button"
          aria-label={`Настройки блока «${title}»`}
          className="flex size-9 items-center justify-center rounded-[11px] bg-desk-chip text-ink-desk"
        >
          <Icon name="more" size={18} />
        </button>
      </div>
      {children}
    </section>
  );
}

/** Строка внутри блока (.r). */
export function DeskRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2.5 border-t border-desk-line py-[11px] text-[15px]', className)}
    >
      {children}
    </div>
  );
}

/** Значение справа в строке блока (.w). */
export function DeskValue({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'ink' | 'danger';
}) {
  return (
    <span
      className={cn(
        'text-[13px] font-bold whitespace-nowrap',
        tone === 'muted' && 'text-ink-2',
        tone === 'ink' && 'text-ink-desk',
        tone === 'danger' && 'text-danger',
      )}
    >
      {children}
    </span>
  );
}
