import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { withDb } from '@/server/db';
import { documentTypes, groups, institutes, issuedDocuments, requests, students } from '@/server/db/schema';
import type { Viewer } from '@/server/auth/guards';
import { ctxOf } from '@/server/auth/guards';
import { storage } from '@/server/storage';
import { renderCertificate } from '@/server/pdf/certificate';
import { dayMonth, dayOf, addDays } from '@/lib/time';

/**
 * PDF готовой справки. Сначала проверяем доступ контекстом смотрящего (студент — только свою,
 * RLS это подтверждает), и только потом сервис от имени системы создаёт и сохраняет PDF.
 */
export async function getCertificatePdf(
  viewer: Viewer,
  requestId: string,
): Promise<{ bytes: Buffer; filename: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return null;
  const allowed = await withDb(ctxOf(viewer), async (tx) => {
    const [r] = await tx
      .select({ status: requests.status, number: requests.number })
      .from(requests)
      .where(
        and(
          eq(requests.id, requestId),
          viewer.role === 'student' ? eq(requests.studentId, viewer.userId) : undefined,
        ),
      );
    return r && (r.status === 'ready' || r.status === 'issued') ? r : null;
  });
  if (!allowed) return null;

  const existing = await withDb({ role: 'system' }, (tx) =>
    tx
      .select({ key: issuedDocuments.storageKey })
      .from(issuedDocuments)
      .where(eq(issuedDocuments.requestId, requestId)),
  );
  const filename = `spravka-${allowed.number}.pdf`;
  if (existing[0]) return { bytes: await storage().get(existing[0].key), filename };

  return withDb({ role: 'system' }, async (tx) => {
    const [row] = await tx
      .select({ r: requests, t: documentTypes, s: students, g: groups, i: institutes })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .innerJoin(students, eq(students.userId, requests.studentId))
      .innerJoin(groups, eq(groups.id, students.groupId))
      .innerJoin(institutes, eq(institutes.id, groups.instituteId))
      .where(eq(requests.id, requestId));
    if (!row) return null;
    const code = randomBytes(18).toString('base64url');
    const today = dayOf(new Date());
    const bytes = await renderCertificate({
      title: row.t.title,
      number: row.r.number,
      issuedOn: dayMonth(today) + ' ' + today.slice(0, 4),
      fullName: [row.s.lastName, row.s.firstName, row.s.middleName].filter(Boolean).join(' '),
      institute: row.i.name,
      direction: `${row.g.directionCode} ${row.g.directionName}`,
      course: row.g.course,
      group: row.g.code,
      studyForm: row.s.studyForm,
      funding: row.s.funding,
      destination: row.r.payload.destination ?? 'по месту требования',
      verifyUrl: `${process.env.PUBLIC_URL ?? 'http://localhost:3000'}/verify/${code}`,
      signer: 'Методист О. П. Иванова',
    });
    const key = await storage().put('issued', bytes);
    await tx.insert(issuedDocuments).values({
      requestId,
      studentId: row.r.studentId,
      storageKey: key,
      verifyCode: code,
      validUntil: addDays(today, 90),
    });
    return { bytes: Buffer.from(bytes), filename };
  });
}
