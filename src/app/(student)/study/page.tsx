import Link from 'next/link';
import { requireStudent } from '@/server/auth/guards';
import { resolveNow } from '@/server/clock';
import { getMyProfile } from '@/server/dal/me';
import { getCurrentCourses, getFinalGrades, type CourseSummary } from '@/server/dal/study';
import { admission, controlLabel, daysToSession, gpa } from '@/lib/grades';
import { dayMonth, dayOf, daysWord, plural } from '@/lib/time';
import { SEMESTER } from '@/lib/university';
import { cn } from '@/lib/cn';
import { HeroRing, PhoneSheet } from '@/components/shell/PhoneTop';
import { ButtonLink } from '@/components/ui/Button';
import { DeskCard } from '@/components/ui/desk';
import { CountUp } from '@/components/motion/CountUp';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { Bar } from '@/components/features/study/Bar';
import { GradeBook } from '@/components/features/study/GradeBook';

export const metadata = { title: 'Учёба' };

/** Учёба (макет B2Core2 «Учёба»): «как у меня дела» одним числом и одной фразой, ниже — предметы. */
export default async function StudyPage({ searchParams }: { searchParams: Promise<{ now?: string }> }) {
  const viewer = await requireStudent();
  const now = resolveNow((await searchParams).now);
  const today = dayOf(now);
  const [profile, courses, finals] = await Promise.all([
    getMyProfile(viewer),
    getCurrentCourses(viewer),
    getFinalGrades(viewer),
  ]);

  const semester = (profile.course - 1) * 2 + 1;
  const avg = gpa(finals);
  const examCourses = courses.filter((c) => c.control === 'exam');
  const withAdmission = examCourses.filter((c) => admission(c).ok).length;
  const problem = courses
    .filter((c) => c.control === 'exam' && !admission(c).ok)
    .sort((a, b) => admission(a).left - admission(b).left)[0];
  const days = daysToSession(today, SEMESTER.sessionFrom);
  const sorted = [...courses].sort(
    (a, b) => Number(admission(a).ok) - Number(admission(b).ok) || b.points / b.semMax - a.points / a.semMax,
  );
  const summary = [
    `Допуск к экзаменам ${withAdmission} из ${examCourses.length}`,
    problem &&
      `по ${problem.short} не хватает ${admission(problem).left} ${plural(admission(problem).left, 'балла', 'баллов', 'баллов')}`,
    days > 0 ? `сессия через ${days} ${daysWord(days)}` : 'идёт сессия',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      {/* ---------- Телефон ---------- */}
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <div className="relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[22px]">
          <div className="flex h-11 items-center">
            <h1 className="m-0 flex-1 text-[17px] font-bold">Учёба</h1>
            <span className="text-[13px] font-bold">{semester} семестр</span>
          </div>
          <Stagger delay={0.04}>
            <StaggerItem className="mt-5 text-[14px] font-bold">Средний балл</StaggerItem>
            <StaggerItem className="mt-1 text-[96px] leading-[.88] font-black tracking-[-0.06em]">
              {avg !== null ? <CountUp value={avg} decimals={2} /> : '—'}
            </StaggerItem>
            <StaggerItem className="mt-2.5 text-[14px] leading-[1.45] font-semibold">{summary}</StaggerItem>
            {problem && (
              <StaggerItem className="mt-4">
                <ButtonLink href={`/study/${problem.id}`} block>
                  Что сделать для допуска по {problem.short}
                </ButtonLink>
              </StaggerItem>
            )}
          </Stagger>
        </div>
        <PhoneSheet>
          <h2 className="m-0 text-[18px] font-bold">Предметы</h2>
          <Stagger delay={0.1}>
            {sorted.map((c, i) => (
              <StaggerItem key={c.id}>
                <SubjectRow c={c} first={i === 0} />
              </StaggerItem>
            ))}
          </Stagger>
          <GradeBook finals={finals} className="mt-6" />
        </PhoneSheet>
      </div>

      {/* ---------- Компьютер ---------- */}
      <div className="hidden lg:block">
        <h1 className="m-0 mb-[18px] text-[36px] font-black tracking-[-0.03em]">
          Учёба — {semester} семестр
        </h1>
        <Stagger className="grid grid-cols-[1.3fr_1fr] gap-3.5">
          <StaggerItem>
            <DeskCard tone="accent" className="h-full min-h-[300px] p-[26px]">
              <span
                aria-hidden
                className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
              />
              <div className="relative text-[14px] font-bold">
                Средний балл за {new Set(finals.map((f) => f.semester)).size} сессии
              </div>
              <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em]">
                {avg !== null ? <CountUp value={avg} decimals={2} /> : '—'}
              </div>
              <div className="relative mt-auto text-[15px] leading-[1.45] font-semibold">{summary}</div>
              {problem && (
                <div className="relative mt-4">
                  <ButtonLink href={`/study/${problem.id}`} size="md" className="h-[46px] px-5">
                    Что сделать для допуска по {problem.short}
                  </ButtonLink>
                </div>
              )}
            </DeskCard>
          </StaggerItem>
          <StaggerItem>
            <section className="h-full rounded-[24px] bg-surface px-5 py-4">
              <h2 className="m-0 text-[16px] font-bold">
                Зачёты и экзамены · сессия с {dayMonth(SEMESTER.sessionFrom)}
              </h2>
              {[...examCourses, ...courses.filter((c) => c.control !== 'exam')]
                .filter((c) => c.finalOn)
                .sort((a, b) => a.finalOn!.localeCompare(b.finalOn!))
                .map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/study/${c.id}`}
                    className={cn(
                      'flex items-center gap-3 py-[11px] text-[15px]',
                      i > 0 && 'border-t border-desk-line',
                    )}
                  >
                    <b className="w-[74px] text-[13px] tabular">{dayMonth(dayOf(c.finalOn!))}</b>
                    <span className="min-w-0 flex-1 truncate">{c.subject}</span>
                    <span className="text-[13px] font-bold text-ink-2">{controlLabel(c.control)}</span>
                  </Link>
                ))}
            </section>
          </StaggerItem>
        </Stagger>
        <h2 className="m-0 mt-7 mb-3 text-[22px] font-black tracking-[-0.02em]">Предметы семестра</h2>
        <Stagger className="grid grid-cols-3 gap-3.5" delay={0.15}>
          {sorted.map((c) => {
            const a = admission(c);
            return (
              <StaggerItem key={c.id}>
                <Link
                  href={`/study/${c.id}`}
                  className="block h-full transition-transform hover:-translate-y-0.5"
                >
                  <DeskCard tone="white" className="h-full gap-1">
                    <span className={cn('text-[13px] font-bold', a.ok ? 'text-ink-2' : 'text-danger')}>
                      {controlLabel(c.control)}
                      {c.finalOn && ` · ${dayMonth(dayOf(c.finalOn))}`}
                    </span>
                    <b className="text-[19px] leading-tight font-extrabold tracking-[-0.02em]">{c.subject}</b>
                    <span className="text-[13px] text-ink-2">{c.teacher}</span>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'text-[40px] leading-none font-black tracking-[-0.03em]',
                          !a.ok && 'text-danger',
                        )}
                      >
                        <CountUp value={c.points} />
                      </span>
                      <span className="text-[14px] font-bold text-ink-2">из {c.semMax}</span>
                    </div>
                    <Bar
                      value={c.points}
                      max={c.semMax}
                      danger={!a.ok}
                      mark={c.control === 'exam' ? a.need : undefined}
                      className="mt-2"
                    />
                    <span className={cn('mt-2 text-[13px] font-bold', a.ok ? 'text-ok' : 'text-danger')}>
                      {a.ok
                        ? c.control === 'exam'
                          ? 'допуск есть'
                          : c.points >= 61
                            ? 'зачёт набран'
                            : `к зачёту ${c.points} из 61`
                        : `до допуска ${a.left} ${plural(a.left, 'балл', 'балла', 'баллов')}`}
                    </span>
                  </DeskCard>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
        <section className="mt-7 rounded-[24px] bg-surface px-6 py-5">
          <GradeBook finals={finals} variant="desk" />
        </section>
      </div>
    </>
  );
}

function SubjectRow({ c, first }: { c: CourseSummary; first: boolean }) {
  const a = admission(c);
  return (
    <Link
      href={`/study/${c.id}`}
      className={cn('flex min-h-11 items-center gap-3 py-2.5 text-[15px]', !first && 'border-t border-line')}
    >
      <div className="min-w-0 flex-1">
        <div className={cn(!a.ok && 'font-bold')}>{c.subject}</div>
        <div className={cn('mt-0.5 text-[12px] font-semibold', a.ok ? 'text-ink-2' : 'text-danger')}>
          {controlLabel(c.control)}
          {a.ok
            ? `${c.finalOn ? ` · ${dayMonth(dayOf(c.finalOn))}` : ''}${c.control !== 'exam' ? (c.points >= 61 ? ' · зачёт набран' : ` · ${c.points} из 61 к зачёту`) : ''}`
            : ` · нет допуска: ${c.points} из ${a.need}`}
        </div>
        <Bar value={c.points} max={c.semMax} danger={!a.ok} className="mt-1.5" />
      </div>
      <span className={cn('text-[20px] font-extrabold whitespace-nowrap tabular', !a.ok && 'text-danger')}>
        {!a.ok && '! '}
        <CountUp value={c.points} />
      </span>
    </Link>
  );
}
