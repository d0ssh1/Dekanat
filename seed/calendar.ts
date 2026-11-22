/** Работа с датами в часовом поясе вуза для сида. */
import { TZDate } from '@date-fns/tz';
import { UNIVERSITY, slotTimes } from '../src/lib/university';

const TZ = UNIVERSITY.timeZone;

/** 'YYYY-MM-DD' + 'HH:MM' по времени вуза → момент времени. */
export function at(day: string, hhmm: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [h, mi] = hhmm.split(':').map(Number) as [number, number];
  return new Date(new TZDate(y, m - 1, d, h, mi, 0, TZ).getTime());
}

export function slotRange(day: string, slot: number) {
  const s = slotTimes(slot);
  return { startsAt: at(day, s.start), endsAt: at(day, s.end) };
}

/** Сдвиг календарной даты (без часовых поясов). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** День недели: 1 — пн … 7 — вс. */
export function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Сегодняшняя дата в поясе вуза. */
export function todayLocal(now = new Date()): string {
  const z = new TZDate(now.getTime(), TZ);
  const mm = String(z.getMonth() + 1).padStart(2, '0');
  const dd = String(z.getDate()).padStart(2, '0');
  return `${z.getFullYear()}-${mm}-${dd}`;
}

/**
 * Понедельник «текущей учебной недели»: в выходные это уже следующая неделя.
 * Вокруг него сид расставляет переносы и замены, чтобы они всегда были рядом с «сейчас».
 */
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
