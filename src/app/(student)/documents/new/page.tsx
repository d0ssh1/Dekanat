import Link from 'next/link';
import { requireStudent } from '@/server/auth/guards';
import { listDocumentTypes } from '@/server/dal/documents';
import { getMyProfile } from '@/server/dal/me';
import { cn } from '@/lib/cn';
import { HeroRing } from '@/components/shell/PhoneTop';
import { Icon } from '@/components/ui/Icon';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { HeroSubmit, NewRequestForm } from '@/components/features/documents/NewRequestForm';

export const metadata = { title: 'Новая заявка' };

/**
 * Новая заявка. Одно дерево компонентов на телефон и компьютер (одна форма — одна отправка),
 * различается только оформление: оранжевый верх и «простыня» ↔ две карточки.
 */
export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const viewer = await requireStudent();
  const sp = await searchParams;
  const [types, profile] = await Promise.all([listDocumentTypes(viewer), getMyProfile(viewer)]);
  const type = types.find((t) => t.code === sp.type);
  const phrase = typeof sp.q === 'string' ? sp.q.slice(0, 120) : null;

  const shell = (opts: {
    back: string;
    title: string;
    sub?: string;
    hero: React.ReactNode;
    body: React.ReactNode;
  }) => (
    <div className="relative flex flex-1 flex-col lg:block">
      <div className="lg:hidden">
        <HeroRing />
      </div>
      <div className="hidden lg:block">
        <Link href={opts.back} className="text-[14px] font-bold text-ink-2 hover:text-ink-desk">
          ← Документы
        </Link>
        <h1 className="m-0 mt-2 mb-[18px] text-[36px] font-black tracking-[-0.03em]">{opts.title}</h1>
      </div>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-3.5">
        <section className="relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[22px] lg:overflow-hidden lg:rounded-[28px] lg:bg-accent-desk lg:p-[26px] lg:shadow-accent">
          <span
            aria-hidden
            className="absolute top-[-90px] right-[-80px] hidden size-60 animate-breathe rounded-full bg-glass-20 lg:block"
          />
          <div className="flex items-center gap-2.5 lg:hidden">
            <Link
              href={opts.back}
              aria-label="Назад"
              className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-glass-50"
            >
              <Icon name="back" stroke={2.4} />
            </Link>
            <div>
              <b className="text-[15px]">{opts.title}</b>
              {opts.sub && <div className="text-[12px] font-semibold">{opts.sub}</div>}
            </div>
          </div>
          <div className="relative">{opts.hero}</div>
        </section>
        <section className="relative flex flex-1 flex-col rounded-t-[28px] bg-surface px-[18px] pt-[18px] pb-6 shadow-sheet lg:rounded-[24px] lg:px-6 lg:pt-5 lg:shadow-none">
          {opts.body}
        </section>
      </div>
    </div>
  );

  if (!type) {
    return shell({
      back: '/documents',
      title: 'Новая заявка',
      hero: (
        <Stagger delay={0.04}>
          <StaggerItem className="mt-[22px] text-[14px] font-bold">Что заказать?</StaggerItem>
          <StaggerItem className="mt-2 text-[40px] leading-none font-black tracking-[-0.04em]">
            Выберите
            <br />
            справку
          </StaggerItem>
          <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
            Или опишите своими словами — помощник сам подберёт вид и заполнит заявку.
          </StaggerItem>
          <StaggerItem className="mt-4">
            <Link
              href="/assistant?q=нужна справка"
              className="flex h-12 w-full items-center justify-center rounded-[15px] bg-ink text-[15px] font-extrabold text-surface"
            >
              Описать помощнику
            </Link>
          </StaggerItem>
        </Stagger>
      ),
      body: (
        <>
          <h2 className="m-0 text-[18px] font-bold">Все виды · {types.length}</h2>
          <Stagger delay={0.08}>
            {types.map((t, i) => (
              <StaggerItem key={t.code}>
                <Link
                  href={`/documents/new?type=${t.code}`}
                  className={cn('flex min-h-14 items-center gap-3 py-3', i > 0 && 'border-t border-line')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold">{t.title}</div>
                    <div className="mt-0.5 text-[13px] leading-snug text-ink-2">{t.description}</div>
                    <div className="mt-1 text-[12px] font-bold text-ink-2">{t.etaText}</div>
                  </div>
                  <span aria-hidden className="text-[18px] font-bold text-ink-2">
                    ›
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      ),
    });
  }

  const i = type.title.indexOf(' ');
  const idx = types.findIndex((t) => t.code === type.code);
  const related = [types[(idx + 1) % types.length], types[(idx + 2) % types.length]]
    .filter((t): t is (typeof types)[number] => Boolean(t) && t!.code !== type.code)
    .map((t) => ({ code: t.code, title: t.title }));
  const studentLine = `${profile.lastName} ${profile.firstName[0]}. ${profile.middleName ? `${profile.middleName[0]}.` : ''}, ${profile.groupShort}, ${profile.course} курс`;
  const source = phrase ? 'assistant' : 'form';

  return shell({
    back: '/documents',
    title: 'Новая заявка',
    sub: phrase ? 'собрал помощник по вашей фразе' : undefined,
    hero: (
      <Stagger delay={0.04}>
        <StaggerItem className="mt-[22px] text-[14px] font-bold">
          {phrase ? `Вы написали: «${phrase}»` : 'Справка'}
        </StaggerItem>
        <StaggerItem className="mt-2 text-[40px] leading-none font-black tracking-[-0.04em]">
          {i > 0 ? (
            <>
              {type.title.slice(0, i)}
              <br />
              {type.title.slice(i + 1)}
            </>
          ) : (
            type.title
          )}
        </StaggerItem>
        <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
          {type.etaText.charAt(0).toUpperCase() + type.etaText.slice(1)} · бесплатно
        </StaggerItem>
        <StaggerItem className="mt-4">
          <HeroSubmit />
        </StaggerItem>
      </Stagger>
    ),
    body: <NewRequestForm type={type} studentLine={studentLine} related={related} source={source} />,
  });
}
