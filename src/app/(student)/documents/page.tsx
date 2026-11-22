import Link from 'next/link';
import { requireStudent } from '@/server/auth/guards';
import { resolveNow } from '@/server/clock';
import { listDocumentTypes, listMyRequests, type RequestListItem } from '@/server/dal/documents';
import { listLine } from '@/lib/requests';
import { dayMonth, dayOf } from '@/lib/time';
import { cn } from '@/lib/cn';
import { HeroRing, PhoneSheet } from '@/components/shell/PhoneTop';
import { ButtonLink } from '@/components/ui/Button';
import { DeskCard } from '@/components/ui/desk';
import { IconTile } from '@/components/ui/primitives';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

export const metadata = { title: 'Документы' };

const ACTIVE = ['need_action', 'ready', 'in_progress', 'sent'] as const;
const twoLines = (t: string) => {
  const i = t.indexOf(' ');
  return i > 0 ? (
    <>
      {t.slice(0, i)}
      <br />
      {t.slice(i + 1)}
    </>
  ) : (
    t
  );
};

/** Документы (макет B2DocFlow «Список»): сверху — то, что требует вас прямо сейчас. */
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ now?: string }> }) {
  const viewer = await requireStudent();
  const now = resolveNow((await searchParams).now);
  const today = dayOf(now);
  const [all, types] = await Promise.all([listMyRequests(viewer), listDocumentTypes(viewer)]);
  const active = all.filter((r) => (ACTIVE as readonly string[]).includes(r.status));
  const archive = all.filter((r) => !(ACTIVE as readonly string[]).includes(r.status));
  const need = active.find((r) => r.status === 'need_action');
  const ready = active.find((r) => r.status === 'ready');
  // Как в макете B2DocFlow: сверху готовая справка («можно забрать»), «нужен документ» — красной строкой в списке.
  const focus = ready ?? need;
  const rest = active.filter((r) => r !== focus);
  const popular = types.slice(0, 3);

  const hero = focus ? (
    <Stagger delay={0.04}>
      <StaggerItem className="mt-[22px] text-[14px] font-bold">
        {focus.status === 'ready' ? 'Можно забрать' : 'Нужно от вас'}
      </StaggerItem>
      <StaggerItem className="mt-2 text-[40px] leading-none font-black tracking-[-0.04em]">
        {focus.status === 'ready' ? twoLines(focus.title) : twoLines('Документ к заявке')}
      </StaggerItem>
      <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
        {focus.status === 'ready'
          ? focus.delivery === 'pdf'
            ? 'Готова. Скачайте PDF с QR-кодом.'
            : `Готова. Скачайте PDF с QR или заберите бумажную в ${focus.pickupPlace ?? 'деканате'}.`
          : `«${focus.title}» №${focus.number}: деканат ждёт документ${focus.actionDueOn ? ` до ${dayMonth(focus.actionDueOn)}` : ''}.`}
      </StaggerItem>
      <StaggerItem className="mt-4">
        {focus.status === 'ready' ? (
          <a
            href={`/api/documents/${focus.id}/pdf`}
            className="flex h-12 w-full items-center justify-center rounded-[15px] bg-ink text-[15px] font-extrabold text-surface"
          >
            Скачать PDF
          </a>
        ) : (
          <ButtonLink href={`/documents/${focus.id}`} block>
            Открыть заявку
          </ButtonLink>
        )}
      </StaggerItem>
    </Stagger>
  ) : (
    <Stagger delay={0.04}>
      <StaggerItem className="mt-[22px] text-[14px] font-bold">Нужна справка?</StaggerItem>
      <StaggerItem className="mt-2 text-[40px] leading-none font-black tracking-[-0.04em]">
        Закажите
        <br />
        за минуту
      </StaggerItem>
      <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
        Напишите помощнику, что нужно, — он соберёт заявку сам.
      </StaggerItem>
      <StaggerItem className="mt-4">
        <ButtonLink href="/documents/new" block>
          Заказать справку
        </ButtonLink>
      </StaggerItem>
    </Stagger>
  );

  return (
    <>
      {/* ---------- Телефон ---------- */}
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <div className="relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[22px]">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 flex-1 text-[17px] font-bold">Документы</h1>
            <a
              href="#archive"
              aria-label="Архив заявок"
              className="flex size-11 items-center justify-center rounded-[15px] bg-glass-50"
            >
              <IconTileless />
            </a>
          </div>
          {hero}
        </div>
        <PhoneSheet className="pt-[18px]">
          <h2 className="m-0 mb-0.5 text-[18px] font-bold">В работе</h2>
          {rest.length ? (
            <Stagger delay={0.1}>
              {rest.map((r, i) => (
                <StaggerItem key={r.id}>
                  <RequestRow r={r} today={today} first={i === 0} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <p className="m-0 py-3 text-[15px] text-ink-2">Других заявок в работе нет.</p>
          )}
          <Link
            href="/assistant?q=нужна справка"
            className="mt-3 flex min-h-12 items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 text-[14px] font-bold"
          >
            <span className="flex-1">Заказать — опишите помощнику, что нужно</span>
            <span aria-hidden>→</span>
          </Link>
          <h2 className="m-0 mt-6 text-[18px] font-bold">Заказать</h2>
          {popular.map((t, i) => (
            <Link
              key={t.code}
              href={`/documents/new?type=${t.code}`}
              className={cn(
                'flex min-h-12 items-center gap-3 py-2.5 text-[15px]',
                i > 0 && 'border-t border-line',
              )}
            >
              <span className="flex-1">{t.title}</span>
              <span className="text-[13px] font-semibold text-ink-2">{t.etaText.replace('обычно ', '')}</span>
              <span aria-hidden className="text-[18px] font-bold text-ink-2">
                →
              </span>
            </Link>
          ))}
          <Link
            href="/documents/new"
            className="flex min-h-12 items-center gap-3 border-t border-line py-2.5 text-[15px] font-bold"
          >
            <span className="flex-1">Ещё {types.length - popular.length} видов</span>
            <span aria-hidden>→</span>
          </Link>
          <Archive items={archive} today={today} />
        </PhoneSheet>
      </div>

      {/* ---------- Компьютер ---------- */}
      <div className="hidden lg:block">
        <div className="mb-[18px] flex items-end justify-between">
          <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">Документы</h1>
          <ButtonLink href="/documents/new" size="md" className="h-11">
            Заказать справку
          </ButtonLink>
        </div>
        <Stagger className="grid grid-cols-[1.1fr_1fr] gap-3.5">
          <StaggerItem>
            <DeskCard tone="accent" className="h-full min-h-[300px] p-[26px]">
              <span
                aria-hidden
                className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
              />
              <div className="relative [&_a]:w-auto [&_a]:px-6">{hero}</div>
            </DeskCard>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full rounded-[24px] bg-surface px-5 py-4">
              <h2 className="m-0 text-[16px] font-bold">В работе</h2>
              {rest.length ? (
                rest.map((r, i) => <RequestRow key={r.id} r={r} today={today} first={i === 0} desk />)
              ) : (
                <p className="text-ink-2">Других заявок нет.</p>
              )}
            </section>
          </StaggerItem>
        </Stagger>
        <section className="mt-3.5 rounded-[24px] bg-surface px-5 py-4">
          <h2 className="m-0 mb-2 text-[16px] font-bold">Заказать</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {types.map((t) => (
              <Link
                key={t.code}
                href={`/documents/new?type=${t.code}`}
                className="flex min-h-[92px] flex-col rounded-[18px] bg-desk-chip p-3.5 transition-transform hover:-translate-y-0.5"
              >
                <b className="text-[15px] leading-tight">{t.title}</b>
                <span className="mt-auto pt-2 text-[12px] font-semibold text-ink-2">{t.etaText}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-3.5 rounded-[24px] bg-surface px-5 py-4">
          <Archive items={archive} today={today} desk />
        </section>
      </div>
    </>
  );
}

function IconTileless() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7h18v13H3zM3 7l2-3h14l2 3M9 12h6" />
    </svg>
  );
}

function RequestRow({
  r,
  today,
  first,
  desk,
}: {
  r: RequestListItem;
  today: string;
  first: boolean;
  desk?: boolean;
}) {
  const line = listLine(r, today);
  const icon = r.status === 'need_action' ? 'alert' : r.status === 'ready' ? 'check' : 'clock';
  const tone = r.status === 'need_action' ? 'danger' : r.status === 'ready' ? 'ok' : 'hero';
  return (
    <Link
      href={`/documents/${r.id}`}
      className={cn(
        'flex min-h-11 items-center gap-3 py-3 text-[15px]',
        !first && (desk ? 'border-t border-desk-line' : 'border-t border-line'),
      )}
    >
      <IconTile icon={icon} tone={tone} size={36} />
      <div className="min-w-0 flex-1">
        <div>
          {r.title} <span className="text-[13px] text-ink-3">№{r.number}</span>
        </div>
        <div
          className={cn(
            'mt-[3px] text-[13px] leading-snug font-semibold',
            line.tone === 'danger' ? 'text-danger' : line.tone === 'ok' ? 'text-ok' : 'text-ink-2',
          )}
        >
          {line.text}
        </div>
      </div>
      <span aria-hidden className="text-[18px] font-bold text-ink-2">
        ›
      </span>
    </Link>
  );
}

function Archive({ items, today, desk }: { items: RequestListItem[]; today: string; desk?: boolean }) {
  if (!items.length) return null;
  return (
    <section id="archive" className={cn(!desk && 'mt-6 pb-2')}>
      <h2 className={cn('m-0 font-bold', desk ? 'text-[16px]' : 'text-[18px]')}>Архив</h2>
      {items.map((r, i) => (
        <RequestRow key={r.id} r={r} today={today} first={i === 0} desk={desk} />
      ))}
    </section>
  );
}
