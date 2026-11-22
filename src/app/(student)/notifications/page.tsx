import { requireStudent } from '@/server/auth/guards';
import { listNotifications } from '@/server/dal/notifications';
import { dayOf } from '@/lib/time';
import { HeroRing, PhoneSheet, PhoneSubTop } from '@/components/shell/PhoneTop';
import { DeskCard } from '@/components/ui/desk';
import { IconTile, type TileTone } from '@/components/ui/primitives';
import type { IconName } from '@/components/ui/Icon';
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
  // Сводка — человеческой фразой по типам событий, а не склейкой заголовков.
  const parts: string[] = [];
  if (fresh.some((n) => n.kind === 'change')) parts.push('изменения в расписании');
  if (fresh.some((n) => n.kind === 'document' && /готова/.test(n.title))) parts.push('справка готова');
  if (fresh.some((n) => n.kind === 'document' && /нужен|не забудьте/i.test(n.title)))
    parts.push('деканат ждёт документ');
  if (fresh.some((n) => n.kind === 'deadline')) parts.push('скоро сроки');
  const news = fresh.filter((n) => n.kind === 'news');
  if (news.length) parts.push(news.length === 1 ? news[0]!.title.toLowerCase() : 'новости деканата');
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} и ${parts.at(-1)}` : (parts[0] ?? '');
  const summary = fresh.length
    ? joined.charAt(0).toUpperCase() + joined.slice(1)
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
        {/* Левая колонка прилипает при прокрутке длинного списка; правая тянется хотя бы до её высоты. */}
        <div className="grid grid-cols-[1fr_1.6fr] gap-3.5">
          <div className="sticky top-4 flex flex-col gap-3.5 self-start">
            <DeskCard tone="accent" className="p-[26px]">
              <span
                aria-hidden
                className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
              />
              <div className="relative text-[14px] font-bold">Новых</div>
              <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em]">
                <Odometer value={fresh.length} />
              </div>
              <div className="relative mt-3 text-[15px] leading-[1.45] font-semibold">{summary}</div>
              {fresh.length > 0 && (
                <ReadAllButton className="relative mt-4 self-start bg-ink-desk text-surface" />
              )}
            </DeskCard>
            <section className="rounded-[24px] bg-surface px-6 py-4">
              <h2 className="m-0 mb-1 text-[16px] font-bold">Что сюда приходит</h2>
              {[
                ['calendar', 'hero', 'Расписание', 'переносы, замены аудиторий, отмены'],
                ['doc', 'ok', 'Документы', 'статусы заявок и готовые справки'],
                ['clock', 'neutral', 'Сроки', 'контрольные и документы — за 2 дня'],
                ['megaphone', 'neutral', 'Деканат', 'объявления дирекции'],
              ].map(([icon, tone, t, d], i) => (
                <div
                  key={t}
                  className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-desk-line' : ''}`}
                >
                  <IconTile icon={icon as IconName} tone={tone as TileTone} />
                  <div className="text-[14px]">
                    <b>{t}</b>
                    <div className="text-[13px] text-ink-2">{d}</div>
                  </div>
                </div>
              ))}
            </section>
          </div>
          <section className="flex flex-col rounded-[24px] bg-surface px-6 py-4">
            <NoticeList items={items} today={today} variant="desk" />
            <div className="mt-auto flex items-center gap-3 border-t border-desk-line pt-4 text-[13px] text-ink-2">
              <IconTile icon="bell" tone="neutral" />
              <span>
                Новое появляется здесь сразу — страницу обновлять не нужно. О сроках напомним за 2 дня.
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
