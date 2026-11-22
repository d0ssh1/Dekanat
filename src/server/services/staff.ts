import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { withDb, type Tx } from '@/server/db';
import {
  announcements,
  attachments,
  auditLog,
  courses,
  documentTypes,
  groups,
  lessons,
  requestEvents,
  requestRequirements,
  requests,
  staff,
  students,
  subjects,
  type RequestStatusValue,
} from '@/server/db/schema';
import { ctxOf, type StaffViewer } from '@/server/auth/guards';
import { publish } from '@/server/events/publish';
import { notify } from './notify';
import { UserError } from './requests';
import { getCertificatePdf } from './issue';
import { addDays, at, dayMonth, dayOf, hhmm, shortDate, wdShort } from '@/lib/time';
import { slotTimes } from '@/lib/university';

export { UserError };

async function staffName(tx: Tx, userId: string) {
  const [s] = await tx
    .select({ l: staff.lastName, f: staff.firstName, m: staff.middleName })
    .from(staff)
    .where(eq(staff.userId, userId));
  return s ? `${s.f[0]}. ${s.m ? `${s.m[0]}. ` : ''}${s.l}` : 'деканат';
}

// ---------------- Очередь ----------------
export type QueueItem = {
  id: string;
  number: number;
  title: string;
  status: RequestStatusValue;
  student: string;
  group: string;
  createdAt: string;
  updatedAt: string;
  etaTo: string | null;
};

export async function listQueue(viewer: StaffViewer): Promise<QueueItem[]> {
  return withDb(ctxOf(viewer), async (tx) => {
    const rows = await tx
      .select({
        id: requests.id,
        number: requests.number,
        title: documentTypes.title,
        status: requests.status,
        last: students.lastName,
        first: students.firstName,
        middle: students.middleName,
        group: groups.short,
        createdAt: requests.createdAt,
        updatedAt: requests.updatedAt,
        etaTo: requests.etaTo,
      })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .innerJoin(students, eq(students.userId, requests.studentId))
      .innerJoin(groups, eq(groups.id, students.groupId))
      .orderBy(desc(requests.updatedAt));
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      title: r.title,
      status: r.status,
      student: `${r.last} ${r.first[0]}. ${r.middle ? `${r.middle[0]}.` : ''}`,
      group: r.group,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      etaTo: r.etaTo,
    }));
  });
}

export async function getStaffRequest(viewer: StaffViewer, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return withDb(ctxOf(viewer), async (tx) => {
    const [row] = await tx
      .select({ r: requests, t: documentTypes, s: students, g: groups })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .innerJoin(students, eq(students.userId, requests.studentId))
      .innerJoin(groups, eq(groups.id, students.groupId))
      .where(eq(requests.id, id));
    if (!row) return null;
    const events = await tx
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, id))
      .orderBy(asc(requestEvents.createdAt));
    const reqs = await tx
      .select()
      .from(requestRequirements)
      .where(eq(requestRequirements.requestId, id))
      .orderBy(asc(requestRequirements.sort));
    const files = await tx
      .select({
        id: attachments.id,
        filename: attachments.filename,
        size: attachments.size,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(eq(attachments.requestId, id))
      .orderBy(asc(attachments.createdAt));
    return {
      id: row.r.id,
      number: row.r.number,
      status: row.r.status,
      title: row.t.title,
      typeCode: row.t.code,
      fields: row.t.fields,
      payload: row.r.payload,
      delivery: row.r.delivery,
      copies: row.r.copies,
      etaTo: row.r.etaTo,
      createdAt: row.r.createdAt.toISOString(),
      student: {
        name: [row.s.lastName, row.s.firstName, row.s.middleName].filter(Boolean).join(' '),
        group: row.g.code,
        course: row.g.course,
        recordBook: row.s.recordBook,
      },
      events: events.map((e) => ({
        status: e.status,
        at: e.createdAt.toISOString(),
        actorName: e.actorName,
        comment: e.comment,
      })),
      requirements: reqs.map((q) => ({ id: q.id, title: q.title, satisfied: Boolean(q.satisfiedAt) })),
      files: files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    };
  });
}

// ---------------- Смена статуса ----------------
type Transition =
  | { action: 'take'; etaDays?: number }
  | { action: 'need'; title: string; comment: string; dueDays: number }
  | { action: 'ready' }
  | { action: 'issue' }
  | { action: 'reject'; comment: string };

const ALLOWED: Record<Transition['action'], RequestStatusValue[]> = {
  take: ['sent', 'need_action'],
  need: ['sent', 'in_progress'],
  ready: ['in_progress'],
  issue: ['ready'],
  reject: ['sent', 'in_progress', 'need_action'],
};

