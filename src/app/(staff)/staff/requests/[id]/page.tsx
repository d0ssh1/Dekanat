import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/server/auth/guards';
import { getStaffRequest } from '@/server/services/staff';
import { DELIVERY, STATUS_WORD } from '@/lib/requests';
import { dayMonth, dayOf, hhmm } from '@/lib/time';
import { cn } from '@/lib/cn';
import { StaffActions } from './StaffActions';

export const metadata = { title: 'Заявка — сотрудник' };

export default async function StaffRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const r = await getStaffRequest(viewer, (await params).id);
  if (!r) notFound();
  return (
    <>
      <Link href="/staff" className="text-[14px] font-bold text-ink-2">
        ← Очередь
      </Link>
      <h1 className="m-0 mt-2 text-[32px] leading-tight font-black tracking-[-0.03em]">
        {r.title} · №{r.number}
      </h1>
      <div className="mt-1 text-[15px] text-ink-2">
        {r.student.name} · {r.student.group} · {r.student.course} курс · зачётка {r.student.recordBook}
      </div>
      <div className="mt-5 grid gap-3.5 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-[24px] bg-surface px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="rounded-[10px] bg-desk-chip px-2.5 py-1 text-[13px] font-bold">
              {STATUS_WORD[r.status]}
            </span>
            {r.etaTo && <span className="text-[13px] text-ink-2">срок: {dayMonth(r.etaTo)}</span>}
          </div>
          <h2 className="m-0 mt-4 text-[16px] font-bold">Что в заявке</h2>
          {[
            ...r.fields.map((f) => [f.label, r.payload[f.key] ?? '—'] as const),
            ['Формат', DELIVERY[r.delivery]] as const,
            ['Экземпляров', String(r.copies)] as const,
          ].map(([k, v], i) => (
            <div key={k} className={cn('flex gap-3 py-2 text-[15px]', i > 0 && 'border-t border-desk-line')}>
              <span className="w-36 shrink-0 text-ink-2">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          {(r.requirements.length > 0 || r.files.length > 0) && (
            <>
              <h2 className="m-0 mt-4 text-[16px] font-bold">Документы</h2>
              {r.requirements.map((q) => (
                <div key={q.id} className="flex gap-3 py-1.5 text-[14px]">
                  <span className={q.satisfied ? 'text-ok' : 'text-danger'}>{q.satisfied ? '✓' : '!'}</span>
                  {q.title}
                </div>
              ))}
              {r.files.map((f) => (
                <a
                  key={f.id}
                  href={`/api/files/${f.id}`}
                  className="flex gap-3 py-1.5 text-[14px] font-bold underline-offset-2 hover:underline"
                >
                  ↓ {f.filename}{' '}
                  <span className="font-normal text-ink-2">{Math.round(f.size / 1024)} КБ</span>
                </a>
              ))}
            </>
          )}
          <h2 className="m-0 mt-4 text-[16px] font-bold">История</h2>
          <ol className="m-0 list-none p-0">
            {r.events.map((e, i) => (
              <li key={i} className="flex gap-3 py-1.5 text-[14px]">
                <span className="w-28 shrink-0 text-ink-2 tabular">
                  {dayMonth(dayOf(e.at))}, {hhmm(e.at)}
                </span>
                <span>
                  <b>{STATUS_WORD[e.status]}</b>
                  {e.actorName && <> · {e.actorName === 'вы' ? 'студент' : e.actorName}</>}
                  {e.comment && <span className="text-ink-2"> · {e.comment}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-3.5">
          <StaffActions id={r.id} status={r.status} hasPdf={r.status === 'ready' || r.status === 'issued'} />
          {/* Кто ждёт и что он увидит — методисту не нужно держать это в голове. */}
          <section className="flex-1 rounded-[24px] bg-surface px-6 py-5">
            <h2 className="m-0 mb-1 text-[16px] font-bold">Студент</h2>
            {[
              ['ФИО', r.student.name],
              ['Группа', `${r.student.group}, ${r.student.course} курс`],
              ['Зачётка', r.student.recordBook],
              ['Почта', r.student.email],
            ].map(([k, v], i) => (
              <div
                key={k}
                className={cn('flex gap-3 py-2 text-[14px]', i > 0 && 'border-t border-desk-line')}
              >
                <span className="w-24 shrink-0 text-ink-2">{k}</span>
                <span className="min-w-0 font-semibold break-words">{v}</span>
              </div>
            ))}
            <p className="m-0 mt-3 rounded-[14px] bg-desk-chip px-3.5 py-3 text-[13px] leading-snug">
              Любое действие студент видит сразу: статус в «Документах» и уведомление. Комментарий к «Нужен
              документ» он прочитает дословно, поэтому пишите, что именно приложить и до какого числа.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
