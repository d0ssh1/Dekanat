/**
 * Применяет миграции от имени владельца схемы и готовит роль приложения app_user.
 * Пароль app_user берётся из APP_DB_PASSWORD и никогда не попадает в файлы миграций.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const ownerUrl = process.env.DATABASE_OWNER_URL;
const appPassword = process.env.APP_DB_PASSWORD;
if (!ownerUrl || !appPassword) {
  console.error('Нужны DATABASE_OWNER_URL и APP_DB_PASSWORD (см. .env.example)');
  process.exit(1);
}

const sql = postgres(ownerUrl, { max: 1, onnotice: () => {} });
try {
  const roleRows = await sql<
    { exists: boolean }[]
  >`select exists(select from pg_roles where rolname = 'app_user')`;
  if (!roleRows[0]?.exists)
    await sql.unsafe('CREATE ROLE app_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
  const stmtRows = await sql<
    { stmt: string }[]
  >`select format('ALTER ROLE app_user WITH LOGIN PASSWORD %L', ${appPassword}::text) as stmt`;
  await sql.unsafe(stmtRows[0]!.stmt);
  const dbRows = await sql<{ db: string }[]>`select current_database() as db`;
  await sql.unsafe(`GRANT CONNECT ON DATABASE "${dbRows[0]!.db.replace(/"/g, '""')}" TO app_user`);

  await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  console.log('Миграции применены, роль app_user готова.');
} finally {
  await sql.end();
}
