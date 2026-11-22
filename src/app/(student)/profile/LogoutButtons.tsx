import { logoutAction, logoutEverywhereAction } from '@/app/(auth)/login/actions';
import { cn } from '@/lib/cn';

/** «Выйти» и «Выйти на всех устройствах» — обычные формы: работают даже без JavaScript. */
export function LogoutButtons({ variant = 'phone' }: { variant?: 'phone' | 'desk' }) {
  const line = variant === 'phone' ? 'border-line' : 'border-desk-line';
  return (
    <div className={cn('flex flex-wrap gap-2 border-t pt-3', line)}>
      <form action={logoutEverywhereAction}>
        <button
          type="submit"
          className={cn(
            'h-11 rounded-[13px] px-4 text-[14px] font-bold transition-colors',
            variant === 'phone' ? 'bg-surface-2 hover:bg-line' : 'bg-desk-chip hover:bg-desk-muted',
          )}
        >
          Выйти на всех устройствах
        </button>
      </form>
      <form action={logoutAction}>
        <button
          type="submit"
          className="h-11 rounded-[13px] bg-danger-wash px-5 text-[14px] font-bold text-danger transition-colors hover:brightness-95"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
