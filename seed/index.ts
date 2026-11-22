/**
 * Сид: вымышленные данные в реалиях ДВФУ.
 * Два студента с разными институтами, группами, расписанием и заявками + методист.
 * Переносы и заявки расставляются относительно «сейчас», поэтому кабинет живой в любой день.
 *
 * Запуск: npm run db:seed (от имени владельца схемы — RLS сиду не мешает).
 * Пароли берутся из SEED_PASSWORD_*, иначе из прошлого test-accounts.local.md, иначе генерируются и сохраняются туда (не в git).
 */
import 'dotenv/config';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import * as s from '../src/server/db/schema';
import { SEMESTER } from '../src/lib/university';
import { addDays, anchorMonday, at, hoursAgo, slotRange, todayLocal, weekday } from './calendar';
import { ARGON2_OPTIONS } from '../src/server/auth/password-params';

const ownerUrl = process.env.DATABASE_OWNER_URL;
if (!ownerUrl) throw new Error('Нужен DATABASE_OWNER_URL');
const client = postgres(ownerUrl, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema: s });

const now = new Date();
const A = anchorMonday(now); // понедельник текущей учебной недели
const today = todayLocal(now);

// ---------------- Пароли ----------------
const WORDS = [
  'kampus',
  'russky',
  'zaliv',
  'mayak',
  'sopka',
  'priliv',
  'parus',
  'veter',
  'kater',
  'buhta',
  'skala',
  'volna',
];
function genPassword() {
  const w = () => WORDS[randomInt(WORDS.length)]!;
  return `${w()}-${w()}-${randomInt(10, 99)}${randomBytes(1).toString('hex')}`;
}
/**
 * Пароль из прошлого сида: пересоздание данных (и прогон тестов) не должно менять пароли —
 * иначе у того, кто уже вошёл или помнит пароль, вход внезапно перестаёт работать.
 */
function previousPassword(login: string) {
  if (!existsSync('test-accounts.local.md')) return undefined;
  const row = readFileSync('test-accounts.local.md', 'utf8')
    .split(/\r?\n/)
    .map((l) => l.split('|').map((c) => c.trim()))
    .find((c) => c[2] === login);
  return row?.[3] || undefined;
}
const passwords = {
  student1: process.env.SEED_PASSWORD_STUDENT1 || previousPassword('alina.vorontsova') || genPassword(),
  student2: process.env.SEED_PASSWORD_STUDENT2 || previousPassword('daniil.kim') || genPassword(),
  staff: process.env.SEED_PASSWORD_STAFF || previousPassword('metodist.ivanova') || genPassword(),
};

// ---------------- Справочники ----------------
const T = {
  kozlov: ['Козлов', 'Дмитрий', 'Сергеевич', 'доцент'],
  petrova: ['Петрова', 'Елена', 'Викторовна', 'ст. преподаватель'],
  smirnov: ['Смирнов', 'Игорь', 'Андреевич', 'доцент'],
  orlova: ['Орлова', 'Наталья', 'Сергеевна', 'профессор'],
  belov: ['Белов', 'Артём', 'Николаевич', 'ст. преподаватель'],
  zakharova: ['Захарова', 'Марина', 'Игоревна', 'доцент'],
  pak: ['Пак', 'Юлия', 'Ёнировна', 'ст. преподаватель'],
  lee: ['Ли', 'Сергей', 'Андреевич', 'доцент'],
  nikitina: ['Никитина', 'Ольга', 'Павловна', 'доцент'],
  sokolov: ['Соколов', 'Павел', 'Ильич', 'преподаватель'],
  gromova: ['Громова', 'Анна', 'Петровна', 'доцент'],
  fedorov: ['Федоров', 'Кирилл', 'Олегович', 'профессор'],
} as const;
type TeacherKey = keyof typeof T;

type CourseDef = {
  key: string;
  subject: string;
  short: string;
  teacher: TeacherKey;
  control: 'exam' | 'credit' | 'diff_credit';
  threshold: number;
  color: string;
};
type Slot = [weekday: number, slot: number, course: string, kind: s.LessonKindValue, room: string | null];

