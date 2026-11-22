import Link from 'next/link';
import { Disclaimer, Wordmark } from '@/components/ui/primitives';

/**
 * «Не найдено». Сюда же попадает чужая заявка или чужой предмет по прямой ссылке —
 * намеренно без подсказки, существует ли он (docs/security.md, T1).
 * Телефон: оранжевый верх и белая «простыня» (B2Phone). Компьютер: серый фон и карточка (B2Next).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-hero lg:items-center lg:justify-center lg:bg-desk-bg lg:px-6 lg:py-10">
      <div className="px-5 pt-6 pb-8 lg:hidden">
        <Wordmark />
        <div className="mt-10 text-[104px] leading-[.85] font-black tracking-[-0.06em]">404</div>
      </div>
      <div className="flex flex-1 flex-col rounded-t-[28px] bg-surface px-5 pt-7 pb-8 shadow-sheet lg:w-full lg:max-w-[880px] lg:flex-none lg:flex-row lg:items-stretch lg:gap-10 lg:rounded-[28px] lg:p-10 lg:shadow-frame">
        <div className="hidden flex-col justify-between rounded-[22px] bg-hero p-7 lg:flex lg:w-[320px] lg:shrink-0">
          <Wordmark />
          <div className="mt-16 text-[120px] leading-[.85] font-black tracking-[-0.06em]">404</div>
        </div>
        <div className="flex flex-1 flex-col lg:justify-center">
          <h1 className="m-0 text-[28px] leading-tight font-black tracking-[-0.02em] lg:text-[40px]">
            Такой страницы нет
          </h1>
          <p className="m-0 mt-2 text-[15px] leading-snug font-semibold text-ink-2 lg:text-[17px]">
            Возможно, ссылка устарела или ведёт туда, куда у вас нет доступа.
          </p>
          <div className="mt-6 flex flex-col gap-2 lg:flex-row">
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-[15px] bg-ink px-6 text-[15px] font-extrabold text-surface"
            >
              На главную
            </Link>
            <Link
              href="/documents"
              className="flex h-12 items-center justify-center rounded-[15px] bg-surface-2 px-6 text-[15px] font-bold"
            >
              Мои заявки
            </Link>
          </div>
          <Disclaimer className="mt-auto pt-8 lg:mt-8" />
        </div>
      </div>
    </main>
  );
}
