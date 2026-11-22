/**
 * Небольшие статичные примитивы из макетов. Серверные компоненты — без JS в браузере.
 */
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

// ---------- Квадрат с иконкой (списки заявок, уведомлений, «По делам») ----------
const TILE = {
  hero: 'bg-hero-wash text-ink',
  ok: 'bg-ok-wash text-ok',
  danger: 'bg-danger-wash text-danger',
  neutral: 'bg-surface-2 text-ink',
  desk: 'bg-desk-chip text-ink-desk',
  online: 'bg-online-wash text-online',
} as const;
export type TileTone = keyof typeof TILE;

export function IconTile({
  icon,
  tone = 'neutral',
  size = 32,
  className,
}: {
  icon: IconName;
  tone?: TileTone;
  size?: 28 | 32 | 36 | 40;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center', TILE[tone], className)}
      style={{ width: size, height: size, borderRadius: size >= 32 ? 11 : 9 }}
    >
      <Icon name={icon} size={size >= 32 ? 18 : 15} />
    </span>
  );
}

// ---------- Статус словами ----------
const STATUS = {
  muted: 'text-ink-2',
  ink: 'text-ink',
  ok: 'text-ok',
  danger: 'text-danger',
  online: 'text-online',
  hero: 'text-hero-ink',
} as const;
export type StatusTone = keyof typeof STATUS;

export function StatusText({
  tone = 'muted',
  strong,
  className,
  children,
}: {
  tone?: StatusTone;
  strong?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'text-[13px] whitespace-nowrap tabular',
        strong ? 'font-extrabold' : 'font-bold',
        STATUS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------- Заголовок секции на «простыне» телефона (.sh) ----------
export function SectionHead({
  title,
  link,
  as: As = 'h2',
}: {
  title: string;
  link?: { href: string; label: string };
  as?: 'h2' | 'h3';
}) {
  return (
    <div className="flex items-center justify-between">
      <As className="m-0 text-[18px] font-bold">{title}</As>
      {link && (
        <Link href={link.href} className="py-3 text-[13px] font-bold">
          {link.label}
        </Link>
      )}
    </div>
  );
}

// ---------- Строка списка на телефоне (.row) ----------
export function Row({
  children,
  className,
  current,
  first,
}: {
  children: React.ReactNode;
  className?: string;
  /** Текущая/ближайшая пара: тёплая подложка и оранжевая полоса слева. */
  current?: boolean;
  /** Первая строка списка или строка сразу после текущей — без разделителя. */
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-t border-line py-2.5 text-[15px] tabular',
        first && 'border-t-0',
        current &&
          '-mx-2.5 my-0.5 rounded-[12px] border-t-transparent bg-hero-wash px-2.5 shadow-[inset_4px_0_0_var(--hero)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------- Ссылка-плашка (.lnk) ----------
export function LinkRow({
  href,
  icon,
  tone = 'hero',
  title,
  hint,
  className,
}: {
  href: string;
  icon?: IconName;
  tone?: TileTone;
  title: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 text-[14px] font-semibold transition-colors hover:bg-line',
        icon && 'pl-2',
        className,
      )}
    >
      {icon && <IconTile icon={icon} tone={tone} />}
      <b className="font-bold">{title}</b>
      <span className="min-w-0 flex-1 truncate text-ink-2">{hint}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

// ---------- Аватар с инициалами ----------
export function Avatar({
  initials,
  variant = 'phone',
  color,
}: {
  initials: string;
  variant?: 'phone' | 'desk';
  color?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-extrabold',
        variant === 'phone' ? 'size-11 bg-surface text-[13px]' : 'size-12 bg-avatar text-[15px]',
      )}
      style={color ? { background: color } : undefined}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// ---------- Подпись-дисклеймер ----------
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('m-0 text-[12px] leading-snug font-medium text-ink-2', className)}>
      Концепт для конкурса «Цифровой деканат будущего».
      <br />
      Не официальный сервис вуза. Все данные вымышлены.
    </p>
  );
}

// ---------- Логотип-слово ----------
export function Wordmark({
  variant = 'phone',
  className,
}: {
  variant?: 'phone' | 'desk';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-black tracking-[-0.03em]',
        variant === 'phone' ? 'text-[17px] font-bold tracking-normal' : 'text-[20px]',
        className,
      )}
    >
      деканат{variant === 'desk' && <span className="text-accent-desk">*</span>}
    </span>
  );
}
