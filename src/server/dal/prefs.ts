import 'server-only';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { homeLayouts, userPrefs, type HomeBlock } from '@/server/db/schema';
import { ctxOf, type Viewer } from '@/server/auth/guards';

export type { HomeBlock };

export const HERO_COLORS = ['#ff6a3d', '#c6f24e', '#7cc4ff', '#ff8fc7', '#ffc93c'] as const;
export const DEFAULT_BLOCKS: HomeBlock[] = [
  { id: 'docs', size: 'S', hidden: false },
  { id: 'study', size: 'S', hidden: false },
  { id: 'tomorrow', size: 'S', hidden: false },
];

export type Prefs = { demoClock: boolean; heroColor: string };

export const getPrefs = cache(async (viewer: Viewer): Promise<Prefs> => {
  const [p] = await withDb(ctxOf(viewer), (tx) =>
    tx
      .select({ demoClock: userPrefs.demoClock, heroColor: userPrefs.heroColor })
      .from(userPrefs)
      .where(eq(userPrefs.userId, viewer.userId)),
  );
  return p ?? { demoClock: false, heroColor: HERO_COLORS[0] };
});

export async function savePrefs(viewer: Viewer, patch: Partial<Prefs>) {
  await withDb(ctxOf(viewer), (tx) =>
    tx
      .insert(userPrefs)
      .values({ userId: viewer.userId, ...patch })
      .onConflictDoUpdate({ target: userPrefs.userId, set: { ...patch, updatedAt: new Date() } }),
  );
}

export async function getHomeLayout(viewer: Viewer): Promise<HomeBlock[]> {
  const [l] = await withDb(ctxOf(viewer), (tx) =>
    tx.select({ blocks: homeLayouts.blocks }).from(homeLayouts).where(eq(homeLayouts.userId, viewer.userId)),
  );
  if (!l) return DEFAULT_BLOCKS;
  // Неизвестные блоки отбрасываем, недостающие добавляем в конец — раскладка всегда валидна.
  const known = l.blocks.filter((b) => DEFAULT_BLOCKS.some((d) => d.id === b.id));
  return [...known, ...DEFAULT_BLOCKS.filter((d) => !known.some((b) => b.id === d.id))];
}

export async function saveHomeLayout(viewer: Viewer, blocks: HomeBlock[]) {
  await withDb(ctxOf(viewer), (tx) =>
    tx
      .insert(homeLayouts)
      .values({ userId: viewer.userId, blocks })
      .onConflictDoUpdate({ target: homeLayouts.userId, set: { blocks, updatedAt: new Date() } }),
  );
}
