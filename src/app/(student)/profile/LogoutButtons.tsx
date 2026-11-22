import { logoutAction, logoutEverywhereAction } from '@/app/(auth)/login/actions';
import { cn } from '@/lib/cn';

/** «Выйти» и «Выйти на всех устройствах» — обычные формы: работают даже без JavaScript. */
export function LogoutButtons({ variant = 'phone' }: { variant?: 'phone' | 'desk' }) {
  const line = variant === 'phone' ? 'border-line' : 'border-desk-line';
  return (
    <div className={cn('flex flex-col border-t', line)}>
      <form action={logoutEverywhereAction}>
        <button type="submit" className="flex min-h-11 w-full items-center py-[11px] text-left text-[15px]">
          Выйти на всех устройствах
        </button>
      </form>
      <form action={logoutAction} className={cn('border-t', line)}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center py-[11px] text-left text-[15px] font-bold text-danger"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
