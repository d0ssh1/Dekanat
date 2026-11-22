import { requireStudent } from '@/server/auth/guards';
import { listNotifications } from '@/server/dal/notifications';
import { dayOf, plural } from '@/lib/time';
import { HeroRing, PhoneSheet, PhoneSubTop } from '@/components/shell/PhoneTop';
import { DeskCard } from '@/components/ui/desk';
import { Odometer } from '@/components/motion/Odometer';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { NoticeList, ReadAllButton } from '@/components/features/notifications/NoticeList';

export const metadata = { title: 'Уведомления' };

/** Уведомления (макет B2Core1): открываются из колокольчика, нажатие ведёт к самой паре или заявке. */
export default async function NotificationsPage() {
  const viewer = await requireStudent();
  const items = await listNotifications(viewer);
  const today = dayOf(new Date());
  const fresh = items.filter((n) => !n.read);
  const summary = fresh.length
    ? fresh
        .slice(0, 3)
        .map((n) => n.title.charAt(0).toLowerCase() + n.title.slice(1))
        .join(', ')
        .replace(/^./, (c) => c.toUpperCase())
    : 'Всё прочитано — новое придёт сюда и всплывёт подсказкой';

  return (
    <>
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <PhoneSubTop title="Уведомления" action={fresh.length ? <ReadAllButton /> : undefined}>
          <Stagger delay={0.04}>
            <StaggerItem className="mt-5 text-[15px] font-bold">Новых</StaggerItem>
            <StaggerItem className="mt-1 text-[104px] leading-[.88] font-black tracking-[-0.06em]">
              <Odometer value={fresh.length} />
            </StaggerItem>
            <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">{summary}</StaggerItem>
          </Stagger>
        </PhoneSubTop>
        <PhoneSheet className="pt-[18px]">
          <NoticeList items={items} today={today} />
          <div className="h-4" />
        </PhoneSheet>
      </div>

      <div className="hidden lg:block">
        <h1 className="m-0 mb-[18px] text-[36px] font-black tracking-[-0.03em]">Уведомления</h1>
        <div className="grid grid-cols-[1fr_1.6fr] items-start gap-3.5">
          <DeskCard tone="accent" className="min-h-[260px] p-[26px]">
            <span
              aria-hidden
              className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
            />
            <div className="relative text-[14px] font-bold">Новых</div>
            <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em]">
              <Odometer value={fresh.length} />
            </div>
            <div className="relative mt-auto text-[15px] leading-[1.45] font-semibold">
              {fresh.length
                ? `${fresh.length} ${plural(fresh.length, 'новое', 'новых', 'новых')}: ${summary.toLowerCase()}`
                : summary}
            </div>
            {fresh.length > 0 && (
              <ReadAllButton className="relative mt-4 self-start bg-ink-desk text-surface" />
            )}
          </DeskCard>
          <section className="rounded-[24px] bg-surface px-6 py-4">
            <NoticeList items={items} today={today} variant="desk" />
          </section>
        </div>
      </div>
    </>
  );
}
