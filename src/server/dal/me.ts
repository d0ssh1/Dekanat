import 'server-only';
import { cache } from 'react';
import { and, count, eq, isNull } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { groups, institutes, notifications, sessions, staff, students, users } from '@/server/db/schema';
import { ctxOf, type StaffViewer, type StudentViewer, type Viewer } from '@/server/auth/guards';

/** Данные для шапки на каждой странице: инициалы, цвет аватара, непрочитанные. */
export type ShellData = { initials: string; avatarColor: string; unread: number; firstName: string };

const initialsOf = (last: string, first: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

export const getShell = cache(async (viewer: Viewer): Promise<ShellData> => {
  return withDb(ctxOf(viewer), async (tx) => {
    const [unreadRow] = await tx
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, viewer.userId), isNull(notifications.readAt)));
    const unread = unreadRow?.n ?? 0;

    if (viewer.role === 'student') {
      const [s] = await tx
        .select({ last: students.lastName, first: students.firstName, color: students.avatarColor })
        .from(students)
        .where(eq(students.userId, viewer.userId));
      if (!s) throw new Error('Профиль студента не найден');
      return { initials: initialsOf(s.last, s.first), avatarColor: s.color, unread, firstName: s.first };
    }
    const [st] = await tx
      .select({ last: staff.lastName, first: staff.firstName })
      .from(staff)
      .where(eq(staff.userId, viewer.userId));
    if (!st) throw new Error('Профиль сотрудника не найден');
    return { initials: initialsOf(st.last, st.first), avatarColor: '#FFC21A', unread, firstName: st.first };
  });
});

/** Профиль студента — только поля, нужные экрану (DTO), без служебных id. */
export type StudentProfile = {
  lastName: string;
  firstName: string;
  middleName: string | null;
  initials: string;
  institute: string;
  instituteShort: string;
  directionCode: string;
  directionName: string;
  profile: string;
  level: string;
  course: number;
  groupShort: string;
  groupCode: string;
  recordBook: string;
  studyForm: string;
  funding: string;
  email: string;
  lastLoginAt: Date | null;
  activeSessions: number;
};

export async function getMyProfile(viewer: StudentViewer): Promise<StudentProfile> {
  return withDb(ctxOf(viewer), async (tx) => {
    const [row] = await tx
      .select({
        lastName: students.lastName,
        firstName: students.firstName,
        middleName: students.middleName,
        institute: institutes.name,
        instituteShort: institutes.short,
        directionCode: groups.directionCode,
        directionName: groups.directionName,
        profile: groups.profile,
        level: groups.level,
        course: groups.course,
        groupShort: groups.short,
        groupCode: groups.code,
        recordBook: students.recordBook,
        studyForm: students.studyForm,
        funding: students.funding,
        email: students.email,
        lastLoginAt: users.lastLoginAt,
      })
      .from(students)
      .innerJoin(groups, eq(groups.id, students.groupId))
      .innerJoin(institutes, eq(institutes.id, groups.instituteId))
      .innerJoin(users, eq(users.id, students.userId))
      // Условие владельца пишем явно, даже если RLS и так отрежет чужое (CLAUDE.md, правило 3).
      .where(eq(students.userId, viewer.userId));
    if (!row) throw new Error('Профиль студента не найден');
    const [s] = await tx.select({ n: count() }).from(sessions).where(eq(sessions.userId, viewer.userId));
    return { ...row, initials: initialsOf(row.lastName, row.firstName), activeSessions: s?.n ?? 1 };
  });
}

export async function getStaffName(viewer: StaffViewer) {
  return withDb(ctxOf(viewer), async (tx) => {
    const [st] = await tx
      .select({
        last: staff.lastName,
        first: staff.firstName,
        middle: staff.middleName,
        position: staff.position,
      })
      .from(staff)
      .where(eq(staff.userId, viewer.userId));
    if (!st) throw new Error('Профиль сотрудника не найден');
    return st;
  });
}