export async function transition(viewer: StaffViewer, id: string, t: Transition) {
  const result = await withDb(ctxOf(viewer), async (tx) => {
    const [r] = await tx
      .select({
        status: requests.status,
        studentId: requests.studentId,
        number: requests.number,
        title: documentTypes.title,
        pickup: documentTypes.pickupPlace,
        delivery: requests.delivery,
      })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .where(eq(requests.id, id));
    if (!r) throw new UserError('Заявка не найдена');
    if (!ALLOWED[t.action].includes(r.status)) throw new UserError('Для этого статуса действие недоступно');
    const who = await staffName(tx, viewer.userId);
    const today = dayOf(new Date());
    const link = `/documents/${id}`;
    let status: RequestStatusValue = r.status;
    let comment: string | null = null;
    const patch: Partial<typeof requests.$inferInsert> = { updatedAt: new Date() };

    if (t.action === 'take') {
      status = 'in_progress';
      if (t.etaDays) patch.etaFrom = patch.etaTo = addDays(today, t.etaDays);
      await notify(tx, [r.studentId], {
        kind: 'document',
        title: `Заявка №${r.number} принята в работу`,
        body: t.etaDays
          ? `${r.title} · будет ${dayMonth(addDays(today, t.etaDays))}`
          : `${r.title} · ведёт ${who}`,
        link,
        tone: 'neutral',
      });
    } else if (t.action === 'need') {
      status = 'need_action';
      comment = t.comment;
      patch.actionDueOn = addDays(today, t.dueDays);
      const exists = await tx
        .select({ id: requestRequirements.id })
        .from(requestRequirements)
        .where(and(eq(requestRequirements.requestId, id), eq(requestRequirements.title, t.title)));
      if (!exists.length)
        await tx
          .insert(requestRequirements)
          .values({ requestId: id, studentId: r.studentId, title: t.title, sort: 99 });
      await notify(tx, [r.studentId], {
        kind: 'document',
        title: `По заявке №${r.number} нужен документ`,
        body: `${t.title} — до ${dayMonth(addDays(today, t.dueDays))}`,
        link,
        tone: 'danger',
      });
    } else if (t.action === 'ready') {
      status = 'ready';
      await notify(tx, [r.studentId], {
        kind: 'document',
        title: `${r.title} №${r.number} готова`,
        body:
          r.delivery === 'pdf' ? 'PDF с QR — в заявке' : `PDF с QR или бумажная в ${r.pickup ?? 'деканате'}`,
        link,
        tone: 'ok',
      });
    } else if (t.action === 'issue') {
      status = 'issued';
    } else {
      status = 'rejected';
      comment = t.comment;
      await notify(tx, [r.studentId], {
        kind: 'document',
        title: `Заявка №${r.number} отклонена`,
        body: t.comment,
        link,
        tone: 'danger',
      });
    }

    await tx
      .update(requests)
      .set({ ...patch, status })
      .where(eq(requests.id, id));
    await tx.insert(requestEvents).values({
      requestId: id,
      studentId: r.studentId,
      status,
      actorUserId: viewer.userId,
      actorName: who,
      comment,
    });
    await tx.insert(auditLog).values({
      actorUserId: viewer.userId,
      action: `request.${t.action}`,
      entity: 'request',
      entityId: id,
      meta: { status },
    });
    await publish(tx, { kind: 'request', userId: r.studentId, requestId: id, status });
    await publish(tx, { kind: 'queue', requestId: id });
    return status;
  });
  // PDF готовим сразу, чтобы студент скачал без ожидания.
  if (result === 'ready')
    await getCertificatePdf(viewer, id).catch((e) => console.error('PDF не собрался', e));
  return result;
}

// ---------------- Расписание ----------------
export async function listGroups(viewer: StaffViewer) {
  return withDb(ctxOf(viewer), (tx) =>
    tx
      .select({ id: groups.id, short: groups.short, code: groups.code })
      .from(groups)
      .orderBy(asc(groups.short)),
  );
}

export async function groupLessons(viewer: StaffViewer, groupId: string, fromDay: string, days = 7) {
  return withDb(ctxOf(viewer), async (tx) => {
    const rows = await tx
      .select({
        id: lessons.id,
        startsAt: lessons.startsAt,
        slot: lessons.slot,
        room: lessons.room,
        status: lessons.status,
        subject: subjects.short,
        kind: lessons.kind,
        format: lessons.format,
      })
      .from(lessons)
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .where(
        and(
          eq(lessons.groupId, groupId),
          sql`${lessons.startsAt} >= ${at(fromDay, '00:00').toISOString()}::timestamptz`,
          sql`${lessons.startsAt} < ${at(addDays(fromDay, days), '00:00').toISOString()}::timestamptz`,
        ),
      )
      .orderBy(asc(lessons.startsAt));
    return rows.map((r) => ({ ...r, startsAt: r.startsAt.toISOString() }));
  });
}

