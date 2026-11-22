import 'server-only';
import { sql } from 'drizzle-orm';
import { withDb } from '@/server/db';

export async function databaseIsUp(): Promise<boolean> {
  try {
    await withDb({ role: 'system' }, (tx) => tx.execute(sql`select 1`));
    return true;
  } catch {
    return false;
  }
}
