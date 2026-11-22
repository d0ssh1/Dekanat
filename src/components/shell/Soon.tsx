import { requireStudent } from '@/server/auth/guards';
import { getShell } from '@/server/dal/me';
import { HeroRing, PhoneSheet, PhoneTop } from './PhoneTop';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

/** Временная страница раздела, который появится в следующей фазе. Навигация и каркас уже настоящие. */
export async function Soon({ title, phase, about }: { title: string; phase: number; about: string }) {
  const viewer = await requireStudent();
  const shell = await getShell(viewer);
  return (
    <>
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <PhoneTop unread={shell.unread} initials={shell.initials}>
          <Stagger>
            <StaggerItem className="mt-5 text-[15px] font-bold">Привет, {shell.firstName}</StaggerItem>
            <StaggerItem className="mt-1 text-[40px] leading-none font-black tracking-[-0.04em]">
              {title}
            </StaggerItem>
          </Stagger>
        </PhoneTop>
        <PhoneSheet>
          <p className="m-0 text-[15px] leading-snug">{about}</p>
          <p className="m-0 mt-2 text-[13px] font-semibold text-ink-2">Раздел собирается — фаза {phase}.</p>
        </PhoneSheet>
      </div>
      <div className="hidden lg:block">
        <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">{title}</h1>
        <div className="mt-[18px] rounded-[24px] bg-surface p-6">
          <p className="m-0 text-[15px]">{about}</p>
          <p className="m-0 mt-2 text-[13px] font-semibold text-ink-2">Раздел собирается — фаза {phase}.</p>
        </div>
      </div>
    </>
  );
}
