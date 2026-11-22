/** Полностью очищает БД разработки. В продакшене требует явного флага --force. */
import 'dotenv/config';
import postgres from 'postgres';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Отказ: сброс в production только с флагом --force');
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_OWNER_URL ?? '', { max: 1, onnotice: () => {} });
try {
  await sql.unsafe(
    'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS app CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;',
  );
  console.log('БД очищена.');
} finally {
  await sql.end();
}
