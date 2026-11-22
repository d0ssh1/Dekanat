'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/server/auth/guards';
import { announce, changeLesson, transition, UserError } from '@/server/services/staff';

type R = { ok: true; message: string } | { ok: false; error: string };

const transitionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('take'), etaDays: z.number().int().min(0).max(30).optional() }),
  z.object({
    action: z.literal('need'),
    title: z.string().trim().min(2).max(80),
    comment: z.string().trim().min(2).max(300),
    dueDays: z.number().int().min(1).max(30),
  }),
  z.object({ action: z.literal('ready') }),
  z.object({ action: z.literal('issue') }),
  z.object({ action: z.literal('reject'), comment: z.string().trim().min(2).max(300) }),
]);

const WORD = {
  take: 'Взята в работу',
  need: 'Документ запрошен',
  ready: 'Отмечена готовой — PDF собран',
  issue: 'Выдана',
  reject: 'Отклонена',
} as const;

export async function transitionAction(id: unknown, input: unknown): Promise<R> {
  const viewer = await requireStaff();
  const rid = z.string().uuid().safeParse(id);
  const t = transitionSchema.safeParse(input);
  if (!rid.success || !t.success) return { ok: false, error: 'Проверьте поля' };
  try {
    await transition(viewer, rid.data, t.data);
    revalidatePath('/staff', 'layout');
    return { ok: true, message: `${WORD[t.data.action]}. Студент получил уведомление.` };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

const lessonSchema = z.object({
  lessonId: z.string().uuid(),
  room: z.string().trim().max(20).optional(),
  moveTo: z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      slot: z.number().int().min(1).max(7),
      room: z.string().trim().max(20),
    })
    .optional(),
});

export async function changeLessonAction(input: unknown): Promise<R> {
  const viewer = await requireStaff();
  const p = lessonSchema.safeParse(input);
  if (!p.success || (!p.data.room && !p.data.moveTo))
    return { ok: false, error: 'Укажите новую аудиторию или новое время' };
  try {
    const n = await changeLesson(viewer, p.data);
    revalidatePath('/staff/schedule');
    return { ok: true, message: `Готово. Уведомление получили студенты группы: ${n}.` };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

const announceSchema = z.object({
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(3).max(1000),
  groupIds: z.array(z.string().uuid()).max(50),
});

export async function announceAction(input: unknown): Promise<R> {
  const viewer = await requireStaff();
  const p = announceSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'Заголовок от 3 символов, текст от 3 символов' };
  const n = await announce(viewer, p.data);
  return { ok: true, message: `Объявление отправлено: ${n} студентам.` };
}
