import QRCode from 'qrcode';
import { requireStudent } from '@/server/auth/guards';
import { getMyProfile } from '@/server/dal/me';
import { getPrefs } from '@/server/dal/prefs';
import { PrefsControls } from './PrefsControls';
import { HeroRing, PhoneSheet, PhoneSubTop } from '@/components/shell/PhoneTop';
import { Disclaimer } from '@/components/ui/primitives';
import { DeskCard } from '@/components/ui/desk';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { UNIVERSITY } from '@/lib/university';
import { StudentCardButton } from './StudentCard';
import { LogoutButtons } from './LogoutButtons';

export const metadata = { title: 'Профиль' };

const fmtLogin = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: UNIVERSITY.timeZone,
      }).format(d)
    : 'нет данных';

/** Профиль (макет B2Core1 «Профиль»): ФИО, институт, направление, курс, группа — как требует ТЗ. */
export default async function ProfilePage() {
  const viewer = await requireStudent();
  const [p, prefs] = await Promise.all([getMyProfile(viewer), getPrefs(viewer)]);
  const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
  const qr = await QRCode.toString(`деканат* · концепт · студенческий ${p.recordBook}`, {
    type: 'svg',
    margin: 0,
    color: { dark: '#14141a', light: '#00000000' },
  });

  const items: [string, string][] = [
    ['Зачётная книжка', `№ ${p.recordBook}`],
    ['Направление', `${p.directionCode} ${p.directionName}`],
    ['Профиль', p.profile],
    ['Группа', p.groupShort === p.groupCode ? p.groupCode : `${p.groupShort} · ${p.groupCode}`],
    ['Форма обучения', `${cap(p.studyForm)} · ${p.funding}`],
    ['Почта', p.email],
  ];
  const card = (
    <StudentCardButton
      qrSvg={qr}
      name={fullName}
      group={`${p.groupShort} · ${p.course} курс`}
      recordBook={p.recordBook}
    />
  );

  return (
    <>
      {/* ---------- Телефон ---------- */}
      <div className="relative flex flex-1 flex-col lg:hidden">
        <HeroRing />
        <PhoneSubTop title="Профиль">
          <Stagger delay={0.04}>
            <StaggerItem className="mt-[18px] flex size-[72px] items-center justify-center rounded-full bg-surface text-[26px] font-black">
              {p.initials}
            </StaggerItem>
            <StaggerItem className="mt-2 text-[30px] leading-[1.05] font-black tracking-[-0.03em]">
              {p.lastName} {p.firstName}
              <br />
              {p.middleName}
            </StaggerItem>
            <StaggerItem className="mt-2 text-[14px] leading-[1.45] font-semibold">
              {p.institute}
              <br />
              {p.directionName} · {p.course} курс · {p.groupShort}
            </StaggerItem>
            <StaggerItem className="mt-4">{card}</StaggerItem>
          </Stagger>
        </PhoneSubTop>
        <PhoneSheet className="pt-[18px]">
          <Stagger delay={0.12}>
            {items.map(([k, v], i) => (
              <StaggerItem key={k}>
                <div
                  className={`flex min-h-11 flex-col justify-center py-[11px] text-[15px] ${i ? 'border-t border-line' : ''}`}
                >
                  <span className="text-[13px] font-semibold text-ink-2">{k}</span>
                  <span className="break-words">{v}</span>
                </div>
              </StaggerItem>
            ))}
            <StaggerItem>
              <PrefsControls heroColor={prefs.heroColor} demoClock={prefs.demoClock} />
            </StaggerItem>
            <StaggerItem>
              <div className="flex min-h-11 flex-col justify-center border-t border-line py-[11px] text-[15px]">
                <span className="text-[13px] font-semibold text-ink-2">Безопасность</span>
                <span>
                  Последний вход {fmtLogin(p.lastLoginAt)} · активных сеансов: {p.activeSessions}
                </span>
              </div>
            </StaggerItem>
            <StaggerItem>
              <LogoutButtons />
            </StaggerItem>
          </Stagger>
          <Disclaimer className="mt-auto pt-6 text-center" />
        </PhoneSheet>
      </div>

      {/* ---------- Компьютер ---------- */}
      <div className="hidden lg:block">
        <h1 className="m-0 mb-[18px] text-[36px] font-black tracking-[-0.03em]">Профиль</h1>
        <Stagger className="grid grid-cols-[1.1fr_1fr] gap-3.5">
          <StaggerItem className="flex flex-col gap-3.5">
            <DeskCard tone="accent" className="p-[26px]">
              <span
                aria-hidden
                className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
              />
              <div className="relative flex size-[88px] items-center justify-center rounded-full bg-surface text-[32px] font-black">
                {p.initials}
              </div>
              <div className="relative mt-4 text-[40px] leading-[1.02] font-black tracking-[-0.03em]">
                {p.lastName} {p.firstName}
                <br />
                {p.middleName}
              </div>
              <div className="relative mt-3 text-[15px] leading-[1.45] font-semibold">
                {p.institute}
                <br />
                {p.directionName} · {p.course} курс · {p.groupShort}
              </div>
              <div className="relative max-w-[320px] pt-6">{card}</div>
            </DeskCard>
            <section className="flex-1 rounded-[24px] bg-surface px-6 pt-2 pb-4">
              <h2 className="m-0 pt-3 pb-1 text-[18px] font-bold">Настройки</h2>
              <PrefsControls heroColor={prefs.heroColor} demoClock={prefs.demoClock} variant="desk" />
            </section>
          </StaggerItem>
          <StaggerItem>
            <section className="flex h-full flex-col rounded-[24px] bg-surface px-6 py-2">
              <h2 className="m-0 pt-3 pb-1 text-[18px] font-bold">Данные из деканата</h2>
              {items.map(([k, v]) => (
                <div key={k} className="flex flex-col justify-center border-t border-desk-line py-[11px]">
                  <span className="text-[13px] font-semibold text-ink-2">{k}</span>
                  <span className="text-[15px] break-words">{v}</span>
                </div>
              ))}
              <p className="m-0 border-t border-desk-line py-3 text-[13px] leading-snug font-semibold text-ink-2">
                Данные ведёт дирекция института. Если что-то неверно — обратитесь к методисту вашей группы.
              </p>
              <div className="mt-auto">
                <div className="flex min-h-11 flex-col justify-center border-t border-desk-line py-[11px] text-[15px]">
                  <span className="text-[13px] font-semibold text-ink-2">Безопасность</span>
                  <span>
                    Последний вход {fmtLogin(p.lastLoginAt)} · активных сеансов: {p.activeSessions}
                  </span>
                </div>
                <LogoutButtons variant="desk" />
              </div>
            </section>
          </StaggerItem>
        </Stagger>
        <Disclaimer className="mt-6" />
      </div>
    </>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
