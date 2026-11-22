'use client';

import {
  DndContext,
  DragOverlay,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { AnimatePresence, m } from 'motion/react';
import { Fragment, createContext, useContext, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/motion/Toast';
import { spring } from '@/components/motion/tokens';
import { saveLayoutAction } from '@/app/(student)/home-actions';

export type BlockId = 'docs' | 'study' | 'tomorrow';
export type Block = { id: BlockId; size: 'S' | 'M' | 'L'; hidden: boolean };

const TITLES: Record<BlockId, string> = { docs: 'Документы', study: 'Учёба', tomorrow: 'Завтра' };
const DEFAULT: Block[] = [
  { id: 'docs', size: 'S', hidden: false },
  { id: 'study', size: 'S', hidden: false },
  { id: 'tomorrow', size: 'S', hidden: false },
];
const PRESETS: { key: string; label: string; blocks: Block[] }[] = [
  { key: 'base', label: 'Обычная', blocks: DEFAULT },
  {
    key: 'docs',
    label: 'Документы в фокусе',
    blocks: [
      { id: 'docs', size: 'L', hidden: false },
      { id: 'tomorrow', size: 'M', hidden: false },
      { id: 'study', size: 'S', hidden: false },
    ],
  },
  {
    key: 'study',
    label: 'Учёба в фокусе',
    blocks: [
      { id: 'study', size: 'L', hidden: false },
      { id: 'docs', size: 'M', hidden: false },
      { id: 'tomorrow', size: 'S', hidden: false },
    ],
  },
  { key: 'min', label: 'Минимум — только расписание', blocks: DEFAULT.map((b) => ({ ...b, hidden: true })) },
];
const WIDTH = { S: 1, M: 2, L: 3 } as const;
/** Соседи не сдвигаются во время перетаскивания: блоки разной ширины от этого «прыгали». */
const STILL = () => null;
const SPAN = ['', 'col-span-1', 'col-span-2', 'col-span-3'] as const;

/**
 * Сколько колонок займёт каждый блок. Размер S/M/L — пожелание; если в ряду остаётся пустая колонка,
 * последний блок ряда растягивается на неё — на главной не бывает «дыр».
 */
/** Где в раскладке остаются пустые колонки: { после какого блока, сколько колонок }. */
export function gapsOf(blocks: Pick<Block, 'size'>[]) {
  const gaps: { after: number; cols: number }[] = [];
  let left = 3;
  blocks.forEach((b, i) => {
    const w = WIDTH[b.size];
    if (w > left && i > 0) {
      gaps.push({ after: i - 1, cols: left });
      left = 3;
    }
    left -= w;
    if (left === 0) left = 3;
  });
  if (left < 3 && blocks.length) gaps.push({ after: blocks.length - 1, cols: left });
  return gaps;
}

export function spansOf(blocks: Pick<Block, 'size'>[]) {
  const out: number[] = [];
  let left = 3;
  let rowLast = -1;
  blocks.forEach((b, i) => {
    const w = WIDTH[b.size];
    if (w > left && rowLast >= 0) {
      out[rowLast]! += left;
      left = 3;
    }
    out[i] = w;
    left -= w;
    rowLast = i;
    if (left === 0) left = 3;
  });
  if (left < 3 && rowLast >= 0) out[rowLast]! += left;
  return out;
}

/** Контекст режима настройки: «···» в шапке блока включает его. */
export const EditCtx = createContext<{ editing: boolean; start: () => void }>({
  editing: false,
  start: () => {},
});
export const useHomeEdit = () => useContext(EditCtx);

/**
 * Сетка блоков главной (макет B2CustomV4): S — 1 колонка, M — 2, L — во всю ширину;
 * неполный ряд дотягивается последним блоком (spansOf).
 * В режиме настройки блоки едва заметно покачиваются, тянутся целиком (мышью, пальцем) или за ⋮⋮
 * стрелками с клавиатуры, меняют размер и прячутся. Раскладка сохраняется в профиле.
 */
export function HomeGrid({
  initial,
  render,
}: {
  initial: Block[];
  render: Record<BlockId, React.ReactNode>;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [saved, setSaved] = useState<Block[]>(initial);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const visible = blocks.filter((b) => !b.hidden);
  const hidden = blocks.filter((b) => b.hidden);
  // В настройке ширина ровно такая, как выбрана, а пустые места видны плашкой «свободно».
  // В обычном режиме соседи растягиваются и закрывают пустоты.
  const spans = editing ? visible.map((b) => WIDTH[b.size]) : spansOf(visible);
  const gaps = editing ? gapsOf(visible) : [];
  const [dragId, setDragId] = useState<BlockId | null>(null);
  const [overId, setOverId] = useState<BlockId | null>(null);

  const onDragStart = (e: DragStartEvent) => setDragId(e.active.id as BlockId);
  const onDragOver = (e: DragOverEvent) => setOverId((e.over?.id as BlockId) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    setOverId(null);
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(
      blocks,
      blocks.findIndex((b) => b.id === e.active.id),
      blocks.findIndex((b) => b.id === e.over!.id),
    );
    setBlocks(next);
    // Вне режима настройки — сохраняем сразу, с возможностью отменить.
    if (!editing) {
      const before = blocks;
      void saveLayoutAction(next).then((r) => {
        if (!r.ok) return;
        setSaved(next);
        toast.show({
          title: 'Блок переставлен',
          tone: 'ok',
          action: {
            label: 'Отменить',
            onClick: () => {
              setBlocks(before);
              setSaved(before);
              void saveLayoutAction(before);
            },
          },
        });
      });
    }
  };
  const patch = (id: BlockId, p: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const done = () =>
    start(async () => {
      const r = await saveLayoutAction(blocks);
      if (r.ok) {
        setSaved(blocks);
        setEditing(false);
        toast.show({
          title: 'Раскладка сохранена',
          tone: 'ok',
          action: {
            label: 'Отменить',
            onClick: () => {
              setBlocks(saved);
              void saveLayoutAction(saved);
            },
          },
        });
      }
    });

  return (
    <EditCtx.Provider value={{ editing, start: () => setEditing(true) }}>
      <AnimatePresence>
        {editing && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="overflow-hidden"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[20px] bg-surface px-5 py-3">
              <div className="min-w-[240px] flex-1">
                <b className="text-[16px]">Настройка главной</b>
                <div className="text-[13px] text-ink-2">
                  Тяните блок мышью или за ⋮⋮ стрелками · размер S / M / L · глаз — скрыть
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setBlocks(p.blocks)}
                    className="h-9 rounded-[10px] bg-desk-chip px-3 text-[13px] font-bold"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="md" onClick={() => setBlocks(DEFAULT)}>
                Сбросить
              </Button>
              <Button size="md" disabled={pending} onClick={done}>
                Готово
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDragId(null);
          setOverId(null);
        }}
      >
        <SortableContext items={visible.map((b) => b.id)} strategy={STILL}>
          <div className="grid grid-cols-3 gap-3.5">
            {visible.map((b, i) => (
              <Fragment key={b.id}>
                <Sortable
                  block={b}
                  span={spans[i]!}
                  editing={editing}
                  dragging={dragId === b.id}
                  target={dragId !== null && overId === b.id && dragId !== b.id}
                  onPatch={patch}
                >
                  {render[b.id]}
                </Sortable>
                {gaps
                  .filter((g) => g.after === i)
                  .map((g) => (
                    <div
                      key={`gap-${i}`}
                      className={cn(
                        SPAN[g.cols],
                        'flex min-h-24 items-center justify-center rounded-[24px] border-2 border-dashed border-desk-board text-[13px] font-semibold text-ink-3',
                      )}
                    >
                      Свободно · после «Готово» соседний блок растянется
                    </div>
                  ))}
              </Fragment>
            ))}
          </div>
        </SortableContext>
        {/* «Призрак» блока едет за курсором; сам блок остаётся на месте полупрозрачным. */}
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {dragId && (
            <div className="rotate-[0.6deg] rounded-[24px] shadow-[0_24px_50px_rgba(20,20,26,.22)]">
              {render[dragId]}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {editing && hidden.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex flex-wrap items-center gap-2 text-[14px]"
          >
            <b>Скрыто:</b>
            {hidden.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => patch(b.id, { hidden: false })}
                className="h-9 rounded-[10px] bg-surface px-3 text-[13px] font-bold"
              >
                {TITLES[b.id]} · показать
              </button>
            ))}
            <span className="text-[13px] text-ink-2">
              Важное из скрытых блоков всё равно придёт в колокольчик.
            </span>
          </m.div>
        )}
      </AnimatePresence>
    </EditCtx.Provider>
  );
}

