/**
 * Схема БД «деканат*». Описание решений — docs/architecture.md, §4.
 *
 * Важно: Row-Level Security, роли и функции контекста описаны вручную
 * в drizzle/0001_security.sql — их легко прочитать и проверить отдельно от схемы.
 */
import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const tsz = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => tsz('created_at').notNull().defaultNow();

// ---------- Перечисления ----------
export const userRole = pgEnum('user_role', ['student', 'staff']);
export const lessonKind = pgEnum('lesson_kind', ['lecture', 'practice', 'lab', 'seminar', 'consult', 'exam']);
export const lessonFormat = pgEnum('lesson_format', ['offline', 'online']);
export const lessonStatus = pgEnum('lesson_status', ['scheduled', 'moved', 'cancelled']);
export const controlType = pgEnum('control_type', ['exam', 'credit', 'diff_credit']);
export const assessmentKind = pgEnum('assessment_kind', [
  'kt',
  'lab',
  'test',
  'coursework',
  'attendance',
  'exam',
]);
export const requestStatus = pgEnum('request_status', [
  'sent',
  'in_progress',
  'need_action',
  'ready',
  'issued',
  'rejected',
  'cancelled',
]);
export const deliveryFormat = pgEnum('delivery_format', ['pdf', 'paper', 'pdf_and_paper']);
export const notificationKind = pgEnum('notification_kind', [
  'change',
  'deadline',
  'document',
  'grade',
  'news',
  'system',
]);

// ---------- Пользователи и сессии ----------
export const users = pgTable('users', {
  id: id(),
  login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull(),
  createdAt: createdAt(),
  lastLoginAt: tsz('last_login_at'),
});

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 от токена из cookie. Сам токен в БД не хранится. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    lastSeenAt: tsz('last_seen_at').notNull().defaultNow(),
    expiresAt: tsz('expires_at').notNull(),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/** Лимит попыток входа: ключ = логин + IP. Хранится в БД, чтобы работать при нескольких копиях приложения. */
export const loginAttempts = pgTable('login_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: tsz('window_start').notNull().defaultNow(),
  lockedUntil: tsz('locked_until'),
});

// ---------- Оргструктура ----------
export const institutes = pgTable('institutes', {
  id: id(),
  name: text('name').notNull(),
  short: text('short').notNull(),
});

export const groups = pgTable('groups', {
  id: id(),
  /** Полный шифр группы в формате вуза. */
  code: text('code').notNull().unique(),
  /** Короткое имя для компактного интерфейса. */
  short: text('short').notNull(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id),
  directionCode: text('direction_code').notNull(),
  directionName: text('direction_name').notNull(),
  profile: text('profile').notNull(),
  level: text('level').notNull().default('бакалавриат'),
  course: smallint('course').notNull(),
});

export const students = pgTable('students', {
  /** Совпадает с users.id: у студента одна учётная запись. */
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id),
  recordBook: text('record_book').notNull().unique(),
  studyForm: text('study_form').notNull().default('очная'),
  funding: text('funding').notNull().default('бюджет'),
  email: text('email').notNull(),
  avatarColor: text('avatar_color').notNull().default('#FFC21A'),
});

export const staff = pgTable('staff', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  position: text('position').notNull(),
  instituteId: uuid('institute_id').references(() => institutes.id),
});

