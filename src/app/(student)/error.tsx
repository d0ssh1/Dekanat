'use client';

import { useEffect } from 'react';
import { m } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { spring } from '@/components/motion/tokens';

/**
 * Ошибка сервера (макет B2Errors «Сервер не отвечает»): честно говорим, что случилось,
 * и даём одну кнопку — повторить. Каркас и навигация остаются на месте.
 */
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex flex-1 flex-col px-[18px] pt-[calc(var(--safe-top)+20px)] lg:px-0 lg:pt-0">
      <m.div
        role="alert"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        className="rounded-[24px] bg-surface p-5 lg:max-w-[560px]"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-danger-wash text-[16px] font-black text-danger">
            !
          </span>
          <div className="flex-1">
            <b className="text-[17px]">Не удалось обновить</b>
            <p className="m-0 mt-1 text-[14px] leading-snug text-ink-2">
              Сервер деканата не ответил. Ваши данные в порядке — попробуйте ещё раз через пару секунд.
            </p>
          </div>
        </div>
        <Button className="mt-4" block onClick={reset}>
          Повторить
        </Button>
      </m.div>
    </div>
  );
}
