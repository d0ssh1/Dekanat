import 'server-only';
import type { StudentViewer } from '@/server/auth/guards';
import { questionsLastHour, saveMessages } from '@/server/dal/assistant';
import { GigaChatProvider } from './gigachat';
import { RulesProvider } from './rules';
import type { AssistantContext, AssistantResult } from './types';

export const RATE_LIMIT_PER_HOUR = 30;

/** Лимит: 30 вопросов в час на студента (защита квоты ИИ и от злоупотреблений). */
export async function underLimit(viewer: StudentViewer) {
  return (await questionsLastHour(viewer)) < RATE_LIMIT_PER_HOUR;
}

/**
 * Ответ помощника: GigaChat, если есть ключ, иначе правила.
 * Если GigaChat не ответил — тот же вопрос обрабатывают правила: демо не ломается.
 */
export async function ask(ctx: AssistantContext): Promise<AssistantResult & { fallback?: boolean }> {
  if (GigaChatProvider.available()) {
    try {
      const r = await new GigaChatProvider().answer(ctx);
      if (r.text || r.card) return r;
    } catch (e) {
      console.error('[assistant] GigaChat недоступен, отвечают правила:', e instanceof Error ? e.message : e);
      const r = await new RulesProvider().answer(ctx);
      return { ...r, fallback: true };
    }
  }
  return new RulesProvider().answer(ctx);
}

export async function saveExchange(
  viewer: StudentViewer,
  threadId: string,
  question: string,
  r: AssistantResult,
) {
  await saveMessages(viewer, threadId, [
    { role: 'user', content: question.slice(0, 1000) },
    {
      role: 'assistant',
      content: r.text.slice(0, 4000),
      cards: r.card ? [r.card] : [],
      provider: r.provider,
    },
  ]);
}
