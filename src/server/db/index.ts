import 'server-only';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Контекст, в котором выполняется запрос. Он попадает в настройки транзакции
 * (app.user_id, app.role), и политики RLS в БД проверяют каждую строку.
 * См. drizzle/0001_security.sql.
 */
export type DbContext =
  | { role: 'student'; userId: string }
  | { role: 'staff'; userId: string }
  | { role: 'auth' }
  | { role: 'system' }
  /** Без пользователя: личные строки не видны (публичная проверка справки). */
  | { role: 'anon' };

type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

declare global {
  // переживает горячую перезагрузку в dev, чтобы не плодить пулы
  var __dekanatSql: ReturnType<typeof postgres> | undefined;
}

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL не задан');
  globalThis.__dekanatSql ??= postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 30,
    onnotice: () => {},
  });
  return globalThis.__dekanatSql;
}

let dbInstance: Db | undefined;
function db(): Db {
  dbInstance ??= drizzle(client(), { schema });
  return dbInstance;
}

/**
 * Единственный способ выполнить запрос к БД из приложения.
 * Все операции внутри fn идут в одной транзакции с установленным контекстом.
 */
export async function withDb<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const userId = 'userId' in ctx ? ctx.userId : '';
  return db().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${userId}, true), set_config('app.role', ${ctx.role}, true)`,
    );
    return fn(tx);
  });
}

/** Отдельное соединение для LISTEN (реальное время), см. src/server/events. */
export function rawClient() {
  return client();
}

export { schema };
