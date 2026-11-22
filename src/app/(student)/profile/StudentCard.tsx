'use client';

import { useState } from 'react';
import { m } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { spring } from '@/components/motion/tokens';

/** «Студенческий билет · QR» — открывает лист с карточкой и QR-кодом. */
export function StudentCardButton({
  qrSvg,
  name,
  group,
  recordBook,
}: {
  qrSvg: string;
  name: string;
  group: string;
  recordBook: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button block onClick={() => setOpen(true)}>
        Студенческий билет · QR
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Студенческий билет"
        description="Покажите на входе в корпус или в библиотеке."
      >
        <m.div
          initial={{ rotateX: 18, opacity: 0, y: 16 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.08 }}
          style={{ transformPerspective: 900 }}
          className="rounded-[24px] bg-hero p-5"
        >
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">деканат · концепт</div>
              <div className="mt-6 text-[22px] leading-tight font-black tracking-[-0.02em]">{name}</div>
              <div className="mt-1 text-[14px] font-semibold">{group}</div>
              <div className="mt-3 text-[13px] font-bold">№ {recordBook}</div>
            </div>
            <div
              className="size-[112px] shrink-0 rounded-[14px] bg-surface p-2.5 [&>svg]:size-full"
              role="img"
              aria-label="QR-код студенческого билета"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
        </m.div>
        <p className="m-0 mt-3 text-[12px] leading-snug font-medium text-ink-2">
          Это концепт для конкурса: билет и QR-код не являются официальными документами.
        </p>
      </Sheet>
    </>
  );
}
