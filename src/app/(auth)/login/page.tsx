import { redirect } from 'next/navigation';
import { getViewer } from '@/server/auth/guards';
import { HeroRing } from '@/components/shell/PhoneTop';
import { Disclaimer, Wordmark } from '@/components/ui/primitives';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { LoginForm } from './LoginForm';
import { ForgotPassword } from './ForgotPassword';
import { ServiceWorker } from '@/components/shell/ServiceWorker';

export const metadata = { title: 'Вход' };

/**
 * Вход (макет B2Core1 «Вход», ошибка — B2Errors «Сессия истекла»).
 * На телефоне — оранжевый верх и белая «простыня», на компьютере — та же пара карточек рядом.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(viewer.role === 'staff' ? '/staff' : '/');
  const expired = sp.expired === '1';
  const next = typeof sp.next === 'string' ? sp.next : undefined;

  return (
    <main className="min-h-dvh bg-hero lg:grid lg:place-items-center lg:bg-desk-bg lg:p-10">
      <div className="flex min-h-dvh flex-col lg:grid lg:min-h-0 lg:w-full lg:max-w-[980px] lg:grid-cols-[1.1fr_1fr] lg:gap-4">
        <section className="relative overflow-hidden bg-hero px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[30px] lg:rounded-[28px] lg:p-10">
          <HeroRing />
          <div className="relative">
            <Wordmark />
            <Stagger delay={0.05} step={0.07}>
              {expired ? (
                <>
                  <StaggerItem>
                    <h1 className="m-0 mt-10 text-[40px] leading-none font-black tracking-[-0.04em] lg:text-[56px]">
                      Сессия истекла
                    </h1>
                  </StaggerItem>
                  <StaggerItem>
                    <p className="m-0 mt-2.5 text-[14px] leading-[1.45] font-semibold lg:text-[16px]">
                      Вы давно не заходили — так мы защищаем данные. Войдите снова и вернётесь туда, где были.
                    </p>
                  </StaggerItem>
                </>
              ) : (
                <>
                  <StaggerItem>
                    <h1 className="m-0 mt-14 text-[48px] leading-none font-black tracking-[-0.05em] lg:mt-24 lg:text-[64px]">
                      Всё об&nbsp;учёбе&nbsp;—
                      <br />
                      в&nbsp;одном месте
                    </h1>
                  </StaggerItem>
                  <StaggerItem>
                    <p className="m-0 mt-3.5 text-[14px] leading-[1.45] font-semibold lg:max-w-[400px] lg:text-[16px]">
                      Расписание, баллы, справки и деканат. Пишите помощнику, что нужно, — он оформит.
                    </p>
                  </StaggerItem>
                </>
              )}
            </Stagger>
          </div>
        </section>
        <section className="flex flex-1 flex-col rounded-t-[28px] bg-surface px-[18px] pt-[22px] pb-[calc(var(--safe-bottom)+24px)] shadow-sheet lg:rounded-[28px] lg:p-10 lg:shadow-none">
          <h2 className="m-0 text-[18px] font-bold lg:text-[24px] lg:font-black lg:tracking-[-0.02em]">
            Вход
          </h2>
          <LoginForm next={next} />
          <ForgotPassword />
          <Disclaimer className="mt-auto px-1 pt-6 text-center" />
          {/* Выход или смена пользователя: сохранённые для офлайна страницы прошлого входа стираем. */}
          <ServiceWorker clear />
        </section>
      </div>
    </main>
  );
}