export const teachers = pgTable('teachers', {
  id: id(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  title: text('title'),
});

// ---------- Учёба ----------
export const subjects = pgTable('subjects', {
  id: id(),
  name: text('name').notNull(),
  short: text('short').notNull(),
});

export const courses = pgTable(
  'courses',
  {
    id: id(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => teachers.id),
    /** Например «2026-осень». */
    semester: text('semester').notNull(),
    controlType: controlType('control_type').notNull(),
    /** Баллы, нужные для допуска к экзамену/зачёту (БРС, максимум 100). */
    admissionThreshold: smallint('admission_threshold').notNull().default(61),
    color: text('color'),
  },
  (t) => [index('courses_group_idx').on(t.groupId, t.semester)],
);

export const lessons = pgTable(
  'lessons',
  {
    id: id(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => teachers.id),
    startsAt: tsz('starts_at').notNull(),
    endsAt: tsz('ends_at').notNull(),
    /** Номер пары по сетке вуза (1…7). */
    slot: smallint('slot').notNull(),
    kind: lessonKind('kind').notNull(),
    format: lessonFormat('format').notNull().default('offline'),
    room: text('room'),
    onlineUrl: text('online_url'),
    status: lessonStatus('status').notNull().default('scheduled'),
    /** Для занятия, появившегося в результате переноса, — откуда перенесли. */
    movedFromId: uuid('moved_from_id'),
    previousRoom: text('previous_room'),
    changeNote: text('change_note'),
    changedAt: tsz('changed_at'),
  },
  (t) => [
    index('lessons_group_time_idx').on(t.groupId, t.startsAt),
    index('lessons_changed_idx').on(t.groupId, t.changedAt),
  ],
);

export const assessments = pgTable(
  'assessments',
  {
    id: id(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    kind: assessmentKind('kind').notNull(),
    dueAt: tsz('due_at'),
    maxPoints: smallint('max_points').notNull(),
    sort: smallint('sort').notNull().default(0),
  },
  (t) => [index('assessments_course_idx').on(t.courseId)],
);

export const scores = pgTable(
  'scores',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'cascade' }),
    points: smallint('points').notNull(),
    gradedAt: tsz('graded_at').notNull().defaultNow(),
    comment: text('comment'),
  },
  (t) => [
    primaryKey({ columns: [t.assessmentId, t.studentId] }),
    index('scores_student_idx').on(t.studentId),
  ],
);

/** Итоги прошлых сессий. */
export const finalGrades = pgTable(
  'final_grades',
  {
    id: id(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id),
    /** «отлично», «хорошо», «зачтено»… */
    grade: text('grade').notNull(),
    points: smallint('points'),
    gradedOn: date('graded_on').notNull(),
  },
  (t) => [index('final_grades_student_idx').on(t.studentId)],
);

// ---------- Заявки и справки ----------
export type DocumentField = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  default?: string;
  /** Подставляется из профиля и не требует ввода. */
  fromProfile?: boolean;
};

