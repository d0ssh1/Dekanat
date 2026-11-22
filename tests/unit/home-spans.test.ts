import { describe, expect, it } from 'vitest';
import { spansOf } from '@/components/features/home/HomeGrid';

const of = (sizes: string) => spansOf([...sizes].map((size) => ({ size: size as 'S' | 'M' | 'L' })));

describe('раскладка главной без дыр', () => {
  it('три маленьких блока — по колонке', () => expect(of('SSS')).toEqual([1, 1, 1]));
  it('большой и два маленьких: второй ряд дотягивается', () => expect(of('LSS')).toEqual([3, 1, 2]));
  it('средний не помещается после двух маленьких — ряд дотягивается', () =>
    expect(of('SMS')).toEqual([1, 2, 3]));
  it('один маленький блок занимает всю ширину', () => expect(of('S')).toEqual([3]));
  it('средний и маленький — ровно ряд', () => expect(of('MS')).toEqual([2, 1]));
});

import { fillSpans } from '@/lib/fill';

describe('сетка карточек без дыр', () => {
  it('6 предметов — два ряда по 3', () => expect(fillSpans(6)).toEqual([4, 4, 4, 4, 4, 4]));
  it('5 предметов — 3 + 2', () => expect(fillSpans(5)).toEqual([4, 4, 4, 6, 6]));
  it('7 предметов — 4 + 3', () => expect(fillSpans(7)).toEqual([3, 3, 3, 3, 4, 4, 4]));
  it('8 — два ряда по 4', () => expect(fillSpans(8)).toEqual([3, 3, 3, 3, 3, 3, 3, 3]));
  it('3 — в один ряд', () => expect(fillSpans(3)).toEqual([4, 4, 4]));
});
