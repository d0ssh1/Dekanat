import { requireStudent } from '@/server/auth/guards';
import { resolveNow } from '@/server/clock';
import { getWeek } from '@/server/dal/schedule';
import { getActiveRequests, getStudyAlerts } from '@/server/dal/todo';
import { addDays, at, dayOf, isValidDay, mondayOf, wdShort } from '@/lib/time';
import { changeNotes, weekLabel, weekNumber, weekSummary, type WeekNote } from '@/lib/week';
import { PhoneWeek, DeskWeek } from '@/components/features/schedule/WeekViews';

export const metadata = { title: 'Неделя' };

/** Неделя (макеты B2Core2 «Неделя» — телефон, B2WeekNext — компьютер). */
export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; now?: string }>;
}) {
  const viewer = await requireStudent();
  const sp = await searchParams;
  const now = resolveNow(sp.now);
  const today = dayOf(now);
  const monday = mondayOf(isValidDay(sp.w) ? sp.w : today);
  const weekStart = at(monday, '00:00');
  const weekEnd = at(addDays(monday, 7), '00:00');

  const from = now > weekStart ? now : weekStart;
  const horizon = Math.max(0, Math.ceil((weekEnd.getTime() - from.getTime()) / 86400_000));
  const [lessons, alerts, requests] = await Promise.all([
    getWeek(viewer, monday),
    horizon > 0 ? getStudyAlerts(viewer, from, horizon) : Promise.resolve([]),
    getActiveRequests(viewer),
  ]);

  const notes: WeekNote[] = [...changeNotes(lessons)];
  const dues = alerts.filter((a) => a.kind === 'due' && Date.parse(a.dueAt) < weekEnd.getTime());
  for (const a of dues)
    if (a.kind === 'due')
      notes.push({
        key: `d${a.courseId}${a.title}`,
        tone: 'hero',
        mark: '◷',
        strong: `${a.short} · ${a.title}`,
        text: ` — ${wdShort(dayOf(a.dueAt))}`,
        href: `/study/${a.courseId}`,
      });
  for (const a of alerts)
    if (a.kind === 'admission')
      notes.push({
        key: `a${a.courseId}`,
        tone: 'danger',
        mark: '!',
        strong: `Допуск по ${a.short}`,
        text: ` — не хватает ${a.threshold - a.points}`,
        href: `/study/${a.courseId}`,
      });
  for (const r of requests) {
    if (r.status === 'ready')
      notes.push({
        key: r.id,
        tone: 'ok',
        mark: '✓',
        strong: `${r.title} №${r.number}`,
        text: ' готова',
        href: `/documents/${r.id}`,
      });
    if (r.status === 'in_progress' && r.etaTo && r.etaTo >= monday && r.etaTo < addDays(monday, 7))
      notes.push({
        key: r.id,
        tone: 'ok',
        mark: '✓',
        strong: r.title,
        text: ` будет готова в ${wdShort(r.etaTo)}`,
        href: `/documents/${r.id}`,
      });
  }

  const kt = dues.find((a) => a.kind === 'due' && /КТ|Контрольная/.test(a.title));
  const summary = weekSummary(
    lessons,
    monday,
    kt && kt.kind === 'due' ? [`КТ (${kt.short}) — ${wdShort(dayOf(kt.dueAt))}`] : [],
  );
  const common = {
    monday,
    today,
    label: weekLabel(monday),
    weekNo: weekNumber(monday),
    lessons,
    notes,
    summary,
    serverNow: now.getTime(),
  };

  return (
    <>
      <div className="flex flex-1 flex-col lg:hidden">
        <PhoneWeek {...common} />
      </div>
      <div className="hidden lg:block">
        <DeskWeek {...common} calendarHref={`/api/calendar?w=${monday}`} />
      </div>
    </>
  );
}
