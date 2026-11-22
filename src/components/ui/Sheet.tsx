'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, m, useDragControls } from 'motion/react';
import { cn } from '@/lib/cn';
import { spring } from '@/components/motion/tokens';
import { Icon } from './Icon';

/**
 * Лист: на телефоне выезжает снизу и закрывается жестом вниз, на компьютере — окно по центру.
 * Radix даёт ловушку фокуса, Esc и подписи для экранных дикторов; Motion — движение.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const drag = useDragControls();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-40 bg-ink/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount {...(description ? {} : { 'aria-describedby': undefined })}>
              <m.div
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[28px] bg-surface px-[18px] pt-2 pb-[calc(var(--safe-bottom)+24px)] outline-none',
                  'lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[28px] lg:p-7',
                  className,
                )}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={spring.soft}
                drag="y"
                dragListener={false}
                dragControls={drag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.8 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false);
                }}
              >
                <div
                  className="mx-auto mb-3 flex h-6 w-full cursor-grab touch-none items-center justify-center lg:hidden"
                  onPointerDown={(e) => drag.start(e)}
                  aria-hidden
                >
                  <span className="h-1.5 w-10 rounded-full bg-line" />
                </div>
                <div className="flex items-start gap-3">
                  <Dialog.Title className="m-0 flex-1 text-[22px] font-black tracking-[-0.02em]">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Закрыть"
                    className="-mt-1 flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-2"
                  >
                    <Icon name="close" />
                  </Dialog.Close>
                </div>
                {description && (
                  <Dialog.Description className="m-0 mt-1 text-[14px] text-ink-2">
                    {description}
                  </Dialog.Description>
                )}
                <div className="mt-4">{children}</div>
              </m.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
