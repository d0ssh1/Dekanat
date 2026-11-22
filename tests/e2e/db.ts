import postgres from 'postgres';

/** Прямой доступ владельцем БД — только чтобы тест узнал id чужих объектов для попытки IDOR. */
export async function ownerQuery<T extends postgres.Row>(
  fn: (sql: postgres.Sql) => Promise<T[]>,
): Promise<T[]> {
  const sql = postgres(process.env.DATABASE_OWNER_URL!, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

export async function idOf(kind: 'kimCourse' | 'kimRequest' | 'alinaRequest') {
  const rows = await ownerQuery<{ id: string }>((sql) => {
    if (kind === 'kimCourse')
      return sql`select c.id from courses c join groups g on g.id = c.group_id where g.short = 'ЗР-21' and c.semester = '2026-осень' limit 1`;
    const login = kind === 'kimRequest' ? 'daniil.kim' : 'alina.vorontsova';
    return sql`select r.id from requests r join users u on u.id = r.student_id where u.login = ${login} order by r.number limit 1`;
  });
  return rows[0]!.id;
}
