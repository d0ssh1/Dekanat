'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStudent } from '@/server/auth/guards';
import { HERO_COLORS, savePrefs } from '@/server/dal/prefs';

const schema = z.object({
  heroColor: z.enum(HERO_COLORS).optional(),
  demoClock: z.boolean().optional(),
});

export async function savePrefsAction(input: unknown) {
  const viewer = await requireStudent();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false };
  await savePrefs(viewer, p.data);
  revalidatePath('/', 'layout');
  return { ok: true };
}
