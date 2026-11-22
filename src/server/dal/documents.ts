import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { withDb } from '@/server/db';
import {
  attachments,
  documentTypes,
  issuedDocuments,
  requestEvents,
  requestRequirements,
  requests,
  type DeliveryValue,
  type DocumentField,
  type RequestStatusValue,
} from '@/server/db/schema';
import { ctxOf, type StudentViewer } from '@/server/auth/guards';

export type { DeliveryValue, RequestStatusValue };

export type DocType = {
  code: string;
  title: string;
  description: string;
  etaText: string;
  etaDaysMax: number;
  fields: DocumentField[];
  deliveries: DeliveryValue[];
  requirements: string[];
  legalBasis: string;
  keywords: string[];
  pickupPlace: string | null;
};

export async function listDocumentTypes(viewer: StudentViewer): Promise<DocType[]> {
  return withDb(ctxOf(viewer), (tx) =>
    tx
      .select({
        code: documentTypes.code,
        title: documentTypes.title,
        description: documentTypes.description,
        etaText: documentTypes.etaText,
        etaDaysMax: documentTypes.etaDaysMax,
        fields: documentTypes.fields,
        deliveries: documentTypes.deliveries,
        requirements: documentTypes.requirements,
        legalBasis: documentTypes.legalBasis,
        keywords: documentTypes.keywords,
        pickupPlace: documentTypes.pickupPlace,
      })
      .from(documentTypes)
      .where(eq(documentTypes.active, true))
      .orderBy(asc(documentTypes.sort)),
  );
}

export type RequestListItem = {
  id: string;
  number: number;
  typeCode: string;
  title: string;
  status: RequestStatusValue;
  createdAt: string;
  updatedAt: string;
  etaTo: string | null;
  etaText: string;
  actionDueOn: string | null;
  pickupPlace: string | null;
  delivery: DeliveryValue;
};

export async function listMyRequests(viewer: StudentViewer): Promise<RequestListItem[]> {
  return withDb(ctxOf(viewer), async (tx) => {
    const rows = await tx
      .select({
        id: requests.id,
        number: requests.number,
        typeCode: requests.typeCode,
        title: documentTypes.title,
        status: requests.status,
        createdAt: requests.createdAt,
        updatedAt: requests.updatedAt,
        etaTo: requests.etaTo,
        etaText: documentTypes.etaText,
        actionDueOn: requests.actionDueOn,
        pickupPlace: documentTypes.pickupPlace,
        delivery: requests.delivery,
      })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .where(eq(requests.studentId, viewer.userId))
      .orderBy(desc(requests.updatedAt));
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  });
}

export type RequestDetail = RequestListItem & {
  payload: Record<string, string>;
  copies: number;
  type: DocType;
  events: { status: RequestStatusValue; at: string; actorName: string | null; comment: string | null }[];
  requirements: {
    id: string;
    title: string;
    satisfiedAt: string | null;
    attachmentId: string | null;
    filename: string | null;
  }[];
  issued: { verifyCode: string; issuedAt: string } | null;
};

/** Заявка по id — только своя. Чужая или несуществующая → null (страница отдаёт 404). */
export async function getMyRequest(viewer: StudentViewer, id: string): Promise<RequestDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return withDb(ctxOf(viewer), async (tx) => {
    const [r] = await tx
      .select({ r: requests, t: documentTypes })
      .from(requests)
      .innerJoin(documentTypes, eq(documentTypes.code, requests.typeCode))
      .where(and(eq(requests.id, id), eq(requests.studentId, viewer.userId)));
    if (!r) return null;
    const events = await tx
      .select({
        status: requestEvents.status,
        at: requestEvents.createdAt,
        actorName: requestEvents.actorName,
        comment: requestEvents.comment,
      })
      .from(requestEvents)
      .where(eq(requestEvents.requestId, id))
      .orderBy(asc(requestEvents.createdAt));
    const reqs = await tx
      .select({
        id: requestRequirements.id,
        title: requestRequirements.title,
        satisfiedAt: requestRequirements.satisfiedAt,
        attachmentId: requestRequirements.attachmentId,
        filename: attachments.filename,
      })
      .from(requestRequirements)
      .leftJoin(attachments, eq(attachments.id, requestRequirements.attachmentId))
      .where(eq(requestRequirements.requestId, id))
      .orderBy(asc(requestRequirements.sort));
    const [issued] = await tx
      .select({ verifyCode: issuedDocuments.verifyCode, issuedAt: issuedDocuments.issuedAt })
      .from(issuedDocuments)
      .where(eq(issuedDocuments.requestId, id));
    const t = r.t;
    return {
      id: r.r.id,
      number: r.r.number,
      typeCode: r.r.typeCode,
      title: t.title,
      status: r.r.status,
      createdAt: r.r.createdAt.toISOString(),
      updatedAt: r.r.updatedAt.toISOString(),
      etaTo: r.r.etaTo,
      etaText: t.etaText,
      actionDueOn: r.r.actionDueOn,
      pickupPlace: t.pickupPlace,
      delivery: r.r.delivery,
      payload: r.r.payload,
      copies: r.r.copies,
      type: {
        code: t.code,
        title: t.title,
        description: t.description,
        etaText: t.etaText,
        etaDaysMax: t.etaDaysMax,
        fields: t.fields,
        deliveries: t.deliveries,
        requirements: t.requirements,
        legalBasis: t.legalBasis,
        keywords: t.keywords,
        pickupPlace: t.pickupPlace,
      },
      events: events.map((e) => ({ ...e, at: e.at.toISOString() })),
      requirements: reqs.map((q) => ({ ...q, satisfiedAt: q.satisfiedAt?.toISOString() ?? null })),
      issued: issued ? { verifyCode: issued.verifyCode, issuedAt: issued.issuedAt.toISOString() } : null,
    };
  });
}

/** Вложение — только своё (или для сотрудника — любое; см. RLS). */
export async function getMyAttachment(viewer: StudentViewer | { role: 'staff'; userId: string }, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return withDb(ctxOf(viewer), async (tx) => {
    const [a] = await tx
      .select({ key: attachments.storageKey, filename: attachments.filename, mime: attachments.mime })
      .from(attachments)
      .where(
        and(
          eq(attachments.id, id),
          viewer.role === 'student' ? eq(attachments.studentId, viewer.userId) : sql`true`,
        ),
      );
    return a ?? null;
  });
}

/** Публичная проверка справки по коду из QR: только минимум через функцию БД (docs/security.md, T14). */
export async function verifyDocument(code: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(code)) return null;
  return withDb({ role: 'anon' }, async (tx) => {
    const rows = await tx.execute<{
      number: number;
      title: string;
      issued_at: string;
      valid_until: string | null;
      holder: string;
    }>(sql`select * from app.verify_document(${code})`);
    return rows[0] ?? null;
  });
}
