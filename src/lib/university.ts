/**
 * Реалии вуза. Кабинет адаптирован под ДВФУ (разрешено ТЗ), но это концепт:
 * людей, оценки и заявки придумали, логотипа вуза нет.
 * Файл без серверных зависимостей — его можно импортировать и в клиентские компоненты.
 */

export const UNIVERSITY = {
  /** Как называем вуз в интерфейсе (без логотипа). */
  name: 'ДВФУ',
  campus: 'кампус на о. Русский',
  timeZone: 'Asia/Vladivostok',
  /** Подпись-дисклеймер — обязательна по ТЗ. */
  disclaimer:
    'Концепт для конкурса «Цифровой деканат будущего». Не официальный сервис вуза. Все данные вымышлены.',
} as const;

/** Сетка пар ДВФУ: номер → начало и конец (местное время). */
export const SLOTS = [
  { slot: 1, start: '08:30', end: '10:00' },
  { slot: 2, start: '10:10', end: '11:40' },
  { slot: 3, start: '11:50', end: '13:20' },
  { slot: 4, start: '13:30', end: '15:00' },
  { slot: 5, start: '15:10', end: '16:40' },
  { slot: 6, start: '16:50', end: '18:20' },
  { slot: 7, start: '18:30', end: '20:00' },
] as const;

export type SlotNumber = (typeof SLOTS)[number]['slot'];

export function slotTimes(slot: number) {
  const s = SLOTS.find((x) => x.slot === slot);
  if (!s) throw new Error(`Нет пары №${slot}`);
  return s;
}

/** Где выдают бумажные справки. */
export const DEAN_OFFICE = {
  room: 'D210',
  hours: 'пн–пт 9:00–17:00',
} as const;

/** Осенний семестр 2026/27. */
export const SEMESTER = {
  code: '2026-осень',
  number: 5,
  classesFrom: '2026-09-01',
  classesTo: '2026-12-19',
  sessionFrom: '2026-12-21',
  sessionTo: '2027-01-24',
  /** Нерабочие дни, когда пар нет. */
  holidays: ['2026-11-04'],
} as const;
