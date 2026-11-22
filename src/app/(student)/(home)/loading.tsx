import { Skeleton } from '@/components/motion/Skeleton';
import { HeroRing } from '@/components/shell/PhoneTop';

/** Загрузка (макет B2PhoneB «Загрузка»): та же раскладка и цвет, вместо данных — скелетоны с блеском. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Загружаем" className="flex flex-1 flex-col">
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <div className="relative px-[18px] pt-[calc(var(--safe-top)+14px)] pb-[22px]">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[17px] font-bold">деканат</span>
            <Skeleton tone="glass" className="size-11 rounded-[15px]" />
            <Skeleton tone="glass" className="size-11 rounded-full" />
          </div>
          <Skeleton tone="glass" className="mt-3.5 h-12 w-full rounded-[15px]" />
          <Skeleton tone="glass" className="mt-5 h-4 w-40" />
          <Skeleton tone="glass" className="mt-2 h-[92px] w-52 rounded-[18px]" />
          <Skeleton tone="glass" className="mt-3 h-6 w-64" />
          <Skeleton tone="glass" className="mt-4 h-12 w-full rounded-[15px]" />
        </div>
        <section className="flex flex-1 flex-col gap-3 rounded-t-[28px] bg-surface px-[18px] pt-4 shadow-sheet">
          <div className="text-[18px] font-bold">Загружаем…</div>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </section>
      </div>
      <div className="hidden lg:block">
        <Skeleton className="h-10 w-80 rounded-[12px] bg-surface" />
        <div className="mt-[18px] grid h-[420px] grid-cols-[0.62fr_1.6fr_1fr_1fr] items-end gap-3.5">
          <Skeleton className="h-[360px] rounded-[28px] bg-surface" />
          <Skeleton className="h-[420px] rounded-[28px] bg-surface" />
          <Skeleton className="h-[360px] rounded-[28px] bg-surface" />
          <Skeleton className="h-[360px] rounded-[28px] bg-surface" />
        </div>
      </div>
    </div>
  );
}
