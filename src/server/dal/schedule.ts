import 'server-only';
import { cache } from 'react';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withDb } from '@/server/db';
import { courses, lessons, students, subjects, teachers } from '@/server/db/schema';
import { ctxOf, type StudentViewer } from '@/server/auth/guards';
import { addDays, at } from '@/lib/time';

const KIND: Record<string, string> = {
  lecture: 'лекция',
  practice: 'практика',
  lab: 'лабораторная',
  seminar: 'семинар',
  consult: 'консультация',
  exam: 'экзамен',
};

/** Занятие в том виде, в каком его видит экран (DTO). */
export type Lesson = {
  id: string;
  courseId: string;
  startsAt: string;
  endsAt: string;
  slot: number;
  kind: string;
  kindLabel: string;
  online: boolean;
  onlineUrl: string | null;
  room: string | null;
  previousRoom: string | null;
  status: 'scheduled' | 'moved' | 'cancelled';
  subject: string;
  short: string;
  teacher: string;
  changeNote: string | null;
  /** Перенесённое занятие: куда перенесли. */
  movedTo: string | null;
  /** Новое занятие после переноса: откуда перенесли. */
  movedFrom: string | null;
  /** Есть ли заметное изменение (перенос, замена аудитории, отмена). */
  changed: boolean;
};

const initials = (last: string, first: string, middle: string | null) =>
  `${last} ${first[0]}.${middle ? ` ${middle[0]}.` : ''}`;

/** Группа студента — только из его собственной строки (RLS + условие владельца). */
const groupOf = cache(async (viewer: StudentViewer) =>
  withDb(ctxOf(viewer), async (tx) => {
    const [row] = await tx
      .select({ groupId: students.groupId })
      .from(students)
      .where(eq(students.userId, viewer.userId));
    if (!row) throw new Error('Студент не найден');
    return row.groupId;
  }),
);

/** Все занятия группы студента в интервале дней [fromDay, toDay). */
export const getLessons = cache(
  async (viewer: StudentViewer, fromDay: string, toDay: string): Promise<Lesson[]> => {
    const groupId = await groupOf(viewer);
    const moved = alias(lessons, 'moved');
    const origin = alias(lessons, 'origin');
    return withDb(ctxOf(viewer), async (tx) => {
      const rows = await tx
        .select({
          l: lessons,
          subject: subjects.name,
          short: subjects.short,
          tLast: teachers.lastName,
          tFirst: teachers.firstName,
          tMiddle: teachers.middleName,
          movedTo: moved.startsAt,
          movedFrom: origin.startsAt,
        })
        .from(lessons)
        .innerJoin(courses, eq(courses.id, lessons.courseId))
        .innerJoin(subjects, eq(subjects.id, courses.subjectId))
        .innerJoin(teachers, eq(teachers.id, lessons.teacherId))
        .leftJoin(moved, eq(moved.movedFromId, lessons.id))
        .leftJoin(origin, eq(origin.id, lessons.movedFromId))
        .where(
          and(
            eq(lessons.groupId, groupId),
            gte(lessons.startsAt, at(fromDay, '00:00')),
            lt(lessons.startsAt, at(toDay, '00:00')),
          ),
        )
        .orderBy(asc(lessons.startsAt));

      return rows.map(({ l, ...r }) => ({
        id: l.id,
        courseId: l.courseId,
        startsAt: l.startsAt.toISOString(),
        endsAt: l.endsAt.toISOString(),
        slot: l.slot,
        kind: l.kind,
        kindLabel: KIND[l.kind] ?? l.kind,
        online: l.format === 'online',
        onlineUrl: l.onlineUrl,
        room: l.room,
        previousRoom: l.previousRoom,
        status: l.status,
        subject: r.subject,
        short: r.short,
        teacher: initials(r.tLast, r.tFirst, r.tMiddle),
        changeNote: l.changeNote,
        movedTo: r.movedTo?.toISOString() ?? null,
        movedFrom: r.movedFrom?.toISOString() ?? null,
        changed: Boolean(l.changedAt),
      }));
    });
  },
);

export function getDay(viewer: StudentViewer, day: string) {
  return getLessons(viewer, day, addDays(day, 1));
}

/** Неделя пн–сб. */
export function getWeek(viewer: StudentViewer, monday: string) {
  return getLessons(viewer, monday, addDays(monday, 7));
}

/** Ближайшее занятие после момента (для выходного: «до следующей пары 2 дня»). */
export async function getNextLesson(
  viewer: StudentViewer,
  from: Date,
  fromDay: string,
): Promise<Lesson | null> {
  const list = await getLessons(viewer, fromDay, addDays(fromDay, 15));
  return (
    list.find((l) => l.status !== 'moved' && l.status !== 'cancelled' && new Date(l.startsAt) > from) ?? null
  );
}
