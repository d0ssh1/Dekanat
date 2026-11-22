'use client';

/**
 * Демонстрационные сборки экранов из компонентов — для сверки с макетами B2PhoneA и B2Next.
 * Данные — тексты макетов; настоящие экраны получат данные из БД в фазе 4.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LinkRow, Row, SectionHead, StatusText } from '@/components/ui/primitives';
import { DeskBlock, DeskCard, DeskRow, DeskValue } from '@/components/ui/desk';
import { HeroRing, PhoneSheet, PhoneTop } from '@/components/shell/PhoneTop';
import { TabBar } from '@/components/shell/TabBar';
import { DeskHeader } from '@/components/shell/DeskHeader';
import { DayStrip, type DayItem } from '@/components/shell/DayStrip';
import { Odometer, Stagger, StaggerItem } from '@/components/motion';

const DAYS: DayItem[] = [
  { key: 'пн', weekday: 'пн', day: 23, label: 'Понедельник, 23 ноября' },
  { key: 'вт', weekday: 'вт', day: 24, label: 'Вторник, 24 ноября' },
  { key: 'ср', weekday: 'ср', day: 25, label: 'Среда, 25 ноября' },
  { key: 'чт', weekday: 'чт', day: 26, label: 'Четверг, 26 ноября' },
  { key: 'пт', weekday: 'пт', day: 27, label: 'Пятница, 27 ноября' },
  { key: 'сб', weekday: 'сб', day: 28, label: 'Суббота, 28 ноября', muted: true },
];

/** Демо-отсчёт: раз в 4 секунды минус минута — чтобы видеть «перекат» цифр. */
function useDemoCountdown(start = 10) {
  const [v, setV] = useState(start);
  useEffect(() => {
    const t = window.setInterval(() => setV((x) => (x <= 1 ? start : x - 1)), 4000);
    return () => window.clearInterval(t);
  }, [start]);
  return v;
}

export function PhoneHomeDemo({ className }: { className?: string }) {
  const min = useDemoCountdown();
  return (
    <div className={cn('relative flex flex-col overflow-x-hidden overflow-y-auto bg-hero', className)}>
      <HeroRing />
      <PhoneTop unread={3} initials="АВ">
        <Stagger delay={0.05}>
          <StaggerItem className="mt-5 text-[15px] font-bold">До следующей пары</StaggerItem>
          <StaggerItem className="mt-1 text-[104px] leading-[.88] font-black tracking-[-0.06em]">
            <Odometer value={min} />
            <span className="ml-2 text-[36px] tracking-[-0.02em]">мин</span>
          </StaggerItem>
          <StaggerItem className="mt-3 text-[24px] font-extrabold tracking-[-0.02em]">
            Машинное обучение
          </StaggerItem>
          <StaggerItem className="mt-1.5 text-[14px] leading-[1.45] font-semibold">
            Б-214, 2 этаж · Козлов Д. С.
            <br />
            была 412
          </StaggerItem>
          <StaggerItem>
            <Button block className="mt-4">
              Схема этажа
            </Button>
          </StaggerItem>
        </Stagger>
      </PhoneTop>
      <PhoneSheet>
        <SectionHead title="Сегодня" link={{ href: '/week', label: 'Неделя →' }} />
        <Stagger delay={0.15}>
          <StaggerItem>
            <Row first className="text-ink-2">
              <b className="w-[46px]">09:00</b>
              <span className="flex-1">Базы данных</span>
              <StatusText>прошла</StatusText>
            </Row>
          </StaggerItem>
          <StaggerItem>
            <Row current>
              <b className="w-[46px]">10:45</b>
              <span className="flex-1 font-extrabold">Машинное обучение</span>
              <StatusText tone="hero" strong>
                через {min} мин
              </StatusText>
            </Row>
          </StaggerItem>
          <StaggerItem>
            <Row first>
              <b className="w-[46px]">13:00</b>
              <span className="flex-1">
                Английский <span className="text-[12px] font-bold text-online">онлайн</span>
              </span>
              <Button variant="join" size="sm" className="-my-0.5">
                Войти
              </Button>
            </Row>
          </StaggerItem>
          <StaggerItem>
            <Row className="text-ink-2">
              <b className="w-[46px] line-through">14:50</b>
              <span className="flex-1">Веб-разработка</span>
              <StatusText tone="danger">→ чт 14:50</StatusText>
            </Row>
          </StaggerItem>
          <StaggerItem>
            <LinkRow
              href="/"
              icon="clock"
              title="По делам"
              hint="КТ через 2 дня и ещё 1"
              className="mt-2.5"
            />
          </StaggerItem>
        </Stagger>
      </PhoneSheet>
      <TabBar activeHref="/" />
    </div>
  );
}

