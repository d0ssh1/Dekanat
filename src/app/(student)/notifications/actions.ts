'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStudent } from '@/server/auth/guards';
import { markRead } from '@/server/dal/notifications';

export async function markReadAction(id: unknown) {
  const viewer = await requireStudent();
  const parsed = z.union([z.literal('all'), z.string().uuid()]).safeParse(id);
  if (!parsed.success) return;
  await markRead(viewer, parsed.data);
  revalidatePath('/', 'layout');
}
