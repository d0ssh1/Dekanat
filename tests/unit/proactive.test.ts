import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { runProactive } from '@/server/proactive';
import { anchorMonday } from '../../seed/calendar';
import { at } from '@/lib/time';

/** Проактивные напоминания: приходят, но ровно один раз. */
describe('проактивные напоминания', () => {
  beforeAll(() => {
    execSync('npm run db:seed', { stdio: 'ignore' });
  });
  afterAll(async () => {
    await globalThis.__dekanatSql?.end();
  });

  it('в понедельник напоминают о КТ в среду, повторный запуск ничего не дублирует', async () => {
    const monday = at(anchorMonday(), '10:00');
    const first = await runProactive(new Date(monday.getTime() + 24 * 3600_000));
    expect(first.skipped).toBe(false);
    expect(first.sent).toBeGreaterThan(0);
    const second = await runProactive(new Date(monday.getTime() + 24 * 3600_000));
    expect(second.sent).toBe(0);
  });
});