const PI_COURSES: CourseDef[] = [
  {
    key: 'ml',
    subject: 'Машинное обучение',
    short: 'ML',
    teacher: 'kozlov',
    control: 'exam',
    threshold: 50,
    color: '#FF6B2C',
  },
  {
    key: 'db',
    subject: 'Базы данных',
    short: 'БД',
    teacher: 'smirnov',
    control: 'exam',
    threshold: 40,
    color: '#7C5CFF',
  },
  {
    key: 'stat',
    subject: 'Математическая статистика',
    short: 'Матстат',
    teacher: 'orlova',
    control: 'exam',
    threshold: 35,
    color: '#0B8F6A',
  },
  {
    key: 'web',
    subject: 'Веб-разработка',
    short: 'Веб',
    teacher: 'belov',
    control: 'diff_credit',
    threshold: 61,
    color: '#1E44C4',
  },
  {
    key: 'eng',
    subject: 'Английский язык',
    short: 'Английский',
    teacher: 'petrova',
    control: 'credit',
    threshold: 61,
    color: '#E0A100',
  },
  {
    key: 'phil',
    subject: 'Философия',
    short: 'Философия',
    teacher: 'zakharova',
    control: 'credit',
    threshold: 61,
    color: '#B14A8C',
  },
  {
    key: 'cw',
    subject: 'Курсовая работа по базам данных',
    short: 'Курсовая по БД',
    teacher: 'smirnov',
    control: 'diff_credit',
    threshold: 61,
    color: '#7C5CFF',
  },
];
const PI_WEEK: Slot[] = [
  [1, 1, 'db', 'lecture', 'D305'],
  [1, 2, 'ml', 'practice', 'D412'],
  [1, 3, 'eng', 'practice', null],
  [1, 4, 'web', 'practice', 'D220'],
  [2, 1, 'stat', 'lecture', 'D201'],
  [2, 2, 'web', 'lecture', 'D220'],
  [2, 3, 'db', 'lab', 'D404'],
  [2, 4, 'phil', 'seminar', 'D101'],
  [3, 2, 'stat', 'practice', 'D201'],
  [3, 3, 'db', 'practice', 'D404'],
  [3, 4, 'eng', 'practice', 'E118'],
  [4, 1, 'phil', 'lecture', 'D110'],
  [4, 2, 'ml', 'lecture', 'D101'],
  [4, 3, 'stat', 'practice', 'D203'],
  [4, 5, 'eng', 'practice', null],
  [4, 6, 'cw', 'consult', 'D404'],
  [5, 1, 'db', 'practice', 'D404'],
  [5, 2, 'eng', 'practice', 'E118'],
];

const KOR_COURSES: CourseDef[] = [
  {
    key: 'kor',
    subject: 'Корейский язык',
    short: 'Корейский',
    teacher: 'pak',
    control: 'exam',
    threshold: 50,
    color: '#FF6B2C',
  },
  {
    key: 'hist',
    subject: 'История Кореи',
    short: 'История Кореи',
    teacher: 'lee',
    control: 'exam',
    threshold: 40,
    color: '#7C5CFF',
  },
  {
    key: 'econ',
    subject: 'Экономика стран АТР',
    short: 'Экономика АТР',
    teacher: 'nikitina',
    control: 'credit',
    threshold: 61,
    color: '#0B8F6A',
  },
  {
    key: 'eng',
    subject: 'Английский язык',
    short: 'Английский',
    teacher: 'petrova',
    control: 'credit',
    threshold: 61,
    color: '#E0A100',
  },
  {
    key: 'geo',
    subject: 'Страноведение Кореи',
    short: 'Страноведение',
    teacher: 'lee',
    control: 'diff_credit',
    threshold: 61,
    color: '#1E44C4',
  },
  {
    key: 'pe',
    subject: 'Физическая культура',
    short: 'Физкультура',
    teacher: 'sokolov',
    control: 'credit',
    threshold: 61,
    color: '#B14A8C',
  },
];
const KOR_WEEK: Slot[] = [
  [1, 1, 'kor', 'practice', 'G461'],
  [1, 2, 'kor', 'practice', 'G461'],
  [1, 3, 'hist', 'lecture', 'G520'],
  [2, 2, 'econ', 'lecture', 'G307'],
  [2, 3, 'eng', 'practice', 'E214'],
  [3, 1, 'kor', 'practice', 'G461'],
  [3, 2, 'kor', 'practice', 'G461'],
  [3, 4, 'pe', 'practice', 'Спорткомплекс'],
  [4, 2, 'geo', 'seminar', 'G418'],
  [4, 3, 'eng', 'practice', null],
  [5, 1, 'kor', 'practice', 'G461'],
  [5, 2, 'hist', 'seminar', 'G520'],
];