async function groupStudentIds(tx: Tx, groupIds: string[]) {
  const rows = await tx
    .select({ id: students.userId })
    .from(students)
    .where(inArray(students.groupId, groupIds));
  return rows.map((r) => r.id);
}

/** Перенос пары или смена аудитории. Студенты группы получают уведомление сразу. */
export async function changeLesson(
  viewer: StaffViewer,
  input: { lessonId: string; room?: string; moveTo?: { day: string; slot: number; room: string } },
) {
  return withDb(ctxOf(viewer), async (tx) => {
    const [l] = await tx
      .select({ l: lessons, subject: subjects.name })
      .from(lessons)
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .where(eq(lessons.id, input.lessonId));
    if (!l || l.l.status !== 'scheduled') throw new UserError('Это занятие нельзя изменить');
    const now = new Date();
    const ids = await groupStudentIds(tx, [l.l.groupId]);
    const day = dayOf(l.l.startsAt);

    if (input.moveTo) {
      const s = slotTimes(input.moveTo.slot);
      const startsAt = at(input.moveTo.day, s.start);
      const endsAt = at(input.moveTo.day, s.end);
      const [created] = await tx
        .insert(lessons)
        .values({
          courseId: l.l.courseId,
          groupId: l.l.groupId,
          teacherId: l.l.teacherId,
          slot: input.moveTo.slot,
          kind: l.l.kind,
          format: l.l.format,
          room: input.moveTo.room || l.l.room,
          onlineUrl: l.l.onlineUrl,
          startsAt,
          endsAt,
          movedFromId: l.l.id,
          changeNote: `Перенесена с ${shortDate(day)}`,
          changedAt: now,
        })
        .returning({ id: lessons.id });
      await tx
        .update(lessons)
        .set({
          status: 'moved',
          changeNote: `Перенесена на ${shortDate(input.moveTo.day)}, ${s.start}`,
          changedAt: now,
        })
        .where(eq(lessons.id, l.l.id));
      await notify(tx, ids, {
        kind: 'change',
        title: `${l.subject} перенесена`,
        body: `с ${wdShort(day)} ${shortDate(day).slice(3)} ${hhmm(l.l.startsAt)} на ${shortDate(input.moveTo.day)}, ${s.start}`,
        link: '/week',
        tone: 'danger',
      });
      await tx.insert(auditLog).values({
        actorUserId: viewer.userId,
        action: 'lesson.move',
        entity: 'lesson',
        entityId: l.l.id,
        meta: { to: created!.id },
      });
    } else if (input.room) {
      const room = input.room.trim().toUpperCase().slice(0, 20);
      await tx
        .update(lessons)
        .set({ previousRoom: l.l.room, room, changeNote: 'Замена аудитории', changedAt: now })
        .where(eq(lessons.id, l.l.id));
      await notify(tx, ids, {
        kind: 'change',
        title: `${l.subject}: аудитория ${room}`,
        body: `${shortDate(day)}, ${hhmm(l.l.startsAt)} · вместо ${l.l.room ?? 'прежней'}`,
        link: '/week',
        tone: 'danger',
      });
      await tx.insert(auditLog).values({
        actorUserId: viewer.userId,
        action: 'lesson.room',
        entity: 'lesson',
        entityId: l.l.id,
        meta: { room },
      });
    }
    await publish(tx, { kind: 'schedule', groupId: l.l.groupId });
    return ids.length;
  });
}

/** Объявление группе (или всем) — каждому студенту приходит уведомление. */
export async function announce(
  viewer: StaffViewer,
  input: { title: string; body: string; groupIds: string[] },
) {
  return withDb(ctxOf(viewer), async (tx) => {
    const target = input.groupIds.length
      ? input.groupIds
      : (await tx.select({ id: groups.id }).from(groups)).map((g) => g.id);
    await tx.insert(announcements).values({
      authorUserId: viewer.userId,
      title: input.title,
      body: input.body,
      audience: { groupIds: target },
    });
    const ids = await groupStudentIds(tx, target);
    const n = await notify(tx, ids, {
      kind: 'news',
      title: input.title,
      body: input.body.slice(0, 200),
      link: '/notifications',
      tone: 'neutral',
    });
    await tx.insert(auditLog).values({
      actorUserId: viewer.userId,
      action: 'announce',
      entity: 'announcement',
      meta: { groups: target.length, students: n },
    });
    return n;
  });
}
