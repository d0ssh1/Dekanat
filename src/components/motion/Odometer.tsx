'use client';

import { m } from 'motion/react';
import { spring } from './tokens';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Число, цифры которого «перекатываются» при изменении (отсчёт до пары, счётчик уведомлений).
 * Ширину позиции задаёт невидимая текущая цифра — поэтому «1» не раздувается до ширины «0»,
 * а межбуквенный интервал крупного кегля сохраняется. Высота колонки = 1em: работает при любом кегле.
 * Для экранных дикторов — обычный текст.
 */
export function Odometer({ value, className }: { value: number | string; className?: string }) {
  const chars = String(value).split('');
  return (
    <span className={className} style={{ display: 'inline-flex' }}>
      <span className="sr-only">{value}</span>
      <span aria-hidden style={{ display: 'inline-flex' }}>
        {chars.map((ch, i) => {
          const d = DIGITS.indexOf(ch);
          const key = chars.length - i; // ключ от правого края: единицы остаются единицами
          if (d < 0) return <span key={`s${key}`}>{ch}</span>;
          return (
            <m.span
              key={key}
              layout="size"
              transition={spring.snappy}
              style={{
                position: 'relative',
                display: 'inline-block',
                height: '1em',
                lineHeight: '1em',
                overflow: 'hidden',
              }}
            >
              <span style={{ visibility: 'hidden' }}>{ch}</span>
              <m.span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  x: '-50%',
                }}
                initial={false}
                animate={{ y: `${-d}em` }}
                transition={spring.bouncy}
              >
                {DIGITS.map((x) => (
                  <span key={x} style={{ height: '1em' }}>
                    {x}
                  </span>
                ))}
              </m.span>
            </m.span>
          );
        })}
      </span>
    </span>
  );
}