const DOC_TYPES: (typeof s.documentTypes.$inferInsert)[] = [
  {
    code: 'study_cert',
    title: 'Справка об обучении',
    sort: 1,
    description: 'Подтверждает, что вы учитесь в вузе: для работы, банка, соцзащиты, МФЦ.',
    etaText: 'обычно 1 рабочий день',
    etaDaysMin: 1,
    etaDaysMax: 3,
    fields: [{ key: 'destination', label: 'Куда', type: 'text', default: 'по месту требования' }],
    deliveries: ['pdf', 'paper', 'pdf_and_paper'],
    requirements: [],
    legalBasis: 'Положение о справках, п. 1.3',
    keywords: ['обучени', 'учусь', 'работ', 'банк', 'мфц', 'соцзащит'],
    pickupPlace: 'D210',
  },
  {
    code: 'military',
    title: 'Справка в военкомат',
    sort: 2,
    description: 'Справка по форме 26 для военного комиссариата — отсрочка на время учёбы.',
    etaText: 'обычно 1 рабочий день',
    etaDaysMin: 1,
    etaDaysMax: 2,
    fields: [{ key: 'destination', label: 'Куда', type: 'text', default: 'Военный комиссариат (ф. 26)' }],
    deliveries: ['paper', 'pdf_and_paper'],
    requirements: [],
    legalBasis: 'Положение о справках, п. 2.1',
    keywords: ['военкомат', 'армия', 'армии', 'отсрочк', 'форма 26', 'ф. 26'],
    pickupPlace: 'D210',
  },
  {
    code: 'scholarship',
    title: 'Справка для стипендии',
    sort: 3,
    description: 'Для назначения социальной стипендии или стипендии по месту жительства.',
    etaText: 'обычно 1–2 дня',
    etaDaysMin: 1,
    etaDaysMax: 5,
    fields: [{ key: 'destination', label: 'Куда', type: 'text', default: 'стипендиальная комиссия' }],
    deliveries: ['pdf', 'pdf_and_paper'],
    requirements: [],
    legalBasis: 'Положение о стипендиальном обеспечении, п. 4.2',
    keywords: ['стипенди'],
    pickupPlace: 'D210',
  },
  {
    code: 'material_aid',
    title: 'Материальная помощь',
    sort: 4,
    description: 'Заявление на разовую выплату. Решение принимает комиссия, она собирается раз в две недели.',
    etaText: 'решение — на ближайшей комиссии',
    etaDaysMin: 7,
    etaDaysMax: 20,
    fields: [
      {
        key: 'reason',
        label: 'Основание',
        type: 'select',
        options: ['Трудная жизненная ситуация', 'Малообеспеченная семья', 'Лечение', 'Другое'],
      },
    ],
    deliveries: ['pdf'],
    requirements: ['Заявление', 'Копия паспорта', 'Справка о доходах семьи'],
    legalBasis: 'Положение о материальной поддержке обучающихся',
    keywords: ['материальн', 'матпомощ', 'деньги', 'выплат'],
  },
  {
    code: 'retake',
    title: 'Направление на пересдачу',
    sort: 5,
    description: 'Направление на повторную сдачу экзамена или зачёта.',
    etaText: 'обычно 1 рабочий день',
    etaDaysMin: 1,
    etaDaysMax: 2,
    fields: [{ key: 'course', label: 'Предмет', type: 'text' }],
    deliveries: ['pdf'],
    requirements: [],
    legalBasis: 'Положение о текущем контроле и аттестации, п. 6.4',
    keywords: ['пересдач', 'хвост', 'не сдал'],
  },
  {
    code: 'call_cert',
    title: 'Справка-вызов на сессию',
    sort: 6,
    description: 'Для работодателя: учебный отпуск на время сессии.',
    etaText: 'обычно 2–3 рабочих дня',
    etaDaysMin: 2,
    etaDaysMax: 5,
    fields: [{ key: 'employer', label: 'Работодатель', type: 'text' }],
    deliveries: ['paper', 'pdf_and_paper'],
    requirements: [],
    legalBasis: 'Трудовой кодекс РФ, ст. 174',
    keywords: ['вызов', 'работодател', 'учебный отпуск'],
    pickupPlace: 'D210',
  },
  {
    code: 'grade_extract',
    title: 'Выписка из зачётной книжки',
    sort: 7,
    description: 'Все оценки за прошедшие сессии — для перевода, стажировки, конкурса.',
    etaText: 'обычно 3 рабочих дня',
    etaDaysMin: 2,
    etaDaysMax: 5,
    fields: [{ key: 'destination', label: 'Куда', type: 'text', default: 'по месту требования' }],
    deliveries: ['pdf', 'pdf_and_paper'],
    requirements: [],
    legalBasis: 'Положение о справках, п. 3.2',
    keywords: ['выписк', 'оценки', 'зачётк', 'зачетк'],
    pickupPlace: 'D210',
  },
  {
    code: 'english_cert',
    title: 'Справка об обучении на английском',
    sort: 8,
    description: 'Для визы, стажировки или обмена за рубежом.',
    etaText: 'обычно 3–5 рабочих дней',
    etaDaysMin: 3,
    etaDaysMax: 7,
    fields: [{ key: 'destination', label: 'Куда', type: 'text', default: 'Embassy / visa center' }],
    deliveries: ['pdf', 'pdf_and_paper'],
    requirements: [],
    legalBasis: 'Положение о справках, п. 1.5',
    keywords: ['английск', 'виза', 'визы', 'посольств', 'обмен', 'стажировк'],
    pickupPlace: 'D210',
  },
];

