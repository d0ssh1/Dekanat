import 'server-only';
import type { StudentViewer } from '@/server/auth/guards';

/** Карточки ответа: интерфейс рисует их своими компонентами, а не текстом модели. */
export type DraftCard = {
  kind: 'draft';
  typeCode: string;
  title: string;
  meta: string;
  sources: { label: string; value: string; src: string }[];
  related: { code: string; title: string }[];
  delivery: string;
};
export type AnswerCard = {
  kind: 'answer';
  cap: string;
  headline: string;
  rows?: {
    left?: string;
    main: string;
    right?: string;
    tone?: 'danger' | 'ok' | 'online' | 'muted';
    href?: string;
  }[];
  links?: { href: string; label: string }[];
};
export type Card = DraftCard | AnswerCard;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type AssistantResult = {
  text: string;
  card: Card | null;
  thinking: string[];
  provider: 'rules' | 'gigachat';
};

export type AssistantContext = {
  viewer: StudentViewer;
  now: Date;
  firstName: string;
  history: ChatMessage[];
  question: string;
};

export interface AssistantProvider {
  readonly name: 'rules' | 'gigachat';
  answer(ctx: AssistantContext): Promise<AssistantResult>;
}
