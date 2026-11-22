/**
 * Тесты работают в отдельной базе `<имя>_e2e`, а не в базе разработки.
 * Иначе каждый прогон пересоздаёт данные (сид), стирает сессии и упирается в лимит входа
 * у того, кто в это время смотрит кабинет в браузере.
 */
import { execSync } from 'node:child_process';
import postgres from 'postgres';

const swapDb = (url: string | undefined) =>
  url?.replace(/\/([^/?]+)(\?|$)/, (_, db: string, tail: string) =>
    db.endsWith('_e2e') ? `/${db}${tail}` : `/${db}_e2e${tail}`,
  );

/** Переключает process.env на тестовую базу. В CI база и так отдельная — ничего не меняет. */
export function switchToTestDb() {
  if (process.env.CI || process.env.E2E_BASE_URL) return false;
  process.env.DATABASE_URL = swapDb(process.env.DATABASE_URL);
  process.env.DATABASE_OWNER_URL = swapDb(process.env.DATABASE_OWNER_URL);
  process.env.STORAGE_DIR = './storage-e2e';
  return true;
}

/** Создаёт тестовую базу, если её нет, применяет миграции и заливает данные. */
export async function prepareTestDb() {
  const owner = process.env.DATABASE_OWNER_URL!;
  const name = new URL(owner).pathname.slice(1);
  const admin = postgres(owner.replace(`/${name}`, '/postgres'), { max: 1, onnotice: () => {} });
  try {
    const [row] = await admin`select exists(select from pg_database where datname = ${name}) as e`;
    if (!row?.e) await admin.unsafe(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }
  execSync('npm run db:migrate', { stdio: 'ignore', env: process.env });
  execSync('npm run db:seed', { stdio: 'ignore', env: process.env });
}
