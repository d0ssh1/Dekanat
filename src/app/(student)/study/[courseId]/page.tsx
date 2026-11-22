import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStudent } from '@/server/auth/guards';
import { nowFor } from '@/server/clock';
import { getCourse } from '@/server/dal/study';
import { getLessons } from '@/server/dal/schedule';
import { admission, admissionAdvice, breakdown, controlLabel, pendingItems } from '@/lib/grades';
import { addDays, dayMonth, dayOf, diffDays, hhmm, plural, shortDate } from '@/lib/time';
import { isActive } from '@/lib/day';
import { cn } from '@/lib/cn';
import { HeroRing, PhoneSheet, PhoneSubTop } from '@/components/shell/PhoneTop';
import { DeskCard } from '@/components/ui/desk';
import { CountUp } from '@/components/motion/CountUp';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { Calculator } from '@/components/features/study/Calculator';
import { Bar } from '@/components/features/study/Bar';

export const metadata = { title: 'Предмет' };

/** Предмет (макет B2Core2 «Предмет»): откуда баллы, что сделать, сколько нужно на экзамене. */
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ now?: string }>;
}) {
  const viewer = await requireStudent();
  const { courseId } = await params;
  const now = await nowFor(viewer, (await searchParams).now);
  const c = await getCourse(viewer, courseId);
  // Чужой или несуществующий предмет — 404, без подсказки, существует ли он.
  if (!c) notFound();

  const today = dayOf(now);
  const a = admission(c);
  const lines = breakdown(c);
  const pending = pendingItems(c, now.getTime());
  const advice = admissionAdvice(c, now.getTime());
  const upcoming = (await getLessons(viewer, today, addDays(today, 21)))
    .filter((l) => l.courseId === c.id && isActive(l) && Date.parse(l.endsAt) > now.getTime())
    .slice(0, 4);
  const titleLine = `${c.subject} · ${controlLabel(c.control)}`;
  const finalLine = c.finalOn
    ? `${controlLabel(c.control)} ${dayMonth(dayOf(c.finalOn))}`
    : controlLabel(c.control);

  const breakdownList = (
    <>
      <h2 className="m-0 text-[18px] font-bold">
        Из чего баллы · {c.points} из {c.semMax}
      </h2>
      {lines.map((l, i) => {
        const soon = l.points === null && l.dueAt && diffDays(today, dayOf(l.dueAt)) <= 14;
        return (
          <div
            key={l.key}
            className={cn(
              'flex min-h-11 items-center gap-3 py-2.5 text-[15px]',
              i > 0 && 'border-t border-line',
            )}
          >
            <span className="min-w-0 flex-1">
              {l.title}
              {l.points === null && l.dueAt && (
                <span className={cn('block text-[12px] font-semibold', soon ? 'text-danger' : 'text-ink-2')}>
                  срок {dayMonth(dayOf(l.dueAt))}
                </span>
              )}
            </span>
            <span
              className={cn(
                'text-[20px] font-extrabold whitespace-nowrap tabular',
                soon && !a.ok && 'text-danger',
              )}
            >
              {l.points ?? 0} / {l.max}
            </span>
          </div>
        );
      })}
    </>
  );
  const calc = (
    <div id="calc" className="scroll-mt-24">
      <Calculator
        points={c.points}
        pending={pending.map((p) => ({ id: p.id, title: p.title, max: p.max }))}
        examMax={c.examMax}
        threshold={a.need}
        control={c.control}
      />
    </div>
  );
  const lessonsList = upcoming.length > 0 && (
    <section>
      <h2 className="m-0 text-[18px] font-bold">Ближайшие занятия</h2>
      {upcoming.map((l, i) => (
        <div
          key={l.id}
          className={cn('flex items-center gap-3 py-2.5 text-[14px]', i > 0 && 'border-t border-line')}
        >
          <span className="flex-1">
            <b className="tabular">
              {shortDate(dayOf(l.startsAt))} · {hhmm(l.startsAt)}
            </b>
            <span className="block text-[12px] font-semibold text-ink-2">{l.kindLabel}</span>
          </span>
          <span className="text-[12px] font-bold text-ink-2">{l.online ? 'онлайн' : l.room}</span>
        </div>
      ))}
    </section>
  );

  return (
    <>
      {/* ---------- Телефон ---------- */}
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <PhoneSubTop title={titleLine} backHref="/study">
          <Stagger delay={0.04}>
            {a.ok ? (
              <>
                <StaggerItem className="mt-5 text-[15px] font-bold">Набрано за семестр</StaggerItem>
                <StaggerItem className="mt-1 text-[104px] leading-[.88] font-black tracking-[-0.06em]">
                  <CountUp value={c.points} />
                  <span className="ml-2 text-[36px] tracking-[-0.02em]">из {c.semMax}</span>
                </StaggerItem>
                <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
                  {c.control === 'exam' ? 'Допуск есть' : 'Идёт к зачёту'} · {finalLine} · {c.teacher}
                </StaggerItem>
              </>
            ) : (
              <>
                <StaggerItem className="mt-5 text-[15px] font-bold">До допуска</StaggerItem>
                <StaggerItem className="mt-1 text-[104px] leading-[.88] font-black tracking-[-0.06em]">
                  <CountUp value={a.left} />
                  <span className="ml-2 text-[36px] tracking-[-0.02em]">
                    {plural(a.left, 'балл', 'балла', 'баллов')}
                  </span>
                </StaggerItem>
                <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">
                  {advice}
                </StaggerItem>
              </>
            )}
            <StaggerItem className="mt-4">
              <Link
                href="#calc"
                className="flex h-12 w-full items-center justify-center rounded-[15px] bg-ink text-[15px] font-extrabold text-surface"
              >
                Сколько нужно на {c.control === 'exam' ? 'экзамене' : 'итоговой'}
              </Link>
            </StaggerItem>
          </Stagger>
        </PhoneSubTop>
        <PhoneSheet>
          {breakdownList}
          <div className="mt-4">{calc}</div>
          <div className="mt-5">{lessonsList}</div>
        </PhoneSheet>
      </div>

      {/* ---------- Компьютер ---------- */}
      <div className="hidden lg:block">
        <Link href="/study" className="text-[14px] font-bold text-ink-2 hover:text-ink-desk">
          ← Учёба
        </Link>
        <h1 className="m-0 mt-2 mb-[18px] text-[36px] font-black tracking-[-0.03em]">{c.subject}</h1>
        <Stagger className="grid grid-cols-[1.1fr_1fr] gap-3.5">
          <StaggerItem>
            <DeskCard tone={a.ok ? 'white' : 'accent'} className="h-full p-[26px]">
              {!a.ok && (
                <span
                  aria-hidden
                  className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
                />
              )}
              <div className="relative text-[14px] font-bold">
                {a.ok ? 'Набрано за семестр' : 'До допуска'} · {finalLine} · {c.teacher}
              </div>
              <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em]">
                <CountUp value={a.ok ? c.points : a.left} />
                <span className="ml-3 text-[32px] tracking-[-0.02em]">
                  {a.ok ? `из ${c.semMax}` : plural(a.left, 'балл', 'балла', 'баллов')}
                </span>
              </div>
              <Bar
                value={c.points}
                max={c.semMax}
                danger={!a.ok}
                accent
                mark={c.control === 'exam' ? a.need : undefined}
                className="relative mt-4"
              />
              <p className="relative m-0 mt-4 text-[15px] leading-[1.45] font-semibold">
                {advice ??
                  `Допуск ${c.control === 'exam' ? `от ${a.need} — есть` : 'к зачёту набирается'}. Ниже — сколько нужно на ${c.control === 'exam' ? 'экзамене' : 'итоговой'} для каждой оценки.`}
              </p>
            </DeskCard>
          </StaggerItem>
          <StaggerItem>
            <section className="flex h-full flex-col rounded-[24px] bg-surface px-6 py-4">
              {breakdownList}
              {/* Шкала итоговой оценки — внизу карточки: колонка не пустеет, если пунктов мало. */}
              <div className="mt-auto pt-4">
                <div className="text-[13px] font-bold text-ink-2">
                  Итог = семестр + {c.control === 'exam' ? 'экзамен' : 'итоговая'}, из 100
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(c.control === 'credit'
                    ? [
                        ['0–60', 'не зачтено'],
                        ['61–100', 'зачтено'],
                      ]
                    : [
                        ['61–75', 'удовл.'],
                        ['76–85', 'хорошо'],
                        ['86–100', 'отлично'],
                      ]
                  ).map(([r, w]) => (
                    <span key={r} className="rounded-[11px] bg-desk-chip px-2.5 py-1.5 text-[13px]">
                      <b className="tabular">{r}</b> · {w}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full [&>div]:h-full [&_.calc-box]:h-full [&_.calc-box]:rounded-[24px] [&_.calc-box]:bg-surface [&_.calc-box]:p-6">
              {calc}
            </section>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full rounded-[24px] bg-surface px-6 py-4">
              {lessonsList || <p className="m-0 text-ink-2">Занятий в ближайшие три недели нет.</p>}
            </section>
          </StaggerItem>
        </Stagger>
      </div>
    </>
  );
}
