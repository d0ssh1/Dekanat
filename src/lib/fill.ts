/**
 * Раскладка карточек без пустых мест в последнем ряду. Сетка — 12 колонок.
 * Выбираем число колонок (не больше max), при котором последний ряд заполнен лучше всего,
 * а карточки последнего ряда делят его ширину поровну: 6 → 3+3, 5 → 3+2, 7 → 4+3.
 */
export function fillSpans(n: number, max = 4): number[] {
  if (n <= 0) return [];
  if (n <= max) return Array.from({ length: n }, () => 12 / n);
  let best = max;
  let bestScore = -1;
  for (let cols = max; cols >= 2; cols--) {
    if (12 % cols) continue;
    const rest = n % cols;
    // Полные ряды лучше всего; иначе — чем полнее последний ряд, тем лучше; при равенстве — больше колонок.
    const score = rest === 0 ? 1 : rest / cols;
    if (score > bestScore) {
      best = cols;
      bestScore = score;
    }
  }
  const rest = n % best;
  return Array.from({ length: n }, (_, i) => (rest && i >= n - rest ? 12 / rest : 12 / best));
}

/** Классы Tailwind для span из fillSpans (полные строки — чтобы сборщик их нашёл). */
export const SPAN12: Record<number, string> = {
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  6: 'col-span-6',
  12: 'col-span-12',
};
