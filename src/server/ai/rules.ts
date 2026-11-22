import 'server-only';
import { listDocumentTypes } from '@/server/dal/documents';
import { getCurrentCourses } from '@/server/dal/study';
import { dayOf } from '@/lib/time';
import type { AssistantContext, AssistantProvider, AssistantResult } from './types';
import {
  resolveDay,
  toolChanges,
  toolDraft,
  toolExplain,
  toolGrades,
  toolNext,
  toolRequests,
  toolSchedule,
  toolTypes,
} from './tools';

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

/**
 * Помощник на правилах: понимает типовые просьбы по ключевым словам.
 * Работает без внешнего ИИ — запасной режим, если ключа нет или GigaChat недоступен.
 */
export class RulesProvider implements AssistantProvider {
  readonly name = 'rules' as const;

  async answer(ctx: AssistantContext): Promise<AssistantResult> {
    const q = ctx.question.toLowerCase().replace(/ё/g, 'е');
    const { viewer, now } = ctx;
    const today = dayOf(now);
    const done = (
      r: { text: string; card: AssistantResult['card'] } | null,
      thinking: string[],
    ): AssistantResult | null => (r ? { text: r.text, card: r.card, thinking, provider: 'rules' } : null);

    // 1. Как это устроено («где взять справку о доходах», «как пересдать»)
    if (
      has(
        q,
        'где взять',
        'как получить',
        'как оформ',
        'что делать',
        'как пересда',
        'где деканат',
        'когда работает',
        'часы работы',
      )
    ) {
      const r = done(toolExplain(q), ['Ищу в правилах вуза']);
      if (r) return r;
    }

    // 2. Справки: конкретный вид — черновик, общий вопрос — список
    const types = await listDocumentTypes(viewer);
    const wantsDoc = has(
      q,
      'справк',
      'заказ',
      'выписк',
      'направлени',
      'нужна',
      'нужен документ',
      'материальн',
      'матпомощ',
    );
    const asksStatus = has(
      q,
      'статус',
      'моя заявк',
      'мои заявк',
      'заявки',
      'готова ли',
      'когда будет',
      'где моя',
    );
    if (wantsDoc && !asksStatus) {
      const match = types
        .map((t) => ({ t, score: t.keywords.filter((k) => q.includes(k)).length }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      if (match)
        return done(await toolDraft(viewer, match.t.code), [
          'Смотрю ваш профиль',
          `Выбираю форму: ${match.t.title.toLowerCase()}`,
          'Собираю заявку',
        ])!;
      if (has(q, 'справк') && has(q, 'учусь', 'обучени', 'работ', 'банк'))
        return done(await toolDraft(viewer, 'study_cert'), ['Смотрю ваш профиль', 'Собираю заявку'])!;
      return done(await toolTypes(viewer), ['Смотрю, какие справки можно заказать'])!;
    }

    // 3. Статус заявок
    if (asksStatus || has(q, 'заявк')) return done(await toolRequests(viewer, now), ['Смотрю ваши заявки'])!;

    // 4. Изменения в расписании
    if (has(q, 'перенос', 'перенесл', 'изменени', 'отмен', 'замен'))
      return done(await toolChanges(viewer, now), ['Сверяю расписание недели'])!;

    // 5. Баллы и допуск
    if (has(q, 'балл', 'допуск', 'оценк', 'экзамен', 'сесси', 'зачет', 'рейтинг', 'долг')) {
      const courses = await getCurrentCourses(viewer);
      const hint = courses.find(
        (c) => q.includes(c.short.toLowerCase()) || q.includes(c.subject.toLowerCase().slice(0, 6)),
      );
      return done(await toolGrades(viewer, hint?.subject), ['Считаю баллы за семестр'])!;
    }

    // 6. Расписание
    if (has(q, 'следующ', 'куда идти', 'где пара', 'какая пара'))
      return done(await toolNext(viewer, now), ['Смотрю расписание'])!;
    const day = resolveDay(q, today);
    if (day || has(q, 'пар', 'расписан', 'аудитор', 'занят'))
      return done(await toolSchedule(viewer, day ?? today, now), ['Смотрю расписание'])!;

    // 7. Приветствие / не понял
    return {
      text: `${has(q, 'привет', 'здравств', 'добр') ? `Привет, ${ctx.firstName}! ` : ''}Я помогаю с расписанием, баллами и справками. Например: «нужна справка в военкомат», «какие пары завтра», «сколько не хватает до допуска», «где моя справка».`,
      card: {
        kind: 'answer',
        cap: 'Можно спросить',
        headline: 'Что умею',
        rows: [
          { main: 'Нужна справка в военкомат' },
          { main: 'Какие пары завтра?' },
          { main: 'Сколько не хватает до допуска?' },
          { main: 'Где взять справку о доходах?' },
          { main: 'Что с моими заявками?' },
        ],
      },
      thinking: [],
      provider: 'rules',
    };
  }
}