export function DeskHomeDemo({ className }: { className?: string }) {
  const [day, setDay] = useState('пн');
  const min = useDemoCountdown();
  return (
    <div className={cn('flex flex-col gap-[18px] bg-desk-bg px-7 pt-5 pb-6 text-ink-desk', className)}>
      <DeskHeader unread={3} initials="АВ" activeHref="/" />
      <div className="flex items-end justify-between">
        <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">Понедельник — 4 пары</h1>
        <DayStrip days={DAYS} selected={day} onSelect={setDay} />
      </div>
      <Stagger className="grid h-[452px] grid-cols-[0.62fr_1.6fr_1fr_1fr] items-end gap-3.5">
        <StaggerItem>
          <DeskCard tone="muted" className="h-[388px]">
            <span className="text-[13px] font-bold text-ink-2">09:00 · прошла</span>
            <b className="mt-auto text-[15px] text-ink-soft">Базы данных</b>
            <span className="text-[13px] text-ink-2">ауд. 305</span>
          </DeskCard>
        </StaggerItem>
        <StaggerItem>
          <DeskCard tone="accent" className="h-[452px] p-[26px]">
            <span
              aria-hidden
              className="absolute top-[-90px] right-[-80px] size-60 animate-breathe rounded-full bg-glass-20"
            />
            <div className="relative text-[14px] font-bold">
              Следующая · через <Odometer value={min} /> мин
            </div>
            <div className="relative text-[88px] leading-[.9] font-black tracking-[-0.05em] tabular">
              10:45
            </div>
            <div className="relative mt-auto">
              <div className="text-[34px] leading-[1.05] font-black">Машинное обучение</div>
              <div className="mt-2 text-[14px] font-semibold">
                <b>Б-214, 2 этаж</b> · Козлов Д. С. · была 412
              </div>
              <div className="mt-3.5 flex items-center gap-4">
                <Button size="md" className="h-[46px] px-5">
                  Схема этажа
                </Button>
                <a href="#" className="text-[14px] font-bold">
                  Материалы →
                </a>
              </div>
            </div>
          </DeskCard>
        </StaggerItem>
        <StaggerItem>
          <DeskCard tone="online" className="h-[388px]">
            <span className="text-[13px] font-extrabold text-online-desk">13:00 · онлайн</span>
            <b className="mt-1 text-[19px] font-extrabold tracking-[-0.03em]">Английский язык</b>
            <span className="text-[13px] text-ink-2">Петрова Е. В.</span>
            <Button className="mt-auto h-[46px] rounded-[14px] bg-online-desk text-[14px]" block>
              Подключиться
            </Button>
          </DeskCard>
        </StaggerItem>
        <StaggerItem>
          <DeskCard tone="moved" className="h-[388px]">
            <span className="text-[13px] font-bold text-ink-2">
              <s>14:50</s> · перенесена
            </span>
            <b className="mt-1 text-[19px] font-extrabold tracking-[-0.03em] text-ink-2">Веб-разработка</b>
            <div className="mt-auto rounded-[14px] bg-desk-chip p-3">
              <div className="text-[12px] text-ink-2">Новое время</div>
              <b className="text-[15px]">чт 26.11 · 14:50</b>
              <div className="text-[13px]">ауд. 220</div>
            </div>
          </DeskCard>
        </StaggerItem>
      </Stagger>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3.5">
        <DeskBlock title="Документы" link={{ href: '/documents', label: 'Все →' }}>
          <DeskRow>
            <span className="flex-1">Справка в военкомат</span>
            <DeskValue tone="ink">завтра</DeskValue>
          </DeskRow>
          <DeskRow>
            <span className="flex-1">Справка №1047</span>
            <DeskValue tone="ink">
              готова ·{' '}
              <a href="#" className="font-bold">
                PDF
              </a>
            </DeskValue>
          </DeskRow>
        </DeskBlock>
        <DeskBlock title="Учёба" link={{ href: '/study', label: 'Все →' }}>
          <DeskRow>
            <span className="flex-1">КТ по матстату</span>
            <DeskValue tone="ink">через 2 дня</DeskValue>
          </DeskRow>
          <DeskRow>
            <span className="flex-1">Допуск по ML</span>
            <DeskValue tone="danger">не хватает 2 баллов</DeskValue>
          </DeskRow>
        </DeskBlock>
        <DeskBlock title="Завтра" link={{ href: '/week', label: 'Неделя →' }}>
          <DeskRow>
            <b className="w-11">09:00</b>
            <span className="flex-1">Матстат</span>
            <DeskValue>ауд. 201</DeskValue>
          </DeskRow>
          <DeskRow>
            <span className="flex-1 text-ink-2">ещё 3 пары · до 16:25</span>
          </DeskRow>
        </DeskBlock>
      </div>
    </div>
  );
}

export { Icon };
