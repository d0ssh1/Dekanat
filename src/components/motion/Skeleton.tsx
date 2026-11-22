import { cn } from '@/lib/cn';

/** Заглушка в форме будущего содержимого с бегущим блеском (макет B2PhoneB «Загрузка»). */
export function Skeleton({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'glass' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block overflow-hidden rounded-[10px]',
        tone === 'light' ? 'bg-surface-2' : 'bg-glass-20',
        className,
      )}
    >
      <span
        className="absolute inset-0 animate-shimmer"
        style={{
          background:
            tone === 'light'
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)',
        }}
      />
    </span>
  );
}
