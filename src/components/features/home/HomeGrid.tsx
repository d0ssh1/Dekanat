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
const SPAN = { S: 'col-span-1', M: 'col-span-2', L: 'col-span-3' } as const;

/** Контекст режима настройки: «···» в шапке блока включает его. */
export const EditCtx = createContext<{ editing: boolean; start: () => void }>({
  editing: false,
  start: () => {},
});
export const useHomeEdit = () => useContext(EditCtx);

/**
 * Сетка блоков главной (макет B2CustomV4): S — 1 колонка, M — 2, L — во всю ширину.
 * В режиме настройки блоки покачиваются, тянутся за ⋮⋮ (мышью, пальцем или стрелками с клавиатуры),
 * меняют размер и прячутся. Раскладка сохраняется в профиле.
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
              <Sortable key={b.id} block={b} index={i} editing={editing} onPatch={patch}>
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
  index,
  editing,
  onPatch,
  children,
}: {
  block: Block;
  index: number;
  editing: boolean;
  onPatch: (id: BlockId, p: Partial<Block>) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, disabled: !editing });
  return (
    <m.div
      ref={setNodeRef}
      layout
      transition={spring.soft}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(SPAN[block.size], 'relative min-w-0')}
    >
      <m.div
        animate={editing && !isDragging ? { rotate: [0, -0.6, 0.6, 0] } : { rotate: 0 }}
        transition={editing ? { duration: 0.5, repeat: Infinity, delay: index * 0.07 } : spring.soft}
        className={cn(
          'h-full rounded-[24px]',
          editing && 'ring-2 ring-ink-desk/15',
          isDragging && 'shadow-[0_24px_50px_rgba(20,20,26,.2)]',
        )}
      >
        {children}
      </m.div>
      {editing && (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 rounded-[14px] bg-surface/95 p-1 shadow-[0_6px_18px_rgba(20,20,26,.12)] backdrop-blur">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Перетащить блок «${TITLES[block.id]}»`}
            className="flex size-9 cursor-grab touch-none items-center justify-center rounded-[10px] text-ink-3 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <Icon name="grip" size={18} />
          </button>
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
                  'h-8 w-8 rounded-[8px] text-[12px] font-extrabold',
                  block.size === s ? 'bg-ink-desk text-surface' : 'text-ink-2',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="flex-1" />
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
    </m.div>
  );
}
