/**
 * «По делам»: одна лента того, что студенту стоит сделать или узнать — из заявок и учёбы.
 * Чистые функции: данные приходят из DAL, здесь только порядок и слова.
 */
import type { ActiveRequest, StudyAlert } from '@/server/dal/todo';
import type { IconName } from '@/components/ui/Icon';
import type { TileTone } from '@/components/ui/primitives';
import { addDays, dayOf, diffDays, daysWord, plural } from './time';

export type TodoItem = {
  key: string;
  icon: IconName;
  tone: TileTone;
  title: string;
  /** Коротко для строки на главной: «КТ через 2 дня». */
  short: string;
  hint: string;
  href: string;
  urgent: boolean;
};

const ddmm = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}`;

export function inDays(today: string, day: string) {
  const d = diffDays(today, day);
  if (d <= 0) return 'сегодня';
  if (d === 1) return 'завтра';
  return `через ${d} ${daysWord(d)}`;
}

/** Статус заявки одной фразой: «завтра», «готова», «нужен документ · до 25.11». */
export function requestLine(
  r: ActiveRequest,
  today: string,
): { text: string; tone: 'ok' | 'danger' | 'ink' | 'muted' } {
  if (r.status === 'need_action')
    return {
      text: r.actionDueOn ? `нужен документ · до ${ddmm(r.actionDueOn)}` : 'нужен документ',
      tone: 'danger',
    };
  if (r.status === 'ready') return { text: 'готова', tone: 'ok' };
  if (r.status === 'in_progress' && r.etaTo) {
    const d = diffDays(today, r.etaTo);
    return { text: d <= 0 ? 'сегодня' : d === 1 ? 'завтра' : `к ${ddmm(r.etaTo)}`, tone: 'ink' };
  }
  if (r.status === 'in_progress') return { text: 'принята', tone: 'muted' };
  return { text: 'отправлена', tone: 'muted' };
}

const shortTitle = (t: string) => t.replace(/^Контрольная точка$/, 'КТ').replace(/^КТ \d+$/, 'КТ');

export function buildTodos(requests: ActiveRequest[], alerts: StudyAlert[], today: string): TodoItem[] {
  const items: TodoItem[] = [];
  for (const r of requests.filter((x) => x.status === 'need_action')) {
    items.push({
      key: `r${r.id}`,
      icon: 'alert',
      tone: 'danger',
      urgent: true,
      title: `${r.title}: нужен документ`,
      short: `документ к №${r.number}`,
      hint: r.actionDueOn ? `до ${ddmm(r.actionDueOn)}` : 'загрузите в заявку',
      href: `/documents/${r.id}`,
    });
  }
  for (const a of alerts.filter((x) => x.kind === 'admission')) {
    const n = a.threshold - a.points;
    items.push({
      key: `a${a.courseId}`,
      icon: 'alert',
      tone: 'danger',
      urgent: true,
      title: `Допуск по ${a.short}`,
      short: `допуск по ${a.short}`,
      hint: `не хватает ${n} ${plural(n, 'балла', 'баллов', 'баллов')}`,
      href: `/study/${a.courseId}`,
    });
  }
  for (const a of alerts) {
    if (a.kind !== 'due') continue;
    const day = dayOf(a.dueAt);
    const when = inDays(today, day);
    const t = shortTitle(a.title);
    items.push({
      key: `d${a.courseId}${a.title}`,
      icon: 'clock',
      tone: 'hero',
      urgent: diffDays(today, day) <= 2,
      // Склонять названия предметов не пытаемся: «Матстат · КТ 2» читается однозначно.
      title: `${a.short} · ${a.title}`,
      short: `${t} ${when}`,
      hint: when,
      href: `/study/${a.courseId}`,
    });
  }
  for (const r of requests.filter((x) => x.status === 'ready')) {
    items.push({
      key: `r${r.id}`,
      icon: 'check',
      tone: 'ok',
      urgent: false,
      title: `${r.title} №${r.number} готова`,
      short: 'справка готова',
      hint: r.pickupPlace ? `PDF или бумажная в ${r.pickupPlace}` : 'PDF в заявке',
      href: `/documents/${r.id}`,
    });
  }
  return items;
}

export const tomorrow = (today: string) => addDays(today, 1);
