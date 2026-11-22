/**
 * Время в часовом поясе вуза. Даты дней — строки 'YYYY-MM-DD' (календарные, без пояса),
 * моменты — Date/ISO. Файл без серверных зависимостей: работает и в браузере.
 */
import { TZDate } from '@date-fns/tz';
import { UNIVERSITY } from './university';

export const TZ = UNIVERSITY.timeZone;

/** 'YYYY-MM-DD' + 'HH:MM' по времени вуза → момент. */
export function at(day: string, hhmm: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [h, mi] = hhmm.split(':').map(Number) as [number, number];
  return new Date(new TZDate(y, m - 1, d, h, mi, 0, TZ).getTime());
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 1 — пн … 7 — вс. */
export function weekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Календарная дата момента в поясе вуза. */
export function dayOf(moment: Date | string): string {
  const z = new TZDate(new Date(moment).getTime(), TZ);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}

export function mondayOf(day: string): string {
  return addDays(day, -(weekday(day) - 1));
}

export function isValidDay(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400_000);
}

// ---------- Форматирование по-русски ----------
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, ...o });
const hm = fmt({ hour: '2-digit', minute: '2-digit' });

export function hhmm(moment: Date | string) {
  return hm.format(new Date(moment));
}

const WD_SHORT = ['', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const WD_FULL = ['', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const WD_GEN = ['', 'понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы', 'воскресенья'];
/** «с понедельника» */
export const wdGen = (day: string) => WD_GEN[weekday(day)]!;
const MONTH_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const wdShort = (day: string) => WD_SHORT[weekday(day)]!;
export const wdFull = (day: string) => WD_FULL[weekday(day)]!;
export const dayNum = (day: string) => Number(day.slice(8));
export const monthGen = (day: string) => MONTH_GEN[Number(day.slice(5, 7)) - 1]!;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «26 ноября» */
export const dayMonth = (day: string) => `${dayNum(day)} ${monthGen(day)}`;
/** «чт 26.11» */
export const shortDate = (day: string) => `${wdShort(day)} ${day.slice(8)}.${day.slice(5, 7)}`;
/** «Чт, 26 ноября» */
export const longDate = (day: string) => `${cap(wdShort(day))}, ${dayMonth(day)}`;

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export const pairs = (n: number) => `${n} ${plural(n, 'пара', 'пары', 'пар')}`;
export const daysWord = (n: number) => plural(n, 'день', 'дня', 'дней');

/** «через 10 мин», «через 1 ч 20 мин», «через 2 дня». */
export function relativeIn(fromMs: number, toMs: number) {
  const min = Math.max(0, Math.round((toMs - fromMs) / 60000));
  if (min < 60) return `через ${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `через ${h} ч ${m} мин` : `через ${h} ч`;
  const d = Math.round(min / 1440);
  return `через ${d} ${daysWord(d)}`;
}
