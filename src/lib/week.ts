/** Сводка недели: что изменилось и что важно (панель «На этой неделе», шапка недели на телефоне). */
import { isActive, type Lesson } from './day';
import { addDays, dayOf, hhmm, pairs, plural, shortDate, wdGen, wdShort } from './time';
import { SEMESTER } from './university';

export type WeekNote = {
  key: string;
  tone: 'danger' | 'hero' | 'ok' | 'neutral';
  mark: string;
  strong: string;
  text: string;
  href?: string;
};

export function weekNumber(monday: string) {
  const start = Date.parse(SEMESTER.classesFrom);
  const startMonday = start - ((new Date(start).getUTCDay() + 6) % 7) * 86400_000;
  return Math.floor((Date.parse(monday) - startMonday) / (7 * 86400_000)) + 1;
}

export function weekLabel(monday: string) {
  const sat = addDays(monday, 5);
  const m1 = monday.slice(5, 7);
  const m2 = sat.slice(5, 7);
  const months = [
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
  const d1 = Number(monday.slice(8));
  const d2 = Number(sat.slice(8));
  return m1 === m2
    ? `${d1}–${d2} ${months[Number(m2) - 1]}`
    : `${d1} ${months[Number(m1) - 1]} – ${d2} ${months[Number(m2) - 1]}`;
}

export function changeNotes(lessons: Lesson[]): WeekNote[] {
  const notes: WeekNote[] = [];
  for (const l of lessons) {
    const d = dayOf(l.startsAt);
    if (l.status === 'moved' && l.movedTo)
      notes.push({
        key: l.id,
        tone: 'danger',
        mark: '!',
        strong: l.subject,
        text: ` перенесена с ${wdShort(d)} на ${wdShort(dayOf(l.movedTo))}, ${hhmm(l.movedTo)}`,
      });
    else if (l.status === 'cancelled')
      notes.push({
        key: l.id,
        tone: 'danger',
        mark: '!',
        strong: l.subject,
        text: ` в ${wdShort(d)} отменена`,
      });
    else if (l.previousRoom)
      notes.push({
        key: l.id,
        tone: 'danger',
        mark: '!',
        strong: l.subject,
        text: ` в ${wdShort(d)} — ауд. ${l.room} вместо ${l.previousRoom}`,
      });
  }
  return notes;
}

/** «2 изменения · КТ в среду · суббота свободна» */
export function weekSummary(lessons: Lesson[], monday: string, extra: string[] = []) {
  const changes = changeNotes(lessons).length;
  const parts: string[] = [];
  if (changes) parts.push(`${changes} ${plural(changes, 'изменение', 'изменения', 'изменений')}`);
  parts.push(...extra);
  const sat = addDays(monday, 5);
  if (!lessons.some((l) => dayOf(l.startsAt) === sat && isActive(l))) parts.push('суббота свободна');
  return parts.join(' · ');
}

export const countActive = (lessons: Lesson[]) => lessons.filter(isActive).length;
export { pairs, shortDate, wdGen };
