'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStudent } from '@/server/auth/guards';
import { saveHomeLayout } from '@/server/dal/prefs';

const schema = z
  .array(
    z.object({
      id: z.enum(['docs', 'study', 'tomorrow']),
      size: z.enum(['S', 'M', 'L']),
      hidden: z.boolean(),
    }),
  )
  .length(3)
  .refine((a) => new Set(a.map((b) => b.id)).size === 3);

export async function saveLayoutAction(blocks: unknown) {
  const viewer = await requireStudent();
  const p = schema.safeParse(blocks);
  if (!p.success) return { ok: false };
  await saveHomeLayout(viewer, p.data);
  revalidatePath('/');
  return { ok: true };
}
