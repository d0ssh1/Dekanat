import Link from 'next/link';
import { Disclaimer, Wordmark } from '@/components/ui/primitives';

/**
 * «Не найдено». Сюда же попадает чужая заявка или чужой предмет по прямой ссылке —
 * намеренно без подсказки, существует ли он (docs/security.md, T1).
 */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-hero px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Wordmark />
        <div className="mt-10 text-[96px] leading-[.88] font-black tracking-[-0.06em]">404</div>
        <h1 className="m-0 mt-3 text-[28px] leading-tight font-black tracking-[-0.02em]">
          Такой страницы нет
        </h1>
        <p className="m-0 mt-2 text-[15px] leading-snug font-semibold">
          Возможно, ссылка устарела или ведёт туда, куда у вас нет доступа.
        </p>
        <Link
          href="/"
          className="mt-6 flex h-12 items-center justify-center rounded-[15px] bg-ink text-[15px] font-extrabold text-surface"
        >
          На главную
        </Link>
        <Disclaimer className="mt-8 text-ink" />
      </div>
    </main>
  );
}
