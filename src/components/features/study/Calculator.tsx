'use client';

import { AnimatePresence, m } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { SCALE, gradeFor, needOnExam } from '@/lib/grades';
import { Odometer } from '@/components/motion/Odometer';
import { spring } from '@/components/motion/tokens';

type Pending = { id: string; title: string; max: number };

/**
 * Калькулятор: «если сдам оставшиеся работы на столько — сколько нужно на экзамене».
 * Ползунки по каждой несданной работе и по экзамену, итог и оценка пересчитываются сразу.
 */
export function Calculator({
  points,
  pending,
  examMax,
  threshold,
  control,
}: {
  points: number;
  pending: Pending[];
  examMax: number;
  threshold: number;
  control: 'exam' | 'credit' | 'diff_credit';
}) {
  const [plan, setPlan] = useState<Record<string, number>>(() =>
    Object.fromEntries(pending.map((p) => [p.id, p.max])),
  );
  const sem = points + Object.values(plan).reduce((a, b) => a + b, 0);
  const firstNeed = SCALE.map((s) => needOnExam(sem, examMax, s.from)).find((x) => x !== null) ?? 0;
  const [exam, setExam] = useState(Math.min(examMax, firstNeed ?? 0));
  const total = sem + (examMax ? exam : 0);
  const g = gradeFor(total);
  const admitted = control === 'exam' ? sem >= threshold : true;

  const targets = useMemo(
    () => SCALE.map((s) => ({ ...s, need: needOnExam(sem, examMax, s.from) })),
    [sem, examMax],
  );

  return (
    <div className="rounded-[18px] bg-surface-2 p-4">
      <div className="text-[13px] font-bold text-ink-2">Калькулятор</div>
      {pending.map((p) => (
        <Slider
          key={p.id}
          label={p.title}
          value={plan[p.id] ?? 0}
          max={p.max}
          onChange={(v) => setPlan((x) => ({ ...x, [p.id]: v }))}
        />
      ))}
      {examMax > 0 && (
        <Slider
          label={control === 'exam' ? 'Экзамен' : 'Итоговая работа'}
          value={exam}
          max={examMax}
          onChange={setExam}
        />
      )}

      <div className="mt-4 flex items-end gap-3">
        <div className="text-[48px] leading-none font-black tracking-[-0.04em] tabular">
          <Odometer value={total} />
        </div>
        <div className="pb-1 text-[13px] font-bold text-ink-2">из 100</div>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={g.label + admitted}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring.bouncy}
            className={cn(
              'ml-auto rounded-[12px] px-3 py-1.5 text-[14px] font-extrabold',
              !admitted
                ? 'bg-danger-wash text-danger'
                : g.value >= 4
                  ? 'bg-ok-wash text-ok'
                  : g.value === 3
                    ? 'bg-hero-wash text-ink'
                    : 'bg-danger-wash text-danger',
            )}
          >
            {admitted ? g.label : 'нет допуска'}
          </m.span>
        </AnimatePresence>
      </div>
      <p className="m-0 mt-3 text-[14px] leading-[1.45]">
        <b>
          За семестр — {sem} {sem === points ? '' : `(сейчас ${points})`}.
        </b>{' '}
        {control === 'exam' && !admitted
          ? `Для допуска нужно ${threshold} — не хватает ${threshold - sem}.`
          : targets
              .filter((t) => t.need !== null)
              .slice(0, 2)
              .map((t) =>
                t.need === 0
                  ? `«${t.label}» уже набрано.`
                  : `Для «${t.label}» (${t.from}) на экзамене нужно ${t.need} из ${examMax}.`,
              )
              .join(' ') || 'Высшая оценка уже недостижима — но «удовлетворительно» ещё можно.'}
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="flex items-baseline justify-between text-[14px]">
        <span>{label}</span>
        <b className="tabular">
          {value} / {max}
        </b>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calc-range mt-2 h-11 w-full cursor-pointer appearance-none bg-transparent"
        style={{ ['--pct' as string]: `${pct}%` }}
      />
    </div>
  );
}
