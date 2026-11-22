import { requireStaff } from '@/server/auth/guards';
import { getStaffName } from '@/server/dal/me';
import { Wordmark, Disclaimer } from '@/components/ui/primitives';
import { LogoutButtons } from '@/app/(student)/profile/LogoutButtons';

export const metadata = { title: 'Кабинет сотрудника' };

/** Кабинет методиста. Очередь заявок и перенос пар появятся в фазе 7. */
export default async function StaffPage() {
  const viewer = await requireStaff();
  const me = await getStaffName(viewer);
  return (
    <main className="mx-auto min-h-dvh max-w-[1280px] px-4 py-6 lg:px-7">
      <Wordmark variant="desk" />
      <h1 className="m-0 mt-8 text-[36px] font-black tracking-[-0.03em]">
        {me.first} {me.middle}, здравствуйте
      </h1>
      <p className="m-0 mt-1 text-[15px] text-ink-2">{me.position}</p>
      <section className="mt-6 max-w-[560px] rounded-[24px] bg-surface p-6">
        <p className="m-0 text-[15px]">Очередь заявок, перенос пар и объявления появятся в фазе 7.</p>
        <div className="mt-4">
          <LogoutButtons variant="desk" />
        </div>
      </section>
      <Disclaimer className="mt-6" />
    </main>
  );
}
