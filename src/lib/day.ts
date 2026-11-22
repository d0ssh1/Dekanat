/**
 * Логика «что сейчас» для дня занятий. Чистые функции без сервера: их вызывает и живой отсчёт в браузере.
 */
import type { Lesson } from '@/server/dal/schedule';
import { addDays, dayOf, diffDays, hhmm, plural, relativeIn, shortDate, wdShort } from './time';

export type { Lesson };

/** Занятие реально проходит (не перенесено и не отменено). */
export const isActive = (l: Lesson) => l.status === 'scheduled';

export type Phase = 'past' | 'current' | 'next' | 'later';

/** Фокус дня: идущая пара или ближайшая будущая. */
export function focusOf(lessons: Lesson[], now: number) {
  const act = lessons.filter(isActive);
  const current = act.find((l) => Date.parse(l.startsAt) <= now && now < Date.parse(l.endsAt));
  if (current) return { lesson: current, mode: 'current' as const };
  const next = act.find((l) => Date.parse(l.startsAt) > now);
  if (next) return { lesson: next, mode: 'next' as const };
  return null;
}

export function phaseOf(l: Lesson, focusId: string | undefined, now: number): Phase {
  if (l.id === focusId) return Date.parse(l.startsAt) <= now ? 'current' : 'next';
  return Date.parse(l.endsAt) <= now ? 'past' : 'later';
}

export type Tone = 'muted' | 'hero' | 'danger' | 'online' | 'ink';

/** Короткий статус справа в строке расписания — словами (правило макета). */
export function statusOf(l: Lesson, phase: Phase, now: number): { text: string; tone: Tone } {
  if (l.status === 'cancelled') return { text: 'отменена', tone: 'danger' };
  if (l.status === 'moved' && l.movedTo)
    return { text: `→ ${wdShort(dayOf(l.movedTo))} ${hhmm(l.movedTo)}`, tone: 'danger' };
  if (phase === 'past') return { text: 'прошла', tone: 'muted' };
  if (phase === 'current')
    return {
      text: `идёт · ещё ${Math.max(1, Math.round((Date.parse(l.endsAt) - now) / 60000))} мин`,
      tone: 'hero',
    };
  if (phase === 'next') return { text: relativeIn(now, Date.parse(l.startsAt)), tone: 'hero' };
  if (l.movedFrom) return { text: `перенос с ${wdShort(dayOf(l.movedFrom))}`, tone: 'danger' };
  if (l.previousRoom) return { text: `${l.room} · новая`, tone: 'danger' };
  if (l.online) return { text: 'онлайн', tone: 'online' };
  return { text: l.room ?? '', tone: 'muted' };
}

/** Описание места: «D734, 7 этаж» для корпусов кампуса. */
export function placeOf(room: string | null) {
  if (!room) return null;
  const m = /^([A-ZА-Я])(\d)(\d{2})$/.exec(room);
  if (!m) return { room, building: null as string | null, floor: null as number | null };
  return { room, building: m[1]!, floor: Number(m[2]) };
}

export function placeLabel(room: string | null) {
  const p = placeOf(room);
  if (!p) return 'онлайн';
  return p.floor ? `${p.room}, ${p.floor} этаж` : p.room;
}

/** «перенесена на чт 26.11, 13:30» */
export const movedToLabel = (l: Lesson) =>
  l.movedTo ? `${shortDate(dayOf(l.movedTo))}, ${hhmm(l.movedTo)}` : '';

/** Отсчёт до момента для крупной цифры: значение и единица. */
export function bigCountdown(now: number, target: number, today: string): { value: string; unit: string } {
  const min = Math.max(0, Math.ceil((target - now) / 60000));
  if (min < 100) return { value: String(min), unit: 'мин' };
  const targetDay = dayOf(new Date(target));
  const d = diffDays(today, targetDay);
  if (d <= 0) {
    const h = Math.floor(min / 60);
    return { value: String(h), unit: h === 1 ? 'час' : h < 5 ? 'часа' : 'часов' };
  }
  if (d === 1 || min < 24 * 60) {
    const h = Math.round(min / 60);
    return { value: String(h), unit: plural(h, 'час', 'часа', 'часов') };
  }
  return { value: String(d), unit: d < 5 ? 'дня' : 'дней' };
}

export const tomorrowOf = (day: string) => addDays(day, 1);
