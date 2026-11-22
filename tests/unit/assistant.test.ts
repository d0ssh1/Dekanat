import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { RulesProvider } from '@/server/ai/rules';
import { resolveDay } from '@/server/ai/tools';
import type { StudentViewer } from '@/server/auth/guards';

let viewer: StudentViewer;
const rules = new RulesProvider();
const ask = (question: string) =>
  rules.answer({
    viewer,
    now: new Date('2026-11-23T10:00:00+10:00'),
    firstName: 'Алина',
    history: [],
    question,
  });

beforeAll(async () => {
  const owner = postgres(process.env.DATABASE_OWNER_URL!, { max: 1 });
  const [u] = await owner<{ id: string }[]>`select id from users where login = 'alina.vorontsova'`;
  await owner.end();
  viewer = { role: 'student', userId: u!.id };
});
afterAll(async () => {
  await globalThis.__dekanatSql?.end();
});

describe('разбор дня из фразы', () => {
  it.each([
    ['что завтра', '2026-11-24'],
    ['пары послезавтра', '2026-11-25'],
    ['а в четверг?', '2026-11-26'],
    ['расписание на 27.11', '2026-11-27'],
  ])('«%s» → %s', (q, day) => expect(resolveDay(q, '2026-11-23')).toBe(day));
});

describe('помощник на правилах понимает разные формулировки', () => {
  it.each([
    ['нужна справка в военкомат', 'draft', 'military'],
    ['дайте справку для армии, отсрочка', 'draft', 'military'],
    ['справка что я учусь, для работы', 'draft', 'study_cert'],
    ['хочу матпомощь', 'draft', 'material_aid'],
    ['нужна справка на английском для визы', 'draft', 'english_cert'],
  ])('«%s» → черновик %s', async (q, kind, code) => {
    const r = await ask(q);
    expect(r.card?.kind).toBe(kind);
    expect(r.card && 'typeCode' in r.card ? r.card.typeCode : null).toBe(code);
  });

  it('статус заявок — список, без черновика', async () => {
    const r = await ask('что с моими заявками?');
    expect(r.card?.kind).toBe('answer');
    expect(r.text).toMatch(/№\d+/);
  });

  it('где взять справку о доходах — объяснение, а не заявка', async () => {
    const r = await ask('где взять справку о доходах?');
    expect(r.text).toMatch(/Госуслуг/);
  });

  it('баллы — называет предмет без допуска', async () => {
    const r = await ask('сколько не хватает до допуска');
    expect(r.text).toMatch(/Машинное обучение \(2\)/);
  });

  it('незнакомое — подсказывает, что умеет', async () => {
    const r = await ask('абвгд');
    expect(r.text).toMatch(/расписанием, баллами и справками/);
  });
});
