import 'server-only';
import { and, asc, desc, eq, gt, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { withDb } from '@/server/db';
import {
  assessments,
  courses,
  documentTypes,
  requests,
  scores,
  students,
  subjects,
} from '@/server/db/schema';
import { ctxOf, type StudentViewer } from '@/server/auth/guards';
import { SEMESTER } from '@/lib/university';

/** Заявки «в работе» для главной: сначала то, что требует студента, потом готовое, потом остальное. */
export type ActiveRequest = {
  id: string;
  number: number;
  title: string;
  status: 'sent' | 'in_progress' | 'need_action' | 'ready';
  etaTo: string | null;
  etaText: string;
  actionDueOn: string | null;
  pickupPlace: string | null;
};

export async function getActiveRequests(viewer: StudentViewer): Promise<ActiveRequest[]> {
  return withDb(ctxOf(viewer), async (tx) => {
    const rows = await tx
      .select({
        id: requests.id,
        number: requests.number,
        title: documentTypes.title,
        status: requests.status,
        etaTo: requests.etaTo,
        etaText: documentTypes.etaText,
        actionDueOn: requests.actionDueOn,
        pickupPlace: documentTypes.pickupPlace,
      })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .where(
        and(
          eq(requests.studentId, viewer.userId),
          notInArray(requests.status, ['issued', 'cancelled', 'rejected']),
        ),
      )
      .orderBy(desc(requests.updatedAt));
    const order = { need_action: 0, ready: 1, in_progress: 2, sent: 3 } as const;
    return (rows as ActiveRequest[]).sort((a, b) => order[a.status] - order[b.status]);
  });
}

/** Учебные «дела»: ближайшие контрольные и недобор баллов до допуска. */
export type StudyAlert =
  | {
      kind: 'due';
      courseId: string;
      title: string;
      subject: string;
      short: string;
      dueAt: string;
      maxPoints: number;
    }
  | {
      kind: 'admission';
      courseId: string;
      subject: string;
      short: string;
      points: number;
      threshold: number;
    };

export async function getStudyAlerts(
  viewer: StudentViewer,
  now: Date,
  horizonDays = 14,
): Promise<StudyAlert[]> {
  return withDb(ctxOf(viewer), async (tx) => {
    const [me] = await tx
      .select({ groupId: students.groupId })
      .from(students)
      .where(eq(students.userId, viewer.userId));
    if (!me) return [];
    const myCourses = await tx
      .select({
        id: courses.id,
        subject: subjects.name,
        short: subjects.short,
        control: courses.controlType,
        threshold: courses.admissionThreshold,
      })
      .from(courses)
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .where(and(eq(courses.groupId, me.groupId), eq(courses.semester, SEMESTER.code)));
    if (!myCourses.length) return [];
    const ids = myCourses.map((c) => c.id);

    // Сумма баллов по каждому курсу текущего семестра (без экзамена).
    const sums = await tx
      .select({
        courseId: assessments.courseId,
        points: sql<number>`coalesce(sum(${scores.points}), 0)::int`,
      })
      .from(assessments)
      .leftJoin(scores, and(eq(scores.assessmentId, assessments.id), eq(scores.studentId, viewer.userId)))
      .where(and(inArray(assessments.courseId, ids), sql`${assessments.kind} <> 'exam'`))
      .groupBy(assessments.courseId);

    const horizon = new Date(now.getTime() + horizonDays * 86400_000);
    const upcoming = await tx
      .select({
        id: assessments.id,
        courseId: assessments.courseId,
        title: assessments.title,
        dueAt: assessments.dueAt,
        max: assessments.maxPoints,
      })
      .from(assessments)
      .leftJoin(scores, and(eq(scores.assessmentId, assessments.id), eq(scores.studentId, viewer.userId)))
      .where(
        and(
          inArray(assessments.courseId, ids),
          isNull(scores.points),
          gt(assessments.dueAt, now),
          sql`${assessments.dueAt} < ${horizon.toISOString()}::timestamptz`,
          inArray(assessments.kind, ['kt', 'coursework', 'lab', 'test']),
        ),
      )
      .orderBy(asc(assessments.dueAt));

    const byId = new Map(myCourses.map((c) => [c.id, c]));
    const alerts: StudyAlert[] = [];
    for (const s of sums) {
      const c = byId.get(s.courseId);
      if (c && c.control === 'exam' && s.points < c.threshold)
        alerts.push({
          kind: 'admission',
          courseId: c.id,
          subject: c.subject,
          short: c.short,
          points: s.points,
          threshold: c.threshold,
        });
    }
    for (const u of upcoming) {
      const c = byId.get(u.courseId)!;
      alerts.push({
        kind: 'due',
        courseId: c.id,
        title: u.title,
        subject: c.subject,
        short: c.short,
        dueAt: u.dueAt!.toISOString(),
        maxPoints: u.max,
      });
    }
    return alerts;
  });
}
