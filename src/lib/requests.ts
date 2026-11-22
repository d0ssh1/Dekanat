/**
 * Заявки простыми словами: статус одним словом, шаги «Как идёт», срок — честно, даже если точной даты нет.
 */
import type { RequestDetail, RequestListItem, RequestStatusValue } from '@/server/dal/documents';
import { addDays, dayMonth, dayOf, diffDays, hhmm, weekday } from './time';

export const STATUS_WORD: Record<RequestStatusValue, string> = {
  sent: 'Отправлена',
  in_progress: 'Принята',
  need_action: 'Нужен документ',
  ready: 'Готова',
  issued: 'Выдана',
  rejected: 'Отклонена',
  cancelled: 'Отменена',
};

export const DELIVERY: Record<string, string> = {
  pdf: 'PDF с QR',
  paper: 'Бумажная',
  pdf_and_paper: 'Бумажная + PDF с QR',
};

/** Срок «по правилам»: N рабочих дней от подачи. */
export function ruleDeadline(createdAt: string, workDays: number) {
  let d = dayOf(createdAt);
  let left = workDays;
  while (left > 0) {
    d = addDays(d, 1);
    if (weekday(d) <= 5) left--;
  }
  return d;
}

/** Строка в списке: «Готовится · будет завтра», «Принята · точной даты пока нет, обычно 1–2 дня». */
export function listLine(
  r: RequestListItem,
  today: string,
): { text: string; tone: 'ok' | 'danger' | 'muted' } {
  switch (r.status) {
    case 'need_action':
      return {
        text: `Нужен документ от вас${r.actionDueOn ? ` · до ${r.actionDueOn.slice(8)}.${r.actionDueOn.slice(5, 7)}` : ''}`,
        tone: 'danger',
      };
    case 'ready':
      return {
        text: `Готова${r.pickupPlace && r.delivery !== 'pdf' ? ` · PDF или в ${r.pickupPlace}` : ' · PDF'}`,
        tone: 'ok',
      };
    case 'in_progress':
      if (r.etaTo) {
        const d = diffDays(today, r.etaTo);
        return {
          text: `Готовится · будет ${d <= 0 ? 'сегодня' : d === 1 ? 'завтра' : dayMonth(r.etaTo)}`,
          tone: 'muted',
        };
      }
      return {
        text: `Принята · точной даты пока нет, ${r.etaText.replace(/ (дня|дней|день)/, ' $1')}`,
        tone: 'muted',
      };
    case 'sent':
      return { text: `Отправлена · ${r.etaText}`, tone: 'muted' };
    case 'issued':
      return { text: 'Выдана', tone: 'muted' };
    case 'rejected':
      return { text: 'Отклонена', tone: 'danger' };
    case 'cancelled':
      return { text: 'Отменена вами', tone: 'muted' };
  }
}

export type Step = { key: string; title: string; note: string; state: 'done' | 'current' | 'todo' | 'alert' };

const fmtAt = (iso: string) => `${dayMonth(dayOf(iso))}, ${hhmm(iso)}`;

/** Шаги «Как идёт» из событий заявки. */
export function steps(r: RequestDetail): Step[] {
  const ev = (s: RequestStatusValue) => [...r.events].reverse().find((e) => e.status === s);
  const who = (e?: { actorName: string | null; comment: string | null }) =>
    [e?.actorName && e.actorName !== 'вы' ? e.actorName : null, e?.comment].filter(Boolean).join(' · ');
  const sent = ev('sent');
  const accepted = ev('in_progress');
  const need = r.status === 'need_action' ? ev('need_action') : undefined;
  const ready = ev('ready');
  const isAid = r.typeCode === 'material_aid';
  const order: RequestStatusValue[] = ['sent', 'in_progress', 'need_action', 'ready', 'issued'];
  const pos = order.indexOf(r.status);

  const list: Step[] = [
    {
      key: 'sent',
      title: 'Отправлена',
      note: sent ? `${fmtAt(sent.at)}${sent.comment ? ` · ${sent.comment}` : ''}` : '',
      state: 'done',
    },
  ];
  if (need) {
    list.push({
      key: 'need',
      title: 'Ждёт документ',
      note: `с ${dayMonth(dayOf(need.at))} · запросила ${need.actorName ?? 'деканат'}`,
      state: 'alert',
    });
  } else {
    list.push({
      key: 'accepted',
      title: r.status === 'in_progress' && !r.etaTo ? 'Принята в работу · сейчас' : 'Принята в работу',
      note: accepted
        ? `${fmtAt(accepted.at)}${who(accepted) ? ` · ${who(accepted)}` : ''}`
        : 'обычно в течение рабочего дня',
      state: accepted
        ? r.status === 'in_progress' && !r.etaTo
          ? 'current'
          : 'done'
        : r.status === 'sent'
          ? 'current'
          : 'todo',
    });
  }
  if (isAid) {
    // Комиссия заседает по четвергам — показываем ближайшую дату, а не «раз в две недели».
    let c = addDays(dayOf(new Date().toISOString()), 1);
    while (weekday(c) !== 4) c = addDays(c, 1);
    list.push({
      key: 'commission',
      title: 'Комиссия',
      note: `ближайшее заседание — ${dayMonth(c)}`,
      state: pos >= 3 ? 'done' : 'todo',
    });
    list.push({
      key: 'decision',
      title: 'Решение и выплата',
      note: 'обычно в течение 10 дней после комиссии',
      state: pos >= 3 ? 'current' : 'todo',
    });
    return list;
  }
  list.push({
    key: 'making',
    title: r.status === 'in_progress' && r.etaTo ? 'Готовится · сейчас' : 'Готовится',
    note: r.etaTo ? `будет ${dayMonth(r.etaTo)}` : r.etaText.replace(/^обычно/, 'обычно'),
    state: pos >= 3 ? 'done' : r.status === 'in_progress' && r.etaTo ? 'current' : 'todo',
  });
  list.push({
    key: 'ready',
    title: 'Готова к выдаче',
    note: ready
      ? `${fmtAt(ready.at)}`
      : r.delivery === 'pdf'
        ? 'PDF появится здесь'
        : `PDF здесь и бумажная в ${r.pickupPlace ?? 'деканате'}`,
    state: r.status === 'ready' ? 'current' : r.status === 'issued' ? 'done' : 'todo',
  });
  return list;
}

/** Пояснение к статусу — честно про сроки. */
export function statusExplain(r: RequestDetail) {
  const deadline = ruleDeadline(r.createdAt, r.type.etaDaysMax);
  switch (r.status) {
    case 'sent':
      return `Деканат ещё не взял в работу. По правилам — до ${dayMonth(deadline)}, ${r.etaText}.`;
    case 'in_progress':
      return r.etaTo
        ? `Будет готова ${dayMonth(r.etaTo)}. Сообщим, как только можно будет забрать.`
        : `Точной даты пока нет. По правилам — до ${dayMonth(deadline)}, ${r.etaText}. Сообщим сразу, как будет готова.`;
    case 'ready':
      return r.delivery === 'pdf'
        ? 'Готова. Скачайте PDF с QR-кодом — его можно проверить по ссылке.'
        : `Готова. Скачайте PDF с QR или заберите бумажную в ${r.pickupPlace ?? 'деканате'}.`;
    case 'issued':
      return 'Справка выдана.';
    case 'cancelled':
      return 'Вы отменили заявку.';
    case 'rejected':
      return 'Деканат отклонил заявку — причина в шагах ниже.';
    case 'need_action':
      return '';
  }
}

export const canCancel = (s: RequestStatusValue) => s === 'sent' || s === 'in_progress';