export const documentTypes = pgTable('document_types', {
  code: text('code').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  /** Срок по правилу, когда точной даты нет: «обычно 1–2 рабочих дня». */
  etaText: text('eta_text').notNull(),
  etaDaysMin: smallint('eta_days_min').notNull(),
  etaDaysMax: smallint('eta_days_max').notNull(),
  fields: jsonb('fields')
    .$type<DocumentField[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  deliveries: deliveryFormat('deliveries').array().notNull(),
  /** Какие документы студент прикладывает сам. */
  requirements: jsonb('requirements')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  legalBasis: text('legal_basis').notNull(),
  /** Слова, по которым помощник узнаёт тип («военкомат», «стипендия»). */
  keywords: text('keywords')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  pickupPlace: text('pickup_place'),
  sort: smallint('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const requests = pgTable(
  'requests',
  {
    id: id(),
    /** Номер для людей (№1058). В адресах используется только непредсказуемый id. */
    number: integer('number').notNull().unique().generatedByDefaultAsIdentity({ startWith: 1001 }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'cascade' }),
    typeCode: text('type_code')
      .notNull()
      .references(() => documentTypes.code),
    status: requestStatus('status').notNull().default('sent'),
    payload: jsonb('payload')
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    delivery: deliveryFormat('delivery').notNull(),
    copies: smallint('copies').notNull().default(1),
    comment: text('comment'),
    /** Точный срок, если сотрудник его назначил. Пусто → показываем срок по правилу типа. */
    etaFrom: date('eta_from'),
    etaTo: date('eta_to'),
    /** До какого числа студент должен выполнить действие (статус need_action). */
    actionDueOn: date('action_due_on'),
    createdAt: createdAt(),
    updatedAt: tsz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('requests_student_idx').on(t.studentId, t.createdAt),
    index('requests_status_idx').on(t.status),
  ],
);

export const requestEvents = pgTable(
  'request_events',
  {
    id: id(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    /** Дублируем владельца, чтобы политика RLS не делала join. */
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'cascade' }),
    status: requestStatus('status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    /** Как подписать исполнителя в таймлайне («О. П. Иванова», «вы», «помощник»). Студент не читает таблицу сотрудников. */
    actorName: text('actor_name'),
    comment: text('comment'),
    createdAt: createdAt(),
  },
  (t) => [index('request_events_request_idx').on(t.requestId, t.createdAt)],
);

export const attachments = pgTable(
  'attachments',
  {
    id: id(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    sha256: text('sha256').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index('attachments_request_idx').on(t.requestId)],
);

export const requestRequirements = pgTable(
  'request_requirements',
  {
    id: id(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    attachmentId: uuid('attachment_id').references(() => attachments.id, { onDelete: 'set null' }),
    satisfiedAt: tsz('satisfied_at'),
    sort: smallint('sort').notNull().default(0),
  },
  (t) => [index('request_requirements_request_idx').on(t.requestId)],
);

export const issuedDocuments = pgTable('issued_documents', {
  id: id(),
  requestId: uuid('request_id')
    .notNull()
    .unique()
    .references(() => requests.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.userId, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull().unique(),
  /** Код из QR для публичной проверки подлинности. */
  verifyCode: text('verify_code').notNull().unique(),
  issuedAt: tsz('issued_at').notNull().defaultNow(),
  validUntil: date('valid_until'),
});

// ---------- Уведомления ----------
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: notificationKind('kind').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    /** Внутренняя ссылка: /documents/…, /week… */
    link: text('link'),
    createdAt: createdAt(),
    readAt: tsz('read_at'),
    /** Ключ идемпотентности проактивных напоминаний: одно напоминание не придёт дважды. */
    dedupeKey: text('dedupe_key'),
  },
  (t) => [
    index('notifications_user_idx').on(t.userId, t.createdAt),
    uniqueIndex('notifications_dedupe_idx').on(t.userId, t.dedupeKey),
  ],
);

export const announcements = pgTable('announcements', {
  id: id(),
  authorUserId: uuid('author_user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  /** Кому: { groupIds?: string[], instituteIds?: string[] } — пусто значит всем. */
  audience: jsonb('audience').$type<{ groupIds?: string[]; instituteIds?: string[] }>().notNull(),
  publishedAt: tsz('published_at').notNull().defaultNow(),
});

// ---------- Персонализация ----------
export type HomeBlock = { id: string; size: 'S' | 'M' | 'L'; hidden: boolean };

export const homeLayouts = pgTable('home_layouts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  blocks: jsonb('blocks').$type<HomeBlock[]>().notNull(),
  updatedAt: tsz('updated_at').notNull().defaultNow(),
});

export const userPrefs = pgTable('user_prefs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Демо-режим для жюри: «сейчас» сдвигается на ближайший учебный день. */
  demoClock: boolean('demo_clock').notNull().default(false),
  updatedAt: tsz('updated_at').notNull().defaultNow(),
});

// ---------- Помощник ----------
export const assistantMessages = pgTable(
  'assistant_messages',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id').notNull(),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    content: text('content').notNull(),
    /** Структурированные карточки ответа (черновик заявки, пара, балл). */
    cards: jsonb('cards')
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    provider: text('provider'),
    createdAt: createdAt(),
  },
  (t) => [index('assistant_messages_user_idx').on(t.userId, t.threadId, t.createdAt)],
);

// ---------- Аудит ----------
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity'),
    entityId: text('entity_id'),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt)],
);

// ---------- Типы значений перечислений ----------
export type LessonKindValue = (typeof lessonKind.enumValues)[number];
export type AssessmentKindValue = (typeof assessmentKind.enumValues)[number];
export type DeliveryValue = (typeof deliveryFormat.enumValues)[number];
export type RequestStatusValue = (typeof requestStatus.enumValues)[number];
export type NotificationKindValue = (typeof notificationKind.enumValues)[number];
