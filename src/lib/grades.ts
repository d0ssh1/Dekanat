/**
 * Балльно-рейтинговая система (100 баллов): семестр + экзамен.
 * Шкала ДВФУ: 86–100 «отлично», 76–85 «хорошо», 61–75 «удовлетворительно».
 */
import type { CourseSummary, FinalGrade, Item } from '@/server/dal/study';
import { dayMonth, dayOf, diffDays, plural } from './time';

export const SCALE = [
  { from: 86, label: 'отлично', value: 5 },
  { from: 76, label: 'хорошо', value: 4 },
  { from: 61, label: 'удовлетворительно', value: 3 },
] as const;

export function gradeFor(total: number) {
  return SCALE.find((s) => total >= s.from) ?? { from: 0, label: 'неудовлетворительно', value: 2 };
}

const WORD: Record<string, number> = { отлично: 5, хорошо: 4, удовлетворительно: 3 };

/** Средний балл по оценкам прошлых сессий (зачёты не считаются). */
export function gpa(grades: FinalGrade[]) {
  const vals = grades.map((g) => WORD[g.grade]).filter((v): v is number => typeof v === 'number');
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
}

export const controlLabel = (c: CourseSummary['control']) =>
  c === 'exam' ? 'экзамен' : c === 'diff_credit' ? 'дифф. зачёт' : 'зачёт';

/**
 * Допуск. Экзамен — порог курса по баллам семестра.
 * Зачёт — «под угрозой», только если даже со всеми оставшимися работами не набрать 61.
 */
export function admission(c: CourseSummary) {
  if (c.control === 'exam') {
    const left = Math.max(0, c.threshold - c.points);
    return { need: c.threshold, left, ok: left === 0 };
  }
  const possible = c.points + c.items.filter((i) => i.points === null).reduce((a, i) => a + i.max, 0);
  return { need: 61, left: Math.max(0, 61 - c.points), ok: possible >= 61 };
}

export const pendingItems = (c: CourseSummary, now: number) =>
  c.items.filter(
    (i) => i.kind !== 'exam' && i.points === null && (!i.dueAt || Date.parse(i.dueAt) > now - 86400_000),
  );

/** «Сдайте лабораторную 5 до 4 декабря — она даёт до 5 баллов. Допуск — от 50.» */
export function admissionAdvice(c: CourseSummary, now: number) {
  const a = admission(c);
  if (a.ok) return null;
  const next = pendingItems(c, now).sort((x, y) => (x.dueAt ?? '').localeCompare(y.dueAt ?? ''))[0];
  const tail = `Допуск — от ${a.need}.`;
  if (!next)
    return `Обсудите с преподавателем, как добрать ${a.left} ${plural(a.left, 'балл', 'балла', 'баллов')}. ${tail}`;
  const what = next.title
    .replace(/^Лабораторная/, 'лабораторную')
    .replace(/^Контрольная точка/, 'контрольную точку');
  const due = next.dueAt ? ` до ${dayMonth(dayOf(next.dueAt))}` : '';
  return `Сдайте ${what.charAt(0).toLowerCase() + what.slice(1)}${due} — она даёт до ${next.max} ${plural(next.max, 'балла', 'баллов', 'баллов')}. ${tail}`;
}

export function firstPending(c: CourseSummary, now: number): Item | undefined {
  return pendingItems(c, now).sort((x, y) => (x.dueAt ?? '').localeCompare(y.dueAt ?? ''))[0];
}

/** Сколько нужно на экзамене для оценки при текущих (или прогнозных) баллах семестра. */
export function needOnExam(semTotal: number, examMax: number, target: number) {
  const need = target - semTotal;
  if (need <= 0) return 0;
  return need > examMax ? null : need;
}

/** Строки «Из чего баллы»: сданные лабораторные склеиваем в «Лабораторные 1–4». */
export type Line = { key: string; title: string; points: number | null; max: number; dueAt: string | null };
export function breakdown(c: CourseSummary): Line[] {
  const out: Line[] = [];
  const sem = c.items.filter((i) => i.kind !== 'exam');
  let i = 0;
  while (i < sem.length) {
    const it = sem[i]!;
    if (it.kind === 'lab' && it.points !== null) {
      let j = i;
      while (j + 1 < sem.length && sem[j + 1]!.kind === 'lab' && sem[j + 1]!.points !== null) j++;
      if (j > i) {
        const group = sem.slice(i, j + 1);
        const n1 = /\d+/.exec(group[0]!.title)?.[0];
        const n2 = /\d+/.exec(group.at(-1)!.title)?.[0];
        out.push({
          key: group[0]!.id,
          title: n1 && n2 ? `Лабораторные ${n1}–${n2}` : 'Лабораторные',
          points: group.reduce((a, x) => a + (x.points ?? 0), 0),
          max: group.reduce((a, x) => a + x.max, 0),
          dueAt: null,
        });
        i = j + 1;
        continue;
      }
    }
    out.push({ key: it.id, title: it.title, points: it.points, max: it.max, dueAt: it.dueAt });
    i++;
  }
  return out;
}

export function daysToSession(today: string, sessionFrom: string) {
  return Math.max(0, diffDays(today, sessionFrom));
}
