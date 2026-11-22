import 'server-only';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { withDb } from '@/server/db';
import {
  assessments,
  courses,
  finalGrades,
  lessons,
  scores,
  students,
  subjects,
  teachers,
} from '@/server/db/schema';
import { ctxOf, type StudentViewer } from '@/server/auth/guards';
import { SEMESTER } from '@/lib/university';

export type Item = {
  id: string;
  title: string;
  kind: string;
  max: number;
  points: number | null;
  dueAt: string | null;
};

export type CourseSummary = {
  id: string;
  subject: string;
  short: string;
  teacher: string;
  control: 'exam' | 'credit' | 'diff_credit';
  threshold: number;
  /** Набрано в семестре (без экзамена). */
  points: number;
  /** Максимум за семестр (без экзамена). */
  semMax: number;
  examMax: number;
  /** Дата экзамена/зачёта — из расписания сессии или последней работы. */
  finalOn: string | null;
  items: Item[];
};

export type FinalGrade = {
  semester: string;
  subject: string;
  grade: string;
  points: number | null;
  on: string;
  control: string;
};

const name = (l: string, f: string, m: string | null) => `${l} ${f[0]}.${m ? ` ${m[0]}.` : ''}`;

async function myGroup(viewer: StudentViewer) {
  return withDb(ctxOf(viewer), async (tx) => {
    const [s] = await tx
      .select({ groupId: students.groupId })
      .from(students)
      .where(eq(students.userId, viewer.userId));
    if (!s) throw new Error('Студент не найден');
    return s.groupId;
  });
}

async function loadCourses(viewer: StudentViewer, courseIds?: string[]): Promise<CourseSummary[]> {
  const groupId = await myGroup(viewer);
  return withDb(ctxOf(viewer), async (tx) => {
    const cs = await tx
      .select({
        id: courses.id,
        subject: subjects.name,
        short: subjects.short,
        control: courses.controlType,
        threshold: courses.admissionThreshold,
        tL: teachers.lastName,
        tF: teachers.firstName,
        tM: teachers.middleName,
      })
      .from(courses)
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .innerJoin(teachers, eq(teachers.id, courses.teacherId))
      // Только курсы своей группы: чужой courseId из адреса сюда не попадёт.
      .where(
        and(
          eq(courses.groupId, groupId),
          eq(courses.semester, SEMESTER.code),
          courseIds ? inArray(courses.id, courseIds) : undefined,
        ),
      );
    if (!cs.length) return [];
    const ids = cs.map((c) => c.id);
    const items = await tx
      .select({
        id: assessments.id,
        courseId: assessments.courseId,
        title: assessments.title,
        kind: assessments.kind,
        max: assessments.maxPoints,
        dueAt: assessments.dueAt,
        points: scores.points,
      })
      .from(assessments)
      .leftJoin(scores, and(eq(scores.assessmentId, assessments.id), eq(scores.studentId, viewer.userId)))
      .where(inArray(assessments.courseId, ids))
      .orderBy(asc(assessments.sort));
    const exams = await tx
      .select({ courseId: lessons.courseId, startsAt: lessons.startsAt })
      .from(lessons)
      .where(and(inArray(lessons.courseId, ids), eq(lessons.kind, 'exam'), ne(lessons.status, 'cancelled')));

    return cs.map((c) => {
      const its = items.filter((i) => i.courseId === c.id);
      const sem = its.filter((i) => i.kind !== 'exam');
      const exam = its.find((i) => i.kind === 'exam');
      const examLesson = exams.find((e) => e.courseId === c.id);
      // Сортируем по времени, а не по строке: Date.toString() даёт «Thu Nov 05…» и путает порядок.
      const lastDue =
        its
          .map((i) => i.dueAt)
          .filter((d): d is Date => Boolean(d))
          .sort((x, y) => x.getTime() - y.getTime())
          .at(-1) ?? null;
      return {
        id: c.id,
        subject: c.subject,
        short: c.short,
        teacher: name(c.tL, c.tF, c.tM),
        control: c.control,
        threshold: c.threshold,
        points: sem.reduce((a, i) => a + (i.points ?? 0), 0),
        semMax: sem.reduce((a, i) => a + i.max, 0),
        examMax: exam?.max ?? 0,
        finalOn: (examLesson?.startsAt ?? lastDue)?.toISOString() ?? null,
        items: its.map((i) => ({
          id: i.id,
          title: i.title,
          kind: i.kind,
          max: i.max,
          points: i.points,
          dueAt: i.dueAt?.toISOString() ?? null,
        })),
      };
    });
  });
}

export function getCurrentCourses(viewer: StudentViewer) {
  return loadCourses(viewer);
}

/** Один предмет — только если он из группы студента. Иначе null → страница отдаёт 404. */
export async function getCourse(viewer: StudentViewer, courseId: string): Promise<CourseSummary | null> {
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return null;
  const [c] = await loadCourses(viewer, [courseId]);
  return c ?? null;
}

export async function getFinalGrades(viewer: StudentViewer): Promise<FinalGrade[]> {
  return withDb(ctxOf(viewer), async (tx) => {
    const rows = await tx
      .select({
        semester: courses.semester,
        subject: subjects.name,
        grade: finalGrades.grade,
        points: finalGrades.points,
        on: finalGrades.gradedOn,
        control: courses.controlType,
      })
      .from(finalGrades)
      .innerJoin(courses, eq(courses.id, finalGrades.courseId))
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .where(eq(finalGrades.studentId, viewer.userId))
      .orderBy(asc(finalGrades.gradedOn));
    return rows;
  });
}