// ---------------- Генерация ----------------
async function main() {
  console.log(`Сид: сегодня ${today}, учебная неделя с ${A}`);

  // Чистим всё, кроме журнала миграций.
  const tables = await client<
    { t: string }[]
  >`select tablename as t from pg_tables where schemaname = 'public'`;
  if (tables.length)
    await client.unsafe(`TRUNCATE ${tables.map((x) => `"${x.t}"`).join(', ')} RESTART IDENTITY CASCADE`);

  // Институты и группы
  const imct = randomUUID();
  const vi = randomUUID();
  await db.insert(s.institutes).values([
    { id: imct, name: 'Институт математики и компьютерных технологий', short: 'ИМКТ' },
    {
      id: vi,
      name: 'Восточный институт — Школа региональных и международных исследований',
      short: 'ВИ-ШРМИ',
    },
  ]);
  const gPI = randomUUID();
  const gKOR = randomUUID();
  await db.insert(s.groups).values([
    {
      id: gPI,
      code: 'Б9124-09.03.03пи',
      short: 'ПИ-31',
      instituteId: imct,
      directionCode: '09.03.03',
      directionName: 'Прикладная информатика',
      profile: 'Разработка информационных систем',
      course: 3,
    },
    {
      id: gKOR,
      code: 'Б3125-41.03.01кор',
      short: 'ЗР-21',
      instituteId: vi,
      directionCode: '41.03.01',
      directionName: 'Зарубежное регионоведение',
      profile: 'Корея',
      course: 2,
    },
  ]);

  // Преподаватели
  const teacherIds = {} as Record<TeacherKey, string>;
  await db.insert(s.teachers).values(
    (Object.keys(T) as TeacherKey[]).map((k) => {
      const [lastName, firstName, middleName, title] = T[k];
      teacherIds[k] = randomUUID();
      return { id: teacherIds[k], lastName, firstName, middleName, title };
    }),
  );

  // Пользователи
  const [h1, h2, h3] = await Promise.all([
    hash(passwords.student1, ARGON2_OPTIONS),
    hash(passwords.student2, ARGON2_OPTIONS),
    hash(passwords.staff, ARGON2_OPTIONS),
  ]);
  const uAlina = randomUUID();
  const uKim = randomUUID();
  const uStaff = randomUUID();
  // Служебный вход для быстрой проверки: копия учёбы Алины в той же группе (без заявок и уведомлений).
  const uAdmin = randomUUID();
  const hAdmin = await hash('admin', ARGON2_OPTIONS);
  const withAdmin = (studentId: string) => (studentId === uAlina ? [studentId, uAdmin] : [studentId]);
  await db.insert(s.users).values([
    { id: uAdmin, login: 'admin', passwordHash: hAdmin, role: 'student' },
    { id: uAlina, login: 'alina.vorontsova', passwordHash: h1, role: 'student' },
    { id: uKim, login: 'daniil.kim', passwordHash: h2, role: 'student' },
    { id: uStaff, login: 'metodist.ivanova', passwordHash: h3, role: 'staff' },
  ]);
  await db.insert(s.students).values([
    {
      userId: uAdmin,
      lastName: 'Воронцова',
      firstName: 'Алина',
      middleName: 'Дмитриевна',
      groupId: gPI,
      recordBook: '2024-ПИ-0001',
      email: 'admin@students.dekanat.test',
      avatarColor: '#FFC21A',
    },
    {
      userId: uAlina,
      lastName: 'Воронцова',
      firstName: 'Алина',
      middleName: 'Дмитриевна',
      groupId: gPI,
      recordBook: '2024-ПИ-0417',
      email: 'a.vorontsova@students.dekanat.test',
      avatarColor: '#FFC21A',
    },
    {
      userId: uKim,
      lastName: 'Ким',
      firstName: 'Даниил',
      middleName: 'Сергеевич',
      groupId: gKOR,
      recordBook: '2025-ЗР-0112',
      email: 'd.kim@students.dekanat.test',
      avatarColor: '#7CC4FF',
    },
  ]);
  await db.insert(s.staff).values({
    userId: uStaff,
    lastName: 'Иванова',
    firstName: 'Ольга',
    middleName: 'Петровна',
    position: 'Методист дирекции ИМКТ',
    instituteId: imct,
  });

  // Предметы и курсы текущего семестра
  const subjectIds = new Map<string, string>();
  async function subjectId(name: string, short: string) {
    if (!subjectIds.has(name)) {
      const id = randomUUID();
      subjectIds.set(name, id);
      await db.insert(s.subjects).values({ id, name, short });
    }
    return subjectIds.get(name)!;
  }
  async function makeCourses(groupId: string, defs: CourseDef[]) {
    const ids: Record<string, string> = {};
    for (const c of defs) {
      ids[c.key] = randomUUID();
      await db.insert(s.courses).values({
        id: ids[c.key],
        subjectId: await subjectId(c.subject, c.short),
        groupId,
        teacherId: teacherIds[c.teacher],
        semester: SEMESTER.code,
        controlType: c.control,
        admissionThreshold: c.threshold,
        color: c.color,
      });
    }
    return ids;
  }
  const piC = await makeCourses(gPI, PI_COURSES);
  const korC = await makeCourses(gKOR, KOR_COURSES);

  // Занятия на весь семестр
  type LessonRow = typeof s.lessons.$inferInsert & { id: string };
  function genLessons(groupId: string, defs: CourseDef[], ids: Record<string, string>, week: Slot[]) {
    const rows: LessonRow[] = [];
    for (let d: string = SEMESTER.classesFrom; d <= SEMESTER.classesTo; d = addDays(d, 1)) {
      if ((SEMESTER.holidays as readonly string[]).includes(d)) continue;
      const wd = weekday(d);
      for (const [w, slot, key, kind, room] of week) {
        if (w !== wd) continue;
        const def = defs.find((c) => c.key === key)!;
        rows.push({
          id: randomUUID(),
          courseId: ids[key]!,
          groupId,
          teacherId: teacherIds[def.teacher],
          slot,
          kind,
          format: room ? 'offline' : 'online',
          room,
          onlineUrl: room ? null : 'https://meet.dekanat.test/' + key,
          ...slotRange(d, slot),
        });
      }
    }
    return rows;
  }
  const piLessons = genLessons(gPI, PI_COURSES, piC, PI_WEEK);
  const korLessons = genLessons(gKOR, KOR_COURSES, korC, KOR_WEEK);

  const findLesson = (rows: LessonRow[], day: string, slot: number) =>
    rows.find((r) => r.startsAt.getTime() === slotRange(day, slot).startsAt.getTime())!;
  const changedAt = hoursAgo(20, now);

  // Изменения этой недели (ПИ-31): замена аудитории ML и перенос веба с пн на чт.
  const ml = findLesson(piLessons, A, 2);
  Object.assign(ml, {
    previousRoom: ml.room,
    room: 'D734',
    changeNote: 'Замена аудитории · 7 этаж, лифт у входа со стороны залива',
    changedAt,
  });
  const webMon = findLesson(piLessons, A, 4);
  const thu = addDays(A, 3);
  const webThu: LessonRow = {
    ...webMon,
    id: randomUUID(),
    ...slotRange(thu, 4),
    status: 'scheduled',
    movedFromId: webMon.id,
    changeNote: 'Перенесена с понедельника',
    changedAt,
  };
  Object.assign(webMon, {
    status: 'moved',
    changeNote: `Перенесена на чт, ${addDays(A, 3).slice(8)}.${addDays(A, 3).slice(5, 7)}, 13:30`,
    changedAt,
  });
  piLessons.push(webThu);
  // Изменения (ЗР-21): отмена экономики во вт и замена аудитории в чт.
  Object.assign(findLesson(korLessons, addDays(A, 1), 2), {
    status: 'cancelled',
    changeNote: 'Преподаватель на конференции, занятие отменено',
    changedAt,
  });
  const geo = findLesson(korLessons, addDays(A, 3), 2);
  Object.assign(geo, { previousRoom: geo.room, room: 'G605', changeNote: 'Замена аудитории', changedAt });

  // Экзамены и зачёты в сессию
  const exam = (
    groupId: string,
    courseId: string,
    teacher: TeacherKey,
    day: string,
    room: string,
  ): LessonRow => ({
    id: randomUUID(),
    courseId,
    groupId,
    teacherId: teacherIds[teacher],
    slot: 2,
    kind: 'exam',
    format: 'offline',
    room,
    ...slotRange(day, 2),
  });
  piLessons.push(
    exam(gPI, piC.web!, 'belov', '2026-12-16', 'D220'),
    exam(gPI, piC.stat!, 'orlova', '2026-12-21', 'D201'),
    exam(gPI, piC.db!, 'smirnov', '2026-12-25', 'D404'),
    exam(gPI, piC.ml!, 'kozlov', '2026-12-28', 'D734'),
  );
  korLessons.push(
    exam(gKOR, korC.kor!, 'pak', '2026-12-23', 'G461'),
    exam(gKOR, korC.hist!, 'lee', '2026-12-27', 'G520'),
  );
  await db.insert(s.lessons).values([...piLessons, ...korLessons]);

  // Контрольные точки и баллы
  type A3 = [title: string, kind: s.AssessmentKindValue, max: number, due: string, score: number | null];
  async function assess(courseId: string, studentId: string, list: A3[]) {
    let sort = 0;
    for (const [title, kind, max, due, score] of list) {
      const id = randomUUID();
      await db
        .insert(s.assessments)
        .values({ id, courseId, title, kind, maxPoints: max, dueAt: at(due, '23:59'), sort: sort++ });
      if (score !== null)
        await db.insert(s.scores).values(
          withAdmin(studentId).map((sid) => ({
            assessmentId: id,
            studentId: sid,
            points: score,
            gradedAt: at(due, '18:00'),
          })),
        );
    }
  }
  const wed = addDays(A, 2);
  await assess(piC.ml!, uAlina, [
    ['Посещение', 'attendance', 10, '2026-12-19', 10],
    ['Лабораторная 1', 'lab', 8, '2026-09-22', 7],
    ['Лабораторная 2', 'lab', 8, '2026-10-13', 7],
    ['Лабораторная 3', 'lab', 7, '2026-10-27', 7],
    ['Лабораторная 4', 'lab', 7, '2026-11-10', 7],
    ['Лабораторная 5', 'lab', 5, '2026-12-04', null],
    ['Контрольная точка', 'kt', 15, '2026-10-20', 10],
    ['Экзамен', 'exam', 40, '2026-12-28', null],
  ]);
  await assess(piC.stat!, uAlina, [
    ['Посещение', 'attendance', 10, '2026-12-19', 10],
    ['КТ 1', 'kt', 15, '2026-10-07', 14],
    ['Домашние задания', 'test', 15, '2026-11-18', 13],
    ['КТ 2', 'kt', 20, wed, null],
    ['Экзамен', 'exam', 40, '2026-12-21', null],
  ]);
  await assess(piC.db!, uAlina, [
    ['Посещение', 'attendance', 10, '2026-12-19', 9],
    ['Лабораторная 1', 'lab', 10, '2026-09-29', 10],
    ['Лабораторная 2', 'lab', 10, '2026-10-20', 9],
    ['Лабораторная 3', 'lab', 10, '2026-11-17', 10],
    ['Контрольная точка', 'kt', 15, '2026-10-28', 13],
    ['Экзамен', 'exam', 45, '2026-12-25', null],
  ]);
  await assess(piC.web!, uAlina, [
    ['Посещение', 'attendance', 10, '2026-12-19', 10],
    ['Лабораторная 1', 'lab', 15, '2026-09-24', 14],
    ['Лабораторная 2', 'lab', 15, '2026-10-15', 13],
    ['Лабораторная 3', 'lab', 15, '2026-11-12', 15],
    ['Лабораторная 4', 'lab', 15, '2026-12-09', null],
    ['Итоговый проект', 'coursework', 30, '2026-12-14', null],
  ]);
  await assess(piC.eng!, uAlina, [
    ['Посещение', 'attendance', 20, '2026-12-19', 18],
    ['Тест 1', 'test', 20, '2026-09-30', 16],
    ['Тест 2', 'test', 20, '2026-10-28', 17],
    ['Тест 3', 'test', 20, '2026-12-02', null],
    ['Итоговый тест', 'test', 20, '2026-12-16', null],
  ]);
  await assess(piC.phil!, uAlina, [
    ['Посещение', 'attendance', 20, '2026-12-19', 17],
    ['Эссе', 'coursework', 30, '2026-11-05', 25],
    ['Работа на семинарах', 'test', 50, '2026-12-17', 34],
  ]);
  await assess(piC.cw!, uAlina, [
    ['Глава 1: анализ предметной области', 'coursework', 30, '2026-10-30', 27],
    ['Глава 2: проектирование БД', 'coursework', 30, addDays(A, 6), null],
    ['Защита', 'exam', 40, '2026-12-18', null],
  ]);
  await assess(korC.kor!, uKim, [
    ['Посещение', 'attendance', 10, '2026-12-19', 10],
    ['Диктант 1', 'test', 15, '2026-10-02', 14],
    ['Диктант 2', 'test', 15, '2026-11-06', 12],
    ['Диктант 3', 'test', 15, '2026-12-04', null],
    ['Контрольная точка', 'kt', 5, '2026-10-23', 5],
    ['Экзамен', 'exam', 40, '2026-12-23', null],
  ]);
  await assess(korC.hist!, uKim, [
    ['Контрольная точка', 'kt', 20, '2026-10-21', 15],
    ['Реферат', 'coursework', 20, '2026-11-20', 18],
    ['Семинары', 'test', 20, '2026-12-18', 11],
    ['Экзамен', 'exam', 40, '2026-12-27', null],
  ]);
  await assess(korC.econ!, uKim, [
    ['Тест', 'test', 30, '2026-10-29', 24],
    ['Доклад', 'coursework', 30, '2026-11-26', null],
    ['Посещение', 'attendance', 40, '2026-12-19', 33],
  ]);
  await assess(korC.eng!, uKim, [
    ['Посещение', 'attendance', 20, '2026-12-19', 19],
    ['Тест 1', 'test', 40, '2026-10-14', 35],
    ['Итоговый тест', 'test', 40, '2026-12-16', null],
  ]);
  await assess(korC.geo!, uKim, [
    ['Доклад', 'coursework', 30, '2026-10-30', 26],
    ['Семинары', 'test', 40, '2026-12-17', 28],
    ['Итоговая работа', 'coursework', 30, '2026-12-18', null],
  ]);
  await assess(korC.pe!, uKim, [['Посещение и нормативы', 'attendance', 100, '2026-12-19', 60]]);

  // Итоги прошлых сессий
  async function history(
    groupId: string,
    studentId: string,
    rows: [
      semester: string,
      subject: string,
      teacher: TeacherKey,
      control: 'exam' | 'credit' | 'diff_credit',
      grade: string,
      points: number | null,
      on: string,
    ][],
  ) {
    for (const [semester, subject, teacher, control, grade, points, on] of rows) {
      const courseId = randomUUID();
      await db.insert(s.courses).values({
        id: courseId,
        subjectId: await subjectId(subject, subject),
        groupId,
        teacherId: teacherIds[teacher],
        semester,
        controlType: control,
      });
      await db
        .insert(s.finalGrades)
        .values(
          withAdmin(studentId).map((sid) => ({ studentId: sid, courseId, grade, points, gradedOn: on })),
        );
    }
  }
  await history(gPI, uAlina, [
    ['2024-осень', 'Математический анализ', 'fedorov', 'exam', 'отлично', 91, '2025-01-14'],
    ['2024-осень', 'Программирование', 'belov', 'exam', 'отлично', 95, '2025-01-18'],
    ['2024-осень', 'История России', 'zakharova', 'exam', 'хорошо', 78, '2025-01-22'],
    ['2024-осень', 'Физическая культура', 'sokolov', 'credit', 'зачтено', null, '2024-12-26'],
    ['2025-весна', 'Алгебра и геометрия', 'fedorov', 'exam', 'хорошо', 80, '2025-06-16'],
    ['2025-весна', 'Дискретная математика', 'orlova', 'exam', 'отлично', 88, '2025-06-20'],
    ['2025-весна', 'Информатика', 'gromova', 'diff_credit', 'отлично', 93, '2025-06-10'],
    ['2025-весна', 'Английский язык', 'petrova', 'credit', 'зачтено', null, '2025-06-05'],
    ['2025-осень', 'Алгоритмы и структуры данных', 'kozlov', 'exam', 'отлично', 90, '2026-01-15'],
    ['2025-осень', 'Теория вероятностей', 'orlova', 'exam', 'хорошо', 76, '2026-01-19'],
    ['2025-осень', 'Объектно-ориентированное программирование', 'belov', 'exam', 'отлично', 94, '2026-01-23'],
    ['2026-весна', 'Операционные системы', 'gromova', 'exam', 'хорошо', 82, '2026-06-15'],
    ['2026-весна', 'Компьютерные сети', 'smirnov', 'exam', 'отлично', 89, '2026-06-19'],
    ['2026-весна', 'Экономика', 'nikitina', 'diff_credit', 'хорошо', 79, '2026-06-09'],
    ['2026-весна', 'Архитектура ЭВМ', 'kozlov', 'exam', 'отлично', 86, '2026-06-23'],
  ]);
  await history(gKOR, uKim, [
    ['2025-осень', 'Корейский язык (базовый курс)', 'pak', 'exam', 'хорошо', 81, '2026-01-16'],
    ['2025-осень', 'Введение в регионоведение', 'lee', 'exam', 'отлично', 87, '2026-01-21'],
    ['2025-осень', 'История России', 'zakharova', 'exam', 'хорошо', 74, '2026-01-25'],
    ['2026-весна', 'Корейский язык', 'pak', 'exam', 'хорошо', 83, '2026-06-17'],
    ['2026-весна', 'География АТР', 'nikitina', 'diff_credit', 'отлично', 90, '2026-06-08'],
    ['2026-весна', 'Физическая культура', 'sokolov', 'credit', 'зачтено', null, '2026-06-01'],
  ]);

  // Типы документов и заявки
  await db.insert(s.documentTypes).values(DOC_TYPES);
  async function request(opts: {
    number: number;
    studentId: string;
    type: string;
    delivery: s.DeliveryValue;
    payload?: Record<string, string>;
    events: [status: s.RequestStatusValue, at: Date, actor: string | null, comment?: string][];
    etaFrom?: string;
    etaTo?: string;
    actionDueOn?: string;
    requirements?: [title: string, satisfied: Date | null][];
  }) {
    const id = randomUUID();
    const last = opts.events[opts.events.length - 1]!;
    await db.insert(s.requests).values({
      id,
      number: opts.number,
      studentId: opts.studentId,
      typeCode: opts.type,
      status: last[0],
      delivery: opts.delivery,
      payload: opts.payload ?? {},
      etaFrom: opts.etaFrom,
      etaTo: opts.etaTo,
      actionDueOn: opts.actionDueOn,
      createdAt: opts.events[0]![1],
      updatedAt: last[1],
    });
    await db.insert(s.requestEvents).values(
      opts.events.map(([status, when, actor, comment]) => ({
        requestId: id,
        studentId: opts.studentId,
        status,
        actorUserId: actor,
        actorName: actor === uStaff ? 'О. П. Иванова' : 'вы',
        comment,
        createdAt: when,
      })),
    );
    if (opts.requirements?.length)
      await db.insert(s.requestRequirements).values(
        opts.requirements.map(([title, sat], i) => ({
          requestId: id,
          studentId: opts.studentId,
          title,
          satisfiedAt: sat,
          sort: i,
        })),
      );
    return id;
  }
  const nextWorkday = (() => {
    let d = addDays(today, 1);
    while (weekday(d) > 5) d = addDays(d, 1);
    return d;
  })();
  const r1047 = await request({
    number: 1047,
    studentId: uAlina,
    type: 'study_cert',
    delivery: 'pdf_and_paper',
    payload: { destination: 'по месту требования' },
    events: [
      ['sent', hoursAgo(74, now), uAlina],
      ['in_progress', hoursAgo(70, now), uStaff],
      [
        'ready',
        hoursAgo(52, now),
        uStaff,
        'Бумажную можно забрать в D210 до ' + addDays(today, 12).split('-').reverse().slice(0, 2).join('.'),
      ],
    ],
  });
  await request({
    number: 1052,
    studentId: uAlina,
    type: 'military',
    delivery: 'pdf_and_paper',
    payload: { destination: 'Военный комиссариат (ф. 26)' },
    events: [
      ['sent', hoursAgo(20, now), uAlina, 'через помощника'],
      ['in_progress', hoursAgo(18, now), uStaff],
    ],
    etaFrom: nextWorkday,
    etaTo: nextWorkday,
  });
  await request({
    number: 1058,
    studentId: uAlina,
    type: 'scholarship',
    delivery: 'pdf',
    payload: { destination: 'стипендиальная комиссия' },
    events: [
      ['sent', hoursAgo(26, now), uAlina, 'через помощника'],
      ['in_progress', hoursAgo(25.4, now), uStaff],
    ],
  });
  const r1031 = await request({
    number: 1031,
    studentId: uAlina,
    type: 'material_aid',
    delivery: 'pdf',
    payload: { reason: 'Малообеспеченная семья' },
    events: [
      ['sent', hoursAgo(96, now), uAlina],
      ['in_progress', hoursAgo(90, now), uStaff],
      ['need_action', hoursAgo(24, now), uStaff, 'Приложите справку о доходах семьи за последние 3 месяца'],
    ],
    actionDueOn: addDays(today, 3),
    requirements: [
      ['Заявление', hoursAgo(96, now)],
      ['Копия паспорта', hoursAgo(96, now)],
      ['Справка о доходах семьи', null],
    ],
  });
  await request({
    number: 1060,
    studentId: uKim,
    type: 'english_cert',
    delivery: 'pdf',
    payload: { destination: 'Korean Embassy, visa section' },
    events: [
      ['sent', hoursAgo(30, now), uKim],
      ['in_progress', hoursAgo(27, now), uStaff],
    ],
    etaFrom: addDays(today, 2),
    etaTo: addDays(today, 4),
  });
  await request({
    number: 1044,
    studentId: uKim,
    type: 'study_cert',
    delivery: 'pdf',
    payload: { destination: 'МФЦ' },
    events: [
      ['sent', hoursAgo(340, now), uKim],
      ['in_progress', hoursAgo(330, now), uStaff],
      ['ready', hoursAgo(310, now), uStaff],
      ['issued', hoursAgo(300, now), uStaff],
    ],
  });
  await request({
    number: 1061,
    studentId: uKim,
    type: 'call_cert',
    delivery: 'pdf_and_paper',
    payload: { employer: 'ООО «Тихоокеанский кофе»' },
    events: [['sent', hoursAgo(3, now), uKim]],
  });
  await client`select setval(pg_get_serial_sequence('requests', 'number'), (select max(number) from requests))`;

  // Уведомления
  const ddmm = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}`;
  await db.insert(s.notifications).values([
    {
      userId: uAlina,
      kind: 'change',
      title: 'ML в понедельник — в D734',
      body: 'Вместо D412 · 7 этаж, лифт у входа со стороны залива',
      link: '/week',
      createdAt: hoursAgo(20, now),
    },
    {
      userId: uAlina,
      kind: 'document',
      title: 'Справка №1047 готова',
      body: 'PDF с QR или бумажная в D210',
      link: `/documents/${r1047}`,
      createdAt: hoursAgo(52, now),
    },
    {
      userId: uAlina,
      kind: 'news',
      title: 'Запись на элективы',
      body: 'Открыта до 1 декабря · займёт 2 минуты',
      link: '/notifications',
      createdAt: hoursAgo(30, now),
    },
    {
      userId: uAlina,
      kind: 'change',
      title: 'Веб-разработка перенесена',
      body: `с пн ${ddmm(A)} на чт ${ddmm(thu)}, 13:30`,
      link: '/week',
      createdAt: hoursAgo(20.5, now),
      readAt: hoursAgo(19, now),
    },
    {
      userId: uAlina,
      kind: 'document',
      title: 'По заявке №1031 нужен документ',
      body: 'Справка о доходах семьи — до ' + ddmm(addDays(today, 3)),
      link: `/documents/${r1031}`,
      createdAt: hoursAgo(24, now),
      readAt: hoursAgo(23, now),
    },
    {
      userId: uKim,
      kind: 'change',
      title: 'Экономика АТР во вторник отменена',
      body: 'Преподаватель на конференции',
      link: '/week',
      createdAt: hoursAgo(20, now),
    },
    {
      userId: uKim,
      kind: 'document',
      title: 'Заявка №1060 принята в работу',
      body: 'Справка на английском · обычно 3–5 рабочих дней',
      link: '/documents',
      createdAt: hoursAgo(27, now),
    },
  ]);
  await db.insert(s.announcements).values({
    authorUserId: uStaff,
    title: 'Запись на элективы',
    body: 'Открыта до 1 декабря. Выбор займёт 2 минуты.',
    audience: { instituteIds: [imct] },
    publishedAt: hoursAgo(30, now),
  });

  const counts = await db.execute(
    sql`select (select count(*) from lessons) as lessons, (select count(*) from scores) as scores, (select count(*) from requests) as requests`,
  );
  console.log('Готово:', counts[0]);

  const accounts = `# Тестовые аккаунты (локально, не коммитить)\n\nСоздано: ${now.toISOString()}\n\n| Роль | Логин | Пароль |\n|---|---|---|\n| Студентка, ИМКТ, ПИ-31 | alina.vorontsova | ${passwords.student1} |\n| Студент, Восточный институт, ЗР-21 | daniil.kim | ${passwords.student2} |\n| Методист деканата | metodist.ivanova | ${passwords.staff} |\n`;
  writeFileSync('test-accounts.local.md', accounts);
  console.log('Пароли тестовых аккаунтов записаны в test-accounts.local.md');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
