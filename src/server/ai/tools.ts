import 'server-only';
import type { StudentViewer } from '@/server/auth/guards';
import { getDay, getNextLesson, getWeek } from '@/server/dal/schedule';
import { getCurrentCourses } from '@/server/dal/study';
import { listDocumentTypes, listMyRequests } from '@/server/dal/documents';
import { getMyProfile } from '@/server/dal/me';
import { admission, controlLabel } from '@/lib/grades';
import { isActive, type Lesson } from '@/lib/day';
import { changeNotes } from '@/lib/week';
import { DELIVERY, listLine } from '@/lib/requests';
import { addDays, cap, dayMonth, dayOf, hhmm, longDate, mondayOf, pairs, weekday } from '@/lib/time';
import { KNOWLEDGE } from './knowledge';
import type { AnswerCard, DraftCard } from './types';

/**
 * Инструменты помощника. Каждый получает Viewer из сессии и читает данные только через DAL —
 * модель (или правила) не может запросить чужие данные: id владельца ей просто неоткуда взять.
 */

const WEEKDAYS = ['понедельник', 'вторник', 'сред', 'четверг', 'пятниц', 'суббот', 'воскресень'];

/** Разбор дня из фразы: «сегодня», «завтра», «послезавтра», «в четверг», «26.11». */
export function resolveDay(text: string, today: string): string | null {
  const t = text.toLowerCase();
  if (/послезавтра/.test(t)) return addDays(today, 2);
  if (/завтра/.test(t)) return addDays(today, 1);
  if (/сегодня|сейчас|следующ/.test(t)) return today;
  const wd = WEEKDAYS.findIndex((w) => t.includes(w));
  if (wd >= 0) {
    let d = today;
    for (let i = 0; i < 7; i++) {
      if (weekday(d) === wd + 1) return d;
      d = addDays(d, 1);
    }
  }
  const m = /(\d{1,2})[./](\d{1,2})/.exec(t);
  if (m) return `${today.slice(0, 4)}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return null;
}

const lessonRow = (l: Lesson) => ({
  left: hhmm(l.startsAt),
  main: l.subject,
  right:
    l.status === 'moved'
      ? 'перенесена'
      : l.status === 'cancelled'
        ? 'отменена'
        : l.online
          ? 'онлайн'
          : l.previousRoom
            ? `${l.room} · новая`
            : (l.room ?? ''),
  tone: (l.status !== 'scheduled' || l.previousRoom ? 'danger' : l.online ? 'online' : 'muted') as
    'danger' | 'online' | 'muted',
});

export async function toolSchedule(viewer: StudentViewer, day: string, now: Date) {
  const lessons = await getDay(viewer, day);
  const act = lessons.filter(isActive);
  const today = dayOf(now);
  const label = day === today ? 'Сегодня' : day === addDays(today, 1) ? 'Завтра' : cap(longDate(day));
  const card: AnswerCard = {
    kind: 'answer',
    cap: `${label} · ${act.length ? pairs(act.length) : 'пар нет'}`,
    headline: act.length ? `${hhmm(act[0]!.startsAt)} — ${act[0]!.short}` : 'Пар нет',
    rows: lessons.map(lessonRow),
    links: [{ href: '/week', label: 'Вся неделя' }],
  };
  const text = act.length
    ? `${label} ${pairs(act.length)}: первая в ${hhmm(act[0]!.startsAt)} (${act[0]!.subject}, ${act[0]!.online ? 'онлайн' : `ауд. ${act[0]!.room}`}), последняя заканчивается в ${hhmm(act.at(-1)!.endsAt)}.`
    : `${label} пар нет.`;
  return { text, card, data: lessons };
}

export async function toolNext(viewer: StudentViewer, now: Date) {
  const l = await getNextLesson(viewer, now, dayOf(now));
  if (!l) return { text: 'В ближайшие две недели пар нет.', card: null };
  const d = dayOf(l.startsAt);
  const card: AnswerCard = {
    kind: 'answer',
    cap: d === dayOf(now) ? 'Следующая пара' : `Следующая пара · ${longDate(d)}`,
    headline: `${hhmm(l.startsAt)} · ${l.online ? 'онлайн' : l.room}`,
    rows: [{ left: hhmm(l.startsAt), main: `${l.subject} · ${l.kindLabel}`, right: l.teacher }],
    links: [{ href: '/', label: 'Открыть «Сегодня»' }],
  };
  return {
    text: `${l.subject}, ${l.kindLabel}: ${longDate(d)} в ${hhmm(l.startsAt)}, ${l.online ? 'онлайн' : `аудитория ${l.room}`}. Ведёт ${l.teacher}.${l.previousRoom ? ` Внимание: аудитория изменена, раньше была ${l.previousRoom}.` : ''}`,
    card,
  };
}

export async function toolChanges(viewer: StudentViewer, now: Date) {
  const monday = mondayOf(dayOf(now));
  const notes = changeNotes(await getWeek(viewer, monday));
  const card: AnswerCard = {
    kind: 'answer',
    cap: 'Изменения на этой неделе',
    headline: notes.length
      ? `${notes.length} ${notes.length === 1 ? 'изменение' : notes.length < 5 ? 'изменения' : 'изменений'}`
      : 'Без изменений',
    rows: notes.map((n) => ({ main: `${n.strong}${n.text}`, tone: 'danger' as const })),
    links: [{ href: '/week', label: 'Открыть неделю' }],
  };
  return {
    text: notes.length
      ? notes.map((n) => `${n.strong}${n.text}`).join('; ') + '.'
      : 'На этой неделе всё по плану — переносов и замен нет.',
    card,
  };
}

export async function toolGrades(viewer: StudentViewer, subjectHint?: string) {
  const courses = await getCurrentCourses(viewer);
  const hint = subjectHint?.toLowerCase();
  const pick = hint
    ? courses.find((c) => c.subject.toLowerCase().includes(hint) || c.short.toLowerCase() === hint)
    : undefined;
  if (pick) {
    const a = admission(pick);
    const card: AnswerCard = {
      kind: 'answer',
      cap: `${pick.subject} · ${controlLabel(pick.control)}`,
      headline: a.ok ? `${pick.points} из ${pick.semMax}` : `не хватает ${a.left}`,
      rows: pick.items
        .filter((i) => i.kind !== 'exam')
        .map((i) => ({
          main: i.title,
          right: `${i.points ?? 0} / ${i.max}`,
          tone: i.points === null ? ('muted' as const) : undefined,
        })),
      links: [{ href: `/study/${pick.id}`, label: 'Открыть предмет и калькулятор' }],
    };
    return {
      text: a.ok
        ? `По предмету «${pick.subject}» набрано ${pick.points} из ${pick.semMax} — допуск есть.`
        : `По предмету «${pick.subject}» набрано ${pick.points}, для допуска нужно ${a.need} — не хватает ${a.left}.`,
      card,
    };
  }
  const problems = courses.filter((c) => !admission(c).ok);
  const card: AnswerCard = {
    kind: 'answer',
    cap: 'Учёба · текущий семестр',
    headline: problems.length
      ? `нет допуска: ${problems.map((p) => p.short).join(', ')}`
      : 'Допуск по всем предметам',
    rows: courses.map((c) => {
      const a = admission(c);
      return {
        main: c.subject,
        right: `${c.points} / ${c.semMax}`,
        tone: a.ok ? undefined : ('danger' as const),
        href: `/study/${c.id}`,
      };
    }),
    links: [{ href: '/study', label: 'Открыть учёбу' }],
  };
  return {
    text: problems.length
      ? `Не хватает баллов для допуска: ${problems.map((p) => `${p.subject} (${admission(p).left})`).join(', ')}. По остальным — всё в порядке.`
      : 'По всем предметам допуск есть или баллы идут по плану.',
    card,
  };
}

export async function toolRequests(viewer: StudentViewer, now: Date) {
  const all = await listMyRequests(viewer);
  const active = all.filter((r) => !['issued', 'cancelled', 'rejected'].includes(r.status));
  const today = dayOf(now);
  const card: AnswerCard = {
    kind: 'answer',
    cap: 'Мои заявки',
    headline: active.length ? `${active.length} в работе` : 'Заявок в работе нет',
    rows: active.map((r) => {
      const l = listLine(r, today);
      return {
        main: `${r.title} №${r.number}`,
        right: l.text.replace(/^! /, ''),
        tone:
          l.tone === 'danger' ? ('danger' as const) : l.tone === 'ok' ? ('ok' as const) : ('muted' as const),
        href: `/documents/${r.id}`,
      };
    }),
    links: [{ href: '/documents', label: 'Все документы' }],
  };
  return {
    text: active.length
      ? active
          .map((r) => `${r.title} №${r.number} — ${listLine(r, today).text.replace(/^! /, '').toLowerCase()}`)
          .join('; ') + '.'
      : 'Сейчас заявок в работе нет.',
    card,
  };
}

/** Черновик заявки. Ничего не отправляет: отправка — только нажатием студента. */
export async function toolDraft(viewer: StudentViewer, typeCode: string) {
  const [types, p] = await Promise.all([listDocumentTypes(viewer), getMyProfile(viewer)]);
  const t = types.find((x) => x.code === typeCode);
  if (!t) return null;
  const delivery = t.deliveries.includes('pdf_and_paper') ? 'pdf_and_paper' : t.deliveries[0]!;
  const dest = t.fields.find((f) => f.key === 'destination')?.default;
  const idx = types.indexOf(t);
  const card: DraftCard = {
    kind: 'draft',
    typeCode: t.code,
    title: t.title,
    meta: `${t.etaText.charAt(0).toUpperCase() + t.etaText.slice(1)} · бесплатно`,
    delivery,
    sources: [
      {
        label: `${p.lastName} ${p.firstName[0]}. ${p.middleName?.[0] ?? ''}., ${p.groupShort}, ${p.course} курс`,
        value: '',
        src: 'из профиля',
      },
      ...(dest ? [{ label: dest, value: '', src: 'куда — по умолчанию' }] : []),
      { label: DELIVERY[delivery] ?? delivery, value: '', src: 'формат — по умолчанию' },
      {
        label: 'Основание',
        value: t.legalBasis,
        src: t.legalBasis.replace('Положение о справках', 'Положение'),
      },
      ...(t.requirements.length
        ? [
            {
              label: `Понадобятся: ${t.requirements.join(', ').toLowerCase()}`,
              value: '',
              src: 'загрузите после',
            },
          ]
        : []),
    ],
    related: [types[(idx + 1) % types.length]!, types[(idx + 2) % types.length]!]
      .filter((x) => x.code !== t.code)
      .map((x) => ({ code: x.code, title: x.title })),
  };
  return {
    text: `Собрала заявку «${t.title}»: данные из профиля, формат — ${DELIVERY[delivery]?.toLowerCase()}. ${t.etaText.charAt(0).toUpperCase() + t.etaText.slice(1)}. Проверьте и нажмите «Отправить в деканат».`,
    card,
  };
}

export async function toolTypes(viewer: StudentViewer) {
  const types = await listDocumentTypes(viewer);
  const card: AnswerCard = {
    kind: 'answer',
    cap: 'Что можно заказать',
    headline: `${types.length} видов справок`,
    rows: types.map((t) => ({
      main: t.title,
      right: t.etaText.replace('обычно ', ''),
      href: `/documents/new?type=${t.code}`,
    })),
  };
  return {
    text: 'Вот что можно заказать онлайн. Напишите, какая нужна и для чего, — соберу заявку.',
    card,
    types,
  };
}

export function toolExplain(question: string) {
  const q = question.toLowerCase();
  const t = KNOWLEDGE.find((k) => k.words.some((w) => q.includes(w)));
  if (!t) return null;
  const card: AnswerCard = { kind: 'answer', cap: 'Как это устроено', headline: t.title, links: t.links };
  return { text: t.text, card };
}

export { dayMonth };
