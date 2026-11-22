import { requireStudent } from '@/server/auth/guards';
import { resolveNow } from '@/server/clock';
import { getShell } from '@/server/dal/me';
import { getDay, getNextLesson, getWeek } from '@/server/dal/schedule';
import { getActiveRequests, getStudyAlerts } from '@/server/dal/todo';
import { addDays, dayOf, isValidDay, mondayOf } from '@/lib/time';
import { isActive } from '@/lib/day';
import { buildTodos, requestLine } from '@/lib/todo';
import { PhoneToday } from '@/components/features/schedule/PhoneToday';
import { DeskToday } from '@/components/features/schedule/DeskToday';

export const metadata = { title: 'Сегодня' };

/**
 * Главная (макеты B2PhoneA, B2Next, B2Busy, B2PhoneB «Выходной»).
 * Телефон всегда показывает сегодня; на компьютере полоса дней переключает день (?day=).
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; now?: string }>;
}) {
  const viewer = await requireStudent();
  const sp = await searchParams;
  const now = resolveNow(sp.now);
  const today = dayOf(now);
  const day = isValidDay(sp.day) ? sp.day : today;
  const monday = mondayOf(day);

  const [shell, todayLessons, weekLessons, next, requests, alerts] = await Promise.all([
    getShell(viewer),
    getDay(viewer, today),
    getWeek(viewer, monday),
    getNextLesson(viewer, now, today),
    getActiveRequests(viewer),
    getStudyAlerts(viewer, now, 7),
  ]);
  const dayLessons = day === today ? todayLessons : weekLessons.filter((l) => dayOf(l.startsAt) === day);

  // Следующий учебный день после выбранного — для блока «Завтра».
  let after: { day: string; lessons: typeof todayLessons } | null = null;
  for (let i = 1; i <= 7 && !after; i++) {
    const d = addDays(day, i);
    const ls = (await getDay(viewer, d)).filter(isActive);
    if (ls.length) after = { day: d, lessons: ls };
  }

  const todos = buildTodos(requests, alerts, today);
  const week = Array.from({ length: 6 }, (_, i) => {
    const d = addDays(monday, i);
    return { day: d, count: weekLessons.filter((l) => dayOf(l.startsAt) === d && isActive(l)).length };
  });
  const docs = requests.map((r) => ({
    id: r.id,
    title: r.status === 'ready' ? `${r.title} №${r.number}` : r.title,
    ...requestLine(r, today),
  }));
  const study = todos.filter((t) => t.key.startsWith('a') || t.key.startsWith('d'));

  return (
    <>
      <div className="flex flex-1 flex-col lg:hidden">
        <PhoneToday
          today={today}
          lessons={todayLessons}
          next={next}
          todos={todos}
          unread={shell.unread}
          initials={shell.initials}
          serverNow={now.getTime()}
        />
      </div>
      <div className="hidden lg:block">
        <DeskToday
          day={day}
          today={today}
          week={week}
          lessons={dayLessons}
          docs={docs}
          study={study}
          after={after}
          serverNow={now.getTime()}
        />
      </div>
    </>
  );
}
