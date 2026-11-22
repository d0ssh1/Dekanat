'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, m } from 'motion/react';
import { createContext, useContext, useState, useTransition } from 'react';
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
const SPAN = ['', 'col-span-1', 'col-span-2', 'col-span-3'] as const;

/**
 * Сколько колонок займёт каждый блок. Размер S/M/L — пожелание; если в ряду остаётся пустая колонка,
 * последний блок ряда растягивается на неё — на главной не бывает «дыр».
 */
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
  const spans = spansOf(visible);

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setBlocks((bs) =>
      arrayMove(
        bs,
        bs.findIndex((b) => b.id === e.active.id),
        bs.findIndex((b) => b.id === e.over!.id),
      ),
    );
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
                  Тяните за ⋮⋮ или стрелками · размер S / M / L · глаз — скрыть
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-3.5">
            {visible.map((b, i) => (
              <Sortable key={b.id} block={b} span={spans[i]!} index={i} editing={editing} onPatch={patch}>
                {render[b.id]}
              </Sortable>
            ))}
          </div>
        </SortableContext>
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
  index,
  editing,
  onPatch,
  children,
}: {
  block: Block;
  span: number;
  index: number;
  editing: boolean;
  onPatch: (id: BlockId, p: Partial<Block>) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, disabled: !editing });
  return (
    // Сдвиг — только переносом (Translate): у блоков разной ширины масштаб искажал их при перетаскивании.
    // Motion `layout` здесь не ставим — он перебивал transform от dnd-kit, и блок не ехал за курсором.
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(SPAN[span], 'relative min-w-0')}
    >
      <m.div
        // Блок тянется целиком; кнопки внутри срабатывают, потому что перетаскивание начинается после 6 px.
        {...(editing ? listeners : {})}
        animate={
          isDragging
            ? { rotate: 0, scale: 1.02 }
            : editing
              ? { rotate: [0, -0.25, 0, 0.25, 0], scale: 1 }
              : { rotate: 0, scale: 1 }
        }
        transition={
          editing && !isDragging
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }
            : spring.soft
        }
        className={cn(
          'flex h-full flex-col rounded-[24px]',
          editing && 'cursor-grab bg-surface/60 p-1.5 ring-2 ring-ink-desk/10 active:cursor-grabbing',
          isDragging && 'shadow-[0_24px_50px_rgba(20,20,26,.18)]',
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
              {(['S', 'M', 'L'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={block.size === s}
                  onClick={() => onPatch(block.id, { size: s })}
                  className={cn(
                    'h-8 w-8 rounded-[8px] text-[12px] font-extrabold transition-colors',
                    block.size === s ? 'bg-ink-desk text-surface' : 'text-ink-2 hover:text-ink-desk',
                  )}
                >
                  {s}
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
      </m.div>
    </div>
  );
}
