'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStudent } from '@/server/auth/guards';
import { cancelRequest, createRequest, UserError } from '@/server/services/requests';

const newSchema = z.object({
  typeCode: z.string().regex(/^[a-z_]{2,40}$/),
  delivery: z.enum(['pdf', 'paper', 'pdf_and_paper']),
  copies: z.number().int().min(1).max(5),
  payload: z.record(z.string().max(40), z.string().max(200)).default({}),
  source: z.enum(['assistant', 'form']).optional(),
  draftId: z.string().uuid().optional(),
});

export type ActionResult = { ok: true; id: string; number: number } | { ok: false; error: string };

/** Server Action — публичный эндпоинт: сам проверяет сессию и вход (CLAUDE.md, правило 4). */
export async function createRequestAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireStudent();
  const parsed = newSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Проверьте поля заявки' };
  try {
    const r = await createRequest(viewer, parsed.data);
    revalidatePath('/documents');
    revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: 'Сервер деканата не ответил' };
  }
}

export async function cancelRequestAction(id: unknown): Promise<{ ok: boolean; error?: string }> {
  const viewer = await requireStudent();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: 'Заявка не найдена' };
  try {
    await cancelRequest(viewer, parsed.data);
    revalidatePath('/documents');
    revalidatePath(`/documents/${parsed.data}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}
