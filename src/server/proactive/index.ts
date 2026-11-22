import 'server-only';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
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
import { notify } from '@/server/services/notify';
import { addDays, dayMonth, dayOf, diffDays } from '@/lib/time';

/**
 * «Деканат сам напоминает»: правила, а не ИИ (docs/architecture.md §10).
 * Запускается раз в час. advisory-lock гарантирует, что при N копиях приложения
 * правила отработают один раз, а ключ идемпотентности — что напоминание не придёт дважды.
 */
export async function runProactive(now = new Date()) {
  return withDb({ role: 'system' }, async (tx) => {
    const [lock] = await tx.execute<{ ok: boolean }>(sql`select pg_try_advisory_xact_lock(20261128) as ok`);
    if (!lock?.ok) return { skipped: true, sent: 0 };
    let sent = 0;
    const horizon = new Date(now.getTime() + 48 * 3600_000);

    // 1. Работа со сроком в ближайшие 48 часов, баллов ещё нет.
    const due = await tx
      .select({
        aId: assessments.id,
        title: assessments.title,
        dueAt: assessments.dueAt,
        courseId: courses.id,
        groupId: courses.groupId,
        short: subjects.short,
      })
      .from(assessments)
      .innerJoin(courses, eq(courses.id, assessments.courseId))
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .where(
        and(gt(assessments.dueAt, now), lt(assessments.dueAt, horizon), sql`${assessments.kind} <> 'exam'`),
      );
    for (const a of due) {
      const studs = await tx
        .select({ id: students.userId })
        .from(students)
        .leftJoin(scores, and(eq(scores.studentId, students.userId), eq(scores.assessmentId, a.aId)))
        .where(and(eq(students.groupId, a.groupId), isNull(scores.points)));
      const d = diffDays(dayOf(now), dayOf(a.dueAt!));
      sent += await notify(
        tx,
        studs.map((s) => s.id),
        {
          kind: 'deadline',
          title: `${a.short} · ${a.title} — ${d <= 0 ? 'сегодня' : d === 1 ? 'завтра' : `через ${d} дня`}`,
          body: `Срок — ${dayMonth(dayOf(a.dueAt!))}`,
          link: `/study/${a.courseId}`,
          tone: 'neutral',
          dedupeKey: `due:${a.aId}`,
        },
      );
    }

    // 2. Деканат ждёт документ, а срок — завтра или сегодня.
    const waiting = await tx
      .select({
        id: requests.id,
        number: requests.number,
        studentId: requests.studentId,
        dueOn: requests.actionDueOn,
        title: documentTypes.title,
      })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .where(
        and(eq(requests.status, 'need_action'), sql`${requests.actionDueOn} <= ${addDays(dayOf(now), 1)}`),
      );
    for (const r of waiting) {
      sent += await notify(tx, [r.studentId], {
        kind: 'document',
        title: `Не забудьте документ к заявке №${r.number}`,
        body: `${r.title} — срок ${r.dueOn ? dayMonth(r.dueOn) : 'скоро'}`,
        link: `/documents/${r.id}`,
        tone: 'danger',
        dedupeKey: `act:${r.id}:${r.dueOn}`,
      });
    }
    return { skipped: false, sent };
  });
}
