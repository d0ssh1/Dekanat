import 'server-only';
import type { Viewer } from '@/server/auth/guards';
import { getPrefs } from '@/server/dal/prefs';
import { addDays, at, dayOf, weekday } from '@/lib/time';

/**
 * «Сейчас» для страниц.
 * - В разработке и CI (ALLOW_TIME_OVERRIDE=1) можно подменить через ?now=… — чтобы проверить экран в любой момент.
 * - Для жюри — «демо-время» в профиле: кабинет открывают в случайное время (вечер, воскресенье),
 *   а с демо-временем всегда виден живой учебный день — ближайший будний день, 10:00 + сколько прошло минут.
 *   Данные не меняются, сдвигается только «сейчас» для этого пользователя.
 */
export function resolveNow(param: unknown): Date {
  const allowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TIME_OVERRIDE === '1';
  if (allowed && typeof param === 'string') {
    const t = Date.parse(param);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return new Date();
}

export function demoNow(real = new Date()): Date {
  let d = dayOf(real);
  while (weekday(d) > 5) d = addDays(d, 1);
  // Минуты текущего часа сохраняем — отсчёт «живой», но всегда внутри учебного утра.
  return new Date(at(d, '09:58').getTime() + (real.getMinutes() % 10) * 60_000 + real.getSeconds() * 1000);
}

export async function nowFor(viewer: Viewer, param: unknown): Promise<Date> {
  const allowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TIME_OVERRIDE === '1';
  if (allowed && typeof param === 'string' && !Number.isNaN(Date.parse(param)))
    return new Date(Date.parse(param));
  const prefs = await getPrefs(viewer);
  return prefs.demoClock ? demoNow() : new Date();
}
