import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { withDb } from '@/server/db';
import {
  attachments,
  documentTypes,
  requestEvents,
  requestRequirements,
  requests,
  type DeliveryValue,
} from '@/server/db/schema';
import { ctxOf, type StudentViewer } from '@/server/auth/guards';
import { MAX_UPLOAD, sniffType, storage } from '@/server/storage';
import { publish } from '@/server/events/publish';

export class UserError extends Error {}

export type NewRequestInput = {
  typeCode: string;
  delivery: DeliveryValue;
  copies: number;
  payload: Record<string, string>;
  /** «через помощника», если черновик собрал ИИ. */
  source?: 'assistant' | 'form';
  /** Ключ идемпотентности: повторная отправка того же черновика не создаст дубль. */
  draftId?: string;
};

/** Новая заявка от студента. Владелец — только из сессии; тип, формат и поля проверяются по справочнику. */
export async function createRequest(
  viewer: StudentViewer,
  input: NewRequestInput,
): Promise<{ id: string; number: number }> {
  return withDb(ctxOf(viewer), async (tx) => {
    const [type] = await tx
      .select()
      .from(documentTypes)
      .where(and(eq(documentTypes.code, input.typeCode), eq(documentTypes.active, true)));
    if (!type) throw new UserError('Такой справки нет в списке');
    if (!type.deliveries.includes(input.delivery)) throw new UserError('Этот формат для справки недоступен');
    const copies = Math.min(5, Math.max(1, Math.round(input.copies)));
    const allowed = new Set(type.fields.map((f) => f.key));
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.payload)) {
      if (allowed.has(k) && typeof v === 'string') payload[k] = v.trim().slice(0, 200);
    }
    for (const f of type.fields) {
      if (f.type === 'select' && payload[f.key] && !f.options?.includes(payload[f.key]!))
        throw new UserError(`Поле «${f.label}»: выберите из списка`);
      if (!payload[f.key] && f.default) payload[f.key] = f.default;
    }

    if (input.draftId) {
      const dup = await tx
        .select({ id: requests.id, number: requests.number })
        .from(requests)
        .where(and(eq(requests.studentId, viewer.userId), eq(requests.comment, `draft:${input.draftId}`)));
      if (dup[0]) return dup[0];
    }

    const [r] = await tx
      .insert(requests)
      .values({
        studentId: viewer.userId,
        typeCode: type.code,
        delivery: input.delivery,
        copies,
        payload,
        comment: input.draftId ? `draft:${input.draftId}` : null,
      })
      .returning({ id: requests.id, number: requests.number });
    await tx.insert(requestEvents).values({
      requestId: r!.id,
      studentId: viewer.userId,
      status: 'sent',
      actorUserId: viewer.userId,
      actorName: 'вы',
      comment: input.source === 'assistant' ? 'через помощника' : null,
    });
    if (type.requirements.length)
      await tx
        .insert(requestRequirements)
        .values(
          type.requirements.map((title, i) => ({
            requestId: r!.id,
            studentId: viewer.userId,
            title,
            sort: i,
          })),
        );
    await publish(tx, { kind: 'queue', requestId: r!.id });
    return r!;
  });
}

/** Отмена своей заявки — пока деканат её не подготовил. */
export async function cancelRequest(viewer: StudentViewer, id: string) {
  return withDb(ctxOf(viewer), async (tx) => {
    const [r] = await tx
      .select({ status: requests.status })
      .from(requests)
      .where(and(eq(requests.id, id), eq(requests.studentId, viewer.userId)));
    if (!r) throw new UserError('Заявка не найдена');
    if (r.status !== 'sent' && r.status !== 'in_progress')
      throw new UserError('Эту заявку уже нельзя отменить');
    await tx.update(requests).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(requests.id, id));
    await tx
      .insert(requestEvents)
      .values({
        requestId: id,
        studentId: viewer.userId,
        status: 'cancelled',
        actorUserId: viewer.userId,
        actorName: 'вы',
      });
    await publish(tx, { kind: 'queue', requestId: id });
  });
}

/**
 * Загрузка документа в заявку. Проверки: владелец, статус, размер, тип по сигнатуре.
 * Когда приложены все нужные документы — заявка сама возвращается в работу.
 */
export async function attachFile(
  viewer: StudentViewer,
  requestId: string,
  requirementId: string | null,
  file: { name: string; bytes: Uint8Array },
) {
  if (file.bytes.byteLength === 0) throw new UserError('Файл пустой');
  if (file.bytes.byteLength > MAX_UPLOAD) throw new UserError('Файл больше 10 МБ');
  const mime = sniffType(file.bytes);
  if (!mime) throw new UserError('Нужен PDF, JPG или PNG');
  const safeName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'файл';

  return withDb(ctxOf(viewer), async (tx) => {
    const [r] = await tx
      .select({ status: requests.status })
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.studentId, viewer.userId)));
    if (!r) throw new UserError('Заявка не найдена');
    if (!['sent', 'in_progress', 'need_action'].includes(r.status))
      throw new UserError('В эту заявку уже нельзя добавить файл');

    const key = await storage().put('attach', file.bytes);
    const [a] = await tx
      .insert(attachments)
      .values({
        requestId,
        studentId: viewer.userId,
        filename: safeName,
        mime,
        size: file.bytes.byteLength,
        storageKey: key,
        sha256: createHash('sha256').update(file.bytes).digest('hex'),
        uploadedBy: viewer.userId,
      })
      .returning({ id: attachments.id });

    if (requirementId) {
      await tx
        .update(requestRequirements)
        .set({ attachmentId: a!.id, satisfiedAt: new Date() })
        .where(and(eq(requestRequirements.id, requirementId), eq(requestRequirements.requestId, requestId)));
    }
    const missing = await tx
      .select({ id: requestRequirements.id })
      .from(requestRequirements)
      .where(and(eq(requestRequirements.requestId, requestId), isNull(requestRequirements.satisfiedAt)));
    let status = r.status;
    if (r.status === 'need_action' && missing.length === 0) {
      status = 'in_progress';
      await tx
        .update(requests)
        .set({ status, actionDueOn: null, updatedAt: new Date() })
        .where(eq(requests.id, requestId));
      await tx.insert(requestEvents).values({
        requestId,
        studentId: viewer.userId,
        status,
        actorUserId: viewer.userId,
        actorName: 'вы',
        comment: `приложен документ: ${safeName}`,
      });
    }
    await publish(tx, { kind: 'queue', requestId });
    return { attachmentId: a!.id, status };
  });
}
