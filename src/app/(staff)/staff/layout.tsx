import { requireStaff } from '@/server/auth/guards';
import { getStaffName } from '@/server/dal/me';
import { Disclaimer, Wordmark } from '@/components/ui/primitives';
import { LiveEvents } from '@/components/shell/LiveEvents';
import { StaffNav } from './StaffNav';
import { logoutAction } from '@/app/(auth)/login/actions';

/** Кабинет методиста: тот же язык B2Next, плотнее. Очередь обновляется в реальном времени. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  const me = await getStaffName(viewer);
  return (
    <div className="min-h-dvh bg-desk-bg text-ink-desk">
      <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-10 lg:px-7">
        <header className="flex flex-wrap items-center gap-3">
          <Wordmark variant="desk" />
          <span className="rounded-[10px] bg-ink-desk px-2.5 py-1 text-[12px] font-bold text-surface">
            деканат · сотрудник
          </span>
          <StaffNav />
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-[13px] leading-tight">
              <b>
                {me.first[0]}. {me.middle?.[0]}. {me.last}
              </b>
              <div className="text-ink-2">{me.position}</div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-11 rounded-[13px] bg-surface px-3.5 text-[13px] font-bold text-danger"
              >
                Выйти
              </button>
            </form>
          </div>
        </header>
        <main className="mt-6">{children}</main>
        <Disclaimer className="mt-10" />
      </div>
      <LiveEvents />
    </div>
  );
}
