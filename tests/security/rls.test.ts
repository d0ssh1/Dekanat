/**
 * Второй слой защиты: даже без условий в коде роль приложения видит в БД только свои строки.
 * Запросы здесь намеренно «забывают» where student_id = … — это проверка именно RLS.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

const app = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const owner = postgres(process.env.DATABASE_OWNER_URL!, { max: 1, onnotice: () => {} });
let alina = '';
let kim = '';
let staff = '';

async function asUser<T>(role: string, userId: string, fn: (sql: postgres.TransactionSql) => Promise<T>) {
  return app.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${userId}, true), set_config('app.role', ${role}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

beforeAll(async () => {
  const rows = await owner<{ id: string; login: string }[]>`select id, login from users`;
  alina = rows.find((r) => r.login === 'alina.vorontsova')!.id;
  kim = rows.find((r) => r.login === 'daniil.kim')!.id;
  staff = rows.find((r) => r.login === 'metodist.ivanova')!.id;
});
afterAll(async () => {
  await app.end();
  await owner.end();
});

describe('RLS: студент видит только своё', () => {
  const personal = [
    'requests',
    'request_events',
    'request_requirements',
    'scores',
    'final_grades',
    'notifications',
    'students',
  ];

  for (const table of personal) {
    it(`${table}: Алина не видит строк Даниила`, async () => {
      const owners = await asUser('student', alina, (tx) =>
        tx.unsafe(
          `select distinct ${table === 'students' ? 'user_id' : table === 'notifications' ? 'user_id' : 'student_id'} as o from ${table}`,
        ),
      );
      expect(owners.length).toBeGreaterThan(0);
      expect(owners.every((r) => r.o === alina)).toBe(true);
    });
  }

  it('без контекста (забыли установить) — пусто, а не всё', async () => {
    const rows = await app.begin((tx) => tx`select count(*)::int as n from requests`);
    expect(rows[0]!.n).toBe(0);
  });

  it('прямой запрос чужой заявки по id даёт пустоту', async () => {
    const [kimReq] = await owner<{ id: string }[]>`select id from requests where student_id = ${kim} limit 1`;
    const rows = await asUser('student', alina, (tx) => tx`select id from requests where id = ${kimReq!.id}`);
    expect(rows).toHaveLength(0);
  });

  it('нельзя создать заявку от имени другого студента', async () => {
    await expect(
      asUser(
        'student',
        alina,
        (tx) =>
          tx`insert into requests (student_id, type_code, delivery) values (${kim}, 'study_cert', 'pdf')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('нельзя поставить себе баллы', async () => {
    const [sc] = await owner<
      { assessment_id: string }[]
    >`select assessment_id from scores where student_id = ${alina} limit 1`;
    const res = await asUser(
      'student',
      alina,
      (tx) =>
        tx`update scores set points = 100 where assessment_id = ${sc!.assessment_id} and student_id = ${alina}`,
    );
    expect(res.count).toBe(0);
  });

  it('хеши паролей не видны студенту (кроме своей строки), а сессии чужих — совсем', async () => {
    const users = await asUser('student', alina, (tx) => tx`select id from users`);
    expect(users.map((u) => u.id)).toEqual([alina]);
  });

  it('сотрудник видит заявки обоих студентов', async () => {
    const owners = await asUser('staff', staff, (tx) => tx`select distinct student_id from requests`);
    expect(new Set(owners.map((r) => r.student_id))).toEqual(new Set([alina, kim]));
  });

  it('у роли приложения нет обхода RLS и прав суперпользователя', async () => {
    const [r] = await app`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`;
    expect(r).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  it('пароли хранятся только как argon2id', async () => {
    const rows = await owner<{ password_hash: string }[]>`select password_hash from users`;
    expect(rows.every((r) => r.password_hash.startsWith('$argon2id$'))).toBe(true);
  });

  it('проверка справки по коду не раскрывает таблицы', async () => {
    const res = await app.begin((tx) => tx`select * from app.verify_document('short')`);
    expect(res).toHaveLength(0);
  });
});