function Sortable({
  block,
  span,
  editing,
  dragging,
  target,
  onPatch,
  children,
}: {
  block: Block;
  span: number;
  editing: boolean;
  dragging: boolean;
  target: boolean;
  onPatch: (id: BlockId, p: Partial<Block>) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useSortable({ id: block.id });
  // Вне режима настройки тянуть можно только за ⋮⋮ в шапке блока (data-grip), чтобы не мешать ссылкам.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!editing && !(e.target as Element).closest('[data-grip]')) return;
    (listeners?.onPointerDown as ((ev: React.PointerEvent) => void) | undefined)?.(e);
  };
  return (
    // Перестановку плавно доигрывает Motion (layout); transform от dnd-kit на блоке не используется —
    // за курсором едет «призрак» из DragOverlay, поэтому две библиотеки больше не спорят.
    <m.div
      ref={setNodeRef}
      layout
      transition={spring.soft}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => (listeners?.onKeyDown as ((ev: React.KeyboardEvent) => void) | undefined)?.(e)}
      className={cn(SPAN[span], 'relative min-w-0')}
    >
      <div
        className={cn(
          'flex h-full flex-col rounded-[24px] transition-[opacity,box-shadow] duration-200',
          editing && 'cursor-grab p-1.5 ring-2 ring-ink-desk/15 ring-dashed active:cursor-grabbing',
          dragging && 'opacity-35',
          target && 'ring-[3px] ring-accent-desk',
        )}
      >
        {editing && (
          <div className="mb-1.5 flex items-center gap-1.5 rounded-[18px] bg-surface p-1">
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label={`Перетащить блок «${TITLES[block.id]}»`}
              className="flex size-9 touch-none items-center justify-center rounded-[10px] text-ink-3"
              {...attributes}
            >
              <Icon name="grip" size={18} />
            </button>
            <span className="flex-1" />
            <div
              className="flex rounded-[10px] bg-desk-chip p-0.5"
              role="radiogroup"
              aria-label={`Размер блока «${TITLES[block.id]}»`}
            >
              {(['S', 'M', 'L'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  role="radio"
                  aria-checked={block.size === sz}
                  aria-label={`Размер ${sz}`}
                  onClick={() => onPatch(block.id, { size: sz })}
                  className={cn(
                    'h-8 w-8 rounded-[8px] text-[12px] font-extrabold transition-colors',
                    block.size === sz ? 'bg-ink-desk text-surface' : 'text-ink-2 hover:text-ink-desk',
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label={`Скрыть блок «${TITLES[block.id]}»`}
              onClick={() => onPatch(block.id, { hidden: true })}
              className="flex size-9 items-center justify-center rounded-[10px] bg-desk-chip"
            >
              <Icon name="eye" size={18} />
            </button>
          </div>
        )}
        {/* В режиме настройки ссылки внутри блока не перехватывают клик и перетаскивание. */}
        <div className={cn('flex flex-1 flex-col', editing && 'pointer-events-none select-none')}>
          {children}
        </div>
      </div>
    </m.div>
  );
}
