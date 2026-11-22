import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStudent } from '@/server/auth/guards';
import { getMyRequest } from '@/server/dal/documents';
import { DELIVERY, STATUS_WORD, canCancel, statusExplain, steps } from '@/lib/requests';
import { dayMonth, dayOf } from '@/lib/time';
import { cn } from '@/lib/cn';
import { HeroRing, PhoneSheet, PhoneSubTop } from '@/components/shell/PhoneTop';
import { DeskCard } from '@/components/ui/desk';
import { IconTile } from '@/components/ui/primitives';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { CancelRequest, SpecialistLink, Timeline, UploadButton } from '@/components/features/documents/parts';

export const metadata = { title: 'Заявка' };

/**
 * Заявка (макеты B2DocFlow «Нет точной даты» и «Нужно действие»).
 * Своя заявка — иначе 404 без подсказки, что такая существует.
 */
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStudent();
  const { id } = await params;
  const r = await getMyRequest(viewer, id);
  if (!r) notFound();

  const st = steps(r);
  const need = r.status === 'need_action';
  const missing = r.requirements.filter((q) => !q.satisfiedAt);
  const lastNeed = [...r.events].reverse().find((e) => e.status === 'need_action');
  const who =
    [...r.events].reverse().find((e) => e.actorName && e.actorName !== 'вы')?.actorName ??
    'методист дирекции';
  const title = `${r.title} · №${r.number}`;

  const heroBody = need ? (
    <>
      <StaggerItem className="mt-[22px] text-[14px] font-bold">Нужно от вас</StaggerItem>
      <StaggerItem className="mt-2 text-[40px] leading-none font-black tracking-[-0.04em]">
        {missing[0]?.title ?? 'Документ'}
      </StaggerItem>
      <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
        {(lastNeed?.comment ?? 'Деканат просит приложить документ').replace(/[.!]?$/, '.')}
        {r.actionDueOn && (
          <>
            {' '}
            Загрузите <b>до {dayMonth(r.actionDueOn)}</b>
            {r.typeCode === 'material_aid' ? ' — иначе заявка перенесётся на следующую комиссию.' : '.'}
          </>
        )}
      </StaggerItem>
      <StaggerItem className="mt-4">
        <UploadButton requestId={r.id} requirementId={missing[0]?.id} />
      </StaggerItem>
    </>
  ) : (
    <>
      <StaggerItem className="mt-[22px] text-[14px] font-bold">Статус</StaggerItem>
      <StaggerItem className="mt-2 text-[56px] leading-none font-black tracking-[-0.04em]">
        {STATUS_WORD[r.status]}
      </StaggerItem>
      <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
        {statusExplain(r)}
      </StaggerItem>
      {(r.status === 'ready' || r.status === 'issued') && (
        <StaggerItem className="mt-4">
          <a
            href={`/api/documents/${r.id}/pdf`}
            className="flex h-12 w-full items-center justify-center rounded-[15px] bg-ink text-[15px] font-extrabold text-surface lg:w-auto lg:px-6"
          >
            Скачать PDF
          </a>
        </StaggerItem>
      )}
    </>
  );

  const contents = (
    <>
      <h2 className="m-0 mb-1 text-[18px] font-bold">Что в заявке</h2>
      {[
        ...r.type.fields.map((f) => [f.label, r.payload[f.key] ?? f.default ?? '—'] as const),
        ['Формат', DELIVERY[r.delivery] ?? r.delivery] as const,
        ...(r.copies > 1 ? [['Экземпляров', String(r.copies)] as const] : []),
        ['Подана', dayMonth(dayOf(r.createdAt))] as const,
      ].map(([k, v], i) => (
        <div
          key={k}
          className={cn('flex min-h-10 items-center gap-3 py-2 text-[15px]', i > 0 && 'border-t border-line')}
        >
          <span className="flex-1">{k}</span>
          <span className="text-right text-[14px] font-semibold">{v}</span>
        </div>
      ))}
    </>
  );

  const reqs = r.requirements.length > 0 && (
    <section>
      <h2 className="m-0 mb-1 text-[18px] font-bold">Документы в заявке</h2>
      {[...r.requirements]
        .sort((a, b) => Number(Boolean(a.satisfiedAt)) - Number(Boolean(b.satisfiedAt)))
        .map((q, i) => (
          <div
            key={q.id}
            className={cn(
              'flex min-h-10 items-center gap-3 py-2 text-[15px]',
              i > 0 && 'border-t border-line',
            )}
          >
            <IconTile
              icon={q.satisfiedAt ? 'check' : 'alert'}
              tone={q.satisfiedAt ? 'ok' : 'danger'}
              size={28}
            />
            <span className={cn('flex-1', !q.satisfiedAt && 'font-bold')}>
              {q.title}
              {q.filename && <span className="block text-[12px] font-semibold text-ink-2">{q.filename}</span>}
            </span>
            {q.satisfiedAt ? (
              q.attachmentId ? (
                <a
                  href={`/api/files/${q.attachmentId}`}
                  className="text-[13px] font-bold text-ink-2 underline-offset-2 hover:underline"
                >
                  {dayMonth(dayOf(q.satisfiedAt))}
                </a>
              ) : (
                <span className="text-[13px] text-ink-2">{dayMonth(dayOf(q.satisfiedAt))}</span>
              )
            ) : (
              <span className="text-[13px] font-bold text-danger">нужна</span>
            )}
          </div>
        ))}
      <div className="mt-1.5 text-[12px] font-semibold text-ink-2">PDF или фото, до 10 МБ</div>
    </section>
  );

  const actions = (
    <>
      {need && (
        <Link
          href={`/assistant?q=${encodeURIComponent(`Где взять ${missing[0]?.title.toLowerCase() ?? 'документ'}?`)}`}
          className="mt-2 flex min-h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 text-[14px] font-bold"
        >
          <span className="flex-1">
            Где взять {missing[0]?.title.toLowerCase().replace('справка', 'справку') ?? 'документ'}? Спросить
            помощника
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
      {!need && <SpecialistLink who={who} className="mt-2.5" />}
      {canCancel(r.status) && <CancelRequest id={r.id} />}
    </>
  );

  return (
    <>
      {/* ---------- Телефон ---------- */}
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <PhoneSubTop title={title} backHref="/documents">
          <Stagger delay={0.04}>{heroBody}</Stagger>
        </PhoneSubTop>
        <PhoneSheet className="pt-[18px]">
          <h2 className="m-0 mb-2.5 text-[18px] font-bold">Как идёт</h2>
          <Timeline steps={st} />
          {need ? (
            <>
              {actions}
              <div className="mt-4">{reqs}</div>
            </>
          ) : (
            <>
              <div className="mt-2.5">{contents}</div>
              {reqs && <div className="mt-4">{reqs}</div>}
              {actions}
            </>
          )}
          <div className="h-4" />
        </PhoneSheet>
      </div>

      {/* ---------- Компьютер ---------- */}
      <div className="hidden lg:block">
        <Link href="/documents" className="text-[14px] font-bold text-ink-2 hover:text-ink-desk">
          ← Документы
        </Link>
        <h1 className="m-0 mt-2 mb-[18px] text-[36px] font-black tracking-[-0.03em]">{title}</h1>
        <Stagger className="grid grid-cols-[1.1fr_1fr] gap-3.5">
          <StaggerItem>
            <DeskCard
              tone={need ? 'accent' : r.status === 'ready' ? 'accent' : 'white'}
              className="min-h-[300px] p-[26px]"
            >
              {(need || r.status === 'ready') && (
                <span
                  aria-hidden
                  className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
                />
              )}
              <div className="relative [&>div]:max-w-[520px]">
                <Stagger>{heroBody}</Stagger>
              </div>
            </DeskCard>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full rounded-[24px] bg-surface px-6 py-5">
              <h2 className="m-0 mb-2.5 text-[18px] font-bold">Как идёт</h2>
              <Timeline steps={st} />
            </section>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full rounded-[24px] bg-surface px-6 py-5">{contents}</section>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full rounded-[24px] bg-surface px-6 py-5">
              {reqs}
              {actions}
            </section>
          </StaggerItem>
        </Stagger>
      </div>
    </>
  );
}
