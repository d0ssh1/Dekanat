import Link from 'next/link';
import { requireStaff } from '@/server/auth/guards';
import { listQueue } from '@/server/services/staff';
import { STATUS_WORD } from '@/lib/requests';
import { dayMonth, dayOf, hhmm } from '@/lib/time';
import { cn } from '@/lib/cn';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

export const metadata = { title: 'Заявки — сотрудник' };

const TABS = [
  { key: 'sent', label: 'Новые', statuses: ['sent'] },
  { key: 'in_progress', label: 'В работе', statuses: ['in_progress'] },
  { key: 'need_action', label: 'Ждут документ', statuses: ['need_action'] },
  { key: 'ready', label: 'Готовы к выдаче', statuses: ['ready'] },
  { key: 'closed', label: 'Закрытые', statuses: ['issued', 'rejected', 'cancelled'] },
] as const;

/** Очередь заявок методиста. Новая заявка студента появляется здесь сама (реальное время). */
export default async function StaffQueue({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const all = await listQueue(viewer);
  // Без выбранной вкладки открываем первую непустую — методист сразу видит, что разбирать.
  const firstBusy = TABS.find((t) => all.some((r) => (t.statuses as readonly string[]).includes(r.status)));
  const tab = TABS.find((t) => t.key === sp.tab) ?? firstBusy ?? TABS[0];
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, all.filter((r) => (t.statuses as readonly string[]).includes(r.status)).length]),
  );
  const rows = all.filter((r) => (tab.statuses as readonly string[]).includes(r.status));

  return (
    <>
      <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">Заявки студентов</h1>
      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/staff?tab=${t.key}`}
            role="tab"
            aria-selected={t.key === tab.key}
            className={cn(
              'flex h-11 items-center gap-2 rounded-[13px] px-3.5 text-[14px] font-bold',
              t.key === tab.key ? 'bg-ink-desk text-surface' : 'bg-surface',
            )}
          >
            {t.label}
            <span
              className={cn(
                'rounded-full px-2 text-[12px]',
                t.key === tab.key ? 'bg-surface/20' : 'bg-desk-chip',
                t.key === 'sent' && counts[t.key] ? 'bg-accent-desk text-ink-desk' : '',
              )}
            >
              {counts[t.key]}
            </span>
          </Link>
        ))}
      </div>
      <section className="mt-3.5 rounded-[24px] bg-surface px-5 py-2">
        {rows.length === 0 && (
          <p className="m-0 py-6 text-center text-[15px] text-ink-2">Здесь пусто — всё разобрано.</p>
        )}
        <Stagger>
          {rows.map((r, i) => (
            <StaggerItem key={r.id}>
              <Link
                href={`/staff/requests/${r.id}`}
                className={cn(
                  'flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-[15px] hover:bg-desk-chip/50',
                  i > 0 && 'border-t border-desk-line',
                )}
              >
                <b className="w-14 tabular">№{r.number}</b>
                <span className="min-w-[200px] flex-1">
                  <b>{r.title}</b>
                  <span className="block text-[13px] text-ink-2">
                    {r.student} · {r.group}
                  </span>
                </span>
                <span className="text-[13px] font-bold text-ink-2">{STATUS_WORD[r.status]}</span>
                <span className="w-32 text-right text-[13px] text-ink-2 tabular">
                  {dayMonth(dayOf(r.updatedAt))}, {hhmm(r.updatedAt)}
                </span>
                <span aria-hidden className="text-[18px] font-bold text-ink-2">
                  ›
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
