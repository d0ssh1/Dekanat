import { requireStudent } from '@/server/auth/guards';
import { nowFor } from '@/server/clock';
import { getShell } from '@/server/dal/me';
import { getHomeLayout } from '@/server/dal/prefs';
import { getDay, getNextLesson, getWeek } from '@/server/dal/schedule';
import { getActiveRequests, getStudyAlerts } from '@/server/dal/todo';
import { addDays, dayOf, isValidDay, mondayOf, weekday } from '@/lib/time';
import { buildTodos, requestLine } from '@/lib/todo';
import { PhoneToday } from '@/components/features/schedule/PhoneToday';
import { DeskToday } from '@/components/features/schedule/DeskToday';

export const metadata = { title: 'Сегодня' };

/**
 * Главная (макеты B2PhoneA, B2Next, B2Busy, B2PhoneB «Выходной»).
 * Телефон всегда показывает сегодня. На компьютере приходят пары двух недель, и полоса дней
 * переключает день сразу на клиенте; адрес (?day=) обновляется для ссылки и перезагрузки.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; now?: string }>;
}) {
  const viewer = await requireStudent();
  const sp = await searchParams;
  const now = await nowFor(viewer, sp.now);
  const today = dayOf(now);
  // В выходной компьютерная версия сразу открывает следующий учебный день — полоса дней не «висит» на прошлой неделе.
  const nextStudyDay =
    weekday(today) === 6 ? addDays(today, 2) : weekday(today) === 7 ? addDays(today, 1) : today;
  const day = isValidDay(sp.day) ? sp.day : nextStudyDay;
  const monday = mondayOf(day);

  const [shell, todayLessons, weekLessons, nextWeekLessons, next, requests, alerts, layout] =
    await Promise.all([
      getShell(viewer),
      getDay(viewer, today),
      getWeek(viewer, monday),
      getWeek(viewer, addDays(monday, 7)),
      getNextLesson(viewer, now, today),
      getActiveRequests(viewer),
      getStudyAlerts(viewer, now, 7),
      getHomeLayout(viewer),
    ]);
  const todos = buildTodos(requests, alerts, today);
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
          initialDay={day}
          today={today}
          lessons2w={[...weekLessons, ...nextWeekLessons]}
          docs={docs}
          study={study}
          serverNow={now.getTime()}
          layout={layout}
          todos={todos}
        />
      </div>
    </>
  );
}
