import { requireStudent } from '@/server/auth/guards';
import { getShell } from '@/server/dal/me';
import { AssistantView } from '@/components/features/assistant/AssistantView';

export const metadata = { title: 'Помощник' };

/** Помощник. Вопрос из строки «Помощник» на любом экране приходит сюда как ?q= и отправляется сразу. */
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; now?: string }>;
}) {
  const viewer = await requireStudent();
  const sp = await searchParams;
  const shell = await getShell(viewer);
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 500) : undefined;
  return <AssistantView key={q ?? ''} firstName={shell.firstName} initialQuestion={q} now={sp.now} />;
}
