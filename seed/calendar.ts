/** Даты для сида — общий модуль времени вуза (src/lib/time.ts) плюс пара помощников. */
import { slotTimes } from '../src/lib/university';
import { addDays, at, dayOf, weekday } from '../src/lib/time';

export { addDays, at, weekday };

export function slotRange(day: string, slot: number) {
  const s = slotTimes(slot);
  return { startsAt: at(day, s.start), endsAt: at(day, s.end) };
}

export function todayLocal(now = new Date()): string {
  return dayOf(now);
}

/** Понедельник «текущей учебной недели»: в выходные это уже следующая неделя. */
export function anchorMonday(now = new Date()): string {
  const today = todayLocal(now);
  const w = weekday(today);
  if (w === 6) return addDays(today, 2);
  if (w === 7) return addDays(today, 1);
  return addDays(today, -(w - 1));
}

export function hoursAgo(h: number, now = new Date()): Date {
  return new Date(now.getTime() - h * 3600_000);
}
