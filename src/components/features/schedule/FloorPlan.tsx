'use client';

import { m } from 'motion/react';
import { placeOf } from '@/lib/day';
import { spring } from '@/components/motion/tokens';

/**
 * Схема этажа: условный коридор корпуса с подсвеченной аудиторией.
 * Номер в формате кампуса (D734 → корпус D, 7 этаж, аудитория 34) — сразу понятно, куда идти.
 */
export function FloorPlan({ room }: { room: string }) {
  const p = placeOf(room);
  const num = p?.floor ? Number(room.slice(2)) : 0;
  const left = num % 2 === 1; // нечётные — по левой стороне
  const cells = Array.from({ length: 8 }, (_, i) => i);
  const idx = Math.min(7, Math.floor((num % 40) / 5));
  return (
    <div>
      <div className="flex flex-wrap gap-2 text-[13px] font-bold">
        {p?.building && (
          <span className="rounded-[10px] bg-surface-2 px-2.5 py-1.5">Корпус {p.building}</span>
        )}
        {p?.floor && <span className="rounded-[10px] bg-surface-2 px-2.5 py-1.5">{p.floor} этаж</span>}
        <span className="rounded-[10px] bg-hero-wash px-2.5 py-1.5">Аудитория {room}</span>
      </div>
      <svg
        viewBox="0 0 340 150"
        className="mt-4 w-full"
        role="img"
        aria-label={`Схема этажа: аудитория ${room}`}
      >
        <rect x="0" y="0" width="340" height="150" rx="18" fill="var(--surface-2)" />
        <rect x="12" y="62" width="316" height="26" rx="8" fill="var(--surface)" />
        {cells.map((i) => (
          <g key={i}>
            <rect x={14 + i * 39.5} y="12" width="35" height="44" rx="7" fill="var(--surface)" />
            <rect x={14 + i * 39.5} y="94" width="35" height="44" rx="7" fill="var(--surface)" />
          </g>
        ))}
        <m.rect
          x={14 + idx * 39.5}
          y={left ? 12 : 94}
          width="35"
          height="44"
          rx="7"
          fill="var(--hero)"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring.bouncy, delay: 0.2 }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        />
        <text
          x={14 + idx * 39.5 + 17.5}
          y={left ? 39 : 121}
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          fill="var(--ink)"
        >
          {room.slice(-3)}
        </text>
        <m.path
          d={`M 6 75 H ${14 + idx * 39.5 + 17.5} V ${left ? 58 : 92}`}
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeDasharray="5 5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}
        />
        <text x="10" y="106" fontSize="10" fontWeight="700" fill="var(--ink-2)">
          лифт
        </text>
      </svg>
      <p className="m-0 mt-3 text-[13px] leading-snug font-medium text-ink-2">
        Схема условная: от лифта — по коридору, аудитория отмечена оранжевым. Работает и без сети.
      </p>
    </div>
  );
}
