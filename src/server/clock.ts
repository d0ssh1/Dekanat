import 'server-only';

/**
 * «Сейчас» для страниц. В разработке можно подменить через ?now=2026-11-23T10:00+10:00 —
 * чтобы проверить экран в любой момент дня. В продакшене подмена игнорируется
 * (для жюри будет отдельное «демо-время» в профиле).
 */
export function resolveNow(param: unknown): Date {
  // ALLOW_TIME_OVERRIDE=1 включают только в CI для сценариев; на сервере для жюри его нет.
  const allowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TIME_OVERRIDE === '1';
  if (allowed && typeof param === 'string') {
    const t = Date.parse(param);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return new Date();
}
