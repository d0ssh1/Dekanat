import { UNIVERSITY } from '@/lib/university';

/** Временная заглушка фазы 1: каркас собран и выложен. Главная появится в фазе 4. */
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center bg-hero px-4 text-ink">
      <div className="max-w-md">
        <div className="text-[20px] font-black tracking-[-0.03em]">
          деканат<span className="text-surface">*</span>
        </div>
        <h1 className="mt-6 text-[48px] leading-[0.95] font-black tracking-[-0.04em]">
          Всё об учёбе —<br />в одном месте
        </h1>
        <p className="mt-4 text-[15px] font-semibold">Кабинет собирается. Каркас работает.</p>
        <p className="mt-10 text-[12px] font-medium">{UNIVERSITY.disclaimer}</p>
      </div>
    </main>
  );
}
