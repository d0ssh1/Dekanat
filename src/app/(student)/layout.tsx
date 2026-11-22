import { requireStudent } from '@/server/auth/guards';
import { getShell } from '@/server/dal/me';
import { getPrefs } from '@/server/dal/prefs';
import { DeskHeader } from '@/components/shell/DeskHeader';
import { TabBar } from '@/components/shell/TabBar';
import { LiveEvents } from '@/components/shell/LiveEvents';
import { NetworkStatus } from '@/components/shell/NetworkStatus';
import { ServiceWorker } from '@/components/shell/ServiceWorker';

/**
 * Каркас кабинета студента. Проверка сессии — здесь и ещё раз в каждой функции DAL.
 * Телефон (< 1024): страница рисует свой оранжевый верх, внизу таб-бар.
 * Компьютер: общая шапка B2Next, серый фон, контент по центру до 1280 px.
 */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStudent();
  const [shell, prefs] = await Promise.all([getShell(viewer), getPrefs(viewer)]);
  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-clip bg-[linear-gradient(var(--hero)_0_45%,var(--surface)_45%)] lg:bg-desk-bg lg:bg-none"
      style={{ ['--hero' as string]: prefs.heroColor }}
    >
      <div className="mx-auto hidden w-full max-w-[1280px] px-7 pt-5 lg:block">
        <DeskHeader unread={shell.unread} initials={shell.initials} avatarColor={shell.avatarColor} />
      </div>
      <main
        id="main"
        className="flex flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[1280px] lg:px-7 lg:pt-[18px] lg:pb-10"
      >
        {children}
      </main>
      <TabBar className="lg:hidden" />
      <LiveEvents />
      <NetworkStatus />
      <ServiceWorker />
    </div>
  );
}
