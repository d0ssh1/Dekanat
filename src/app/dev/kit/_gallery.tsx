'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconTile, LinkRow, StatusText } from '@/components/ui/primitives';
import {
  CountUp,
  DrawLine,
  Flash,
  Odometer,
  Skeleton,
  StatefulButton,
  SwipeRow,
  useShake,
  useToast,
  type ButtonState,
} from '@/components/motion';
import { DeskHomeDemo, PhoneHomeDemo } from './_demo';

const ICONS: IconName[] = [
  'home',
  'calendar',
  'chart',
  'doc',
  'bell',
  'back',
  'forward',
  'arrowRight',
  'arrowLeft',
  'clock',
  'check',
  'alert',
  'chat',
  'pencil',
  'eye',
  'megaphone',
  'lock',
  'box',
  'wifiOff',
  'plus',
  'minus',
  'close',
  'upload',
  'download',
  'map',
  'video',
  'user',
  'logout',
  'search',
  'grip',
  'more',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] bg-surface p-5">
      <h2 className="m-0 mb-4 text-[18px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function KitGallery() {
  const toast = useToast();
  const [n, setN] = useState(3);
  const [score, setScore] = useState(48);
  const [btn, setBtn] = useState<ButtonState>('idle');
  const [flash, setFlash] = useState(0);
  const [shakeRef, shake] = useShake<HTMLDivElement>();
  const [rows, setRows] = useState(['ML сегодня в D734', 'Справка №1047 готова', 'Запись на элективы']);

  const send = () => {
    setBtn('loading');
    window.setTimeout(() => setBtn('success'), 1200);
    window.setTimeout(() => setBtn('idle'), 3200);
  };

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-8 text-ink">
      <header>
        <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">Кит компонентов</h1>
        <p className="m-0 mt-1 text-ink-2">
          Токены, примитивы и анимации. Сверка экранов: /dev/kit/phone (390×844) и /dev/kit/desk (1086×844).
        </p>
      </header>

      <div className="flex flex-wrap items-start gap-8">
        <div className="h-[844px] w-[390px] overflow-hidden rounded-[48px] shadow-[0_0_0_10px_var(--ink)]">
          <PhoneHomeDemo className="h-full" />
        </div>
        <div className="max-w-full overflow-x-auto rounded-[26px] shadow-frame">
          <DeskHomeDemo className="h-[844px] w-[1086px]" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Кнопки">
          <div className="flex flex-wrap gap-3">
            <Button>Отправить в деканат</Button>
            <Button variant="secondary">Написать специалисту</Button>
            <Button variant="white" className="ring-1 ring-line">
              Неделя
            </Button>
            <Button variant="join" size="sm">
              Войти
            </Button>
            <Button variant="danger" size="md">
              Отменить заявку
            </Button>
            <Button variant="glass" size="icon" aria-label="Назад" className="bg-hero">
              <Icon name="back" />
            </Button>
          </div>
        </Section>

        <Section title="Отправка: текст → индикатор → галочка">
          <StatefulButton state={btn} onClick={send} successLabel="Заявка отправлена">
            Отправить в деканат
          </StatefulButton>
        </Section>

        <Section title="Перекат цифр и счёт вверх">
          <div className="flex items-center gap-6">
            <div className="text-[64px] leading-none font-black tracking-[-0.05em] tabular">
              <Odometer value={n} />
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                aria-label="Меньше"
                onClick={() => setN((x) => Math.max(0, x - 1))}
              >
                <Icon name="minus" />
              </Button>
              <Button size="icon" variant="secondary" aria-label="Больше" onClick={() => setN((x) => x + 1)}>
                <Icon name="plus" />
              </Button>
            </div>
            <div className="text-[48px] font-black tabular" key={score}>
              <CountUp value={score} />
            </div>
            <Button size="md" variant="secondary" onClick={() => setScore((s) => (s === 48 ? 53 : 48))}>
              Пересчитать
            </Button>
          </div>
        </Section>

        <Section title="Тосты и ошибка поля">
          <div className="flex flex-wrap gap-3">
            <Button
              size="md"
              onClick={() =>
                toast.show({
                  title: 'Справка №1052 готова',
                  body: 'PDF с QR или бумажная в D210',
                  tone: 'ok',
                })
              }
            >
              Статус пришёл
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() =>
                toast.show({
                  title: 'Не отправилось',
                  body: 'Черновик сохранён',
                  tone: 'danger',
                  action: { label: 'Повторить', onClick: () => {} },
                })
              }
            >
              Ошибка
            </Button>
          </div>
          <div ref={shakeRef} className="mt-4 flex items-center gap-3">
            <input
              aria-label="Пароль"
              placeholder="Пароль"
              className="h-12 flex-1 rounded-[14px] border-[1.5px] border-danger bg-surface px-4 outline-none"
            />
            <Button size="md" variant="secondary" onClick={shake}>
              Покачать
            </Button>
          </div>
        </Section>

        <Section title="Вспышка при изменении и таймлайн">
          <Flash signal={flash} className="rounded-[14px] p-3">
            <div className="flex items-center gap-3">
              <IconTile icon="check" tone="ok" />
              <span className="flex-1 font-bold">Справка в военкомат</span>
              <StatusText tone="ok">готова</StatusText>
            </div>
          </Flash>
          <Button size="md" variant="secondary" className="mt-3" onClick={() => setFlash((x) => x + 1)}>
            Изменить статус
          </Button>
          <div className="mt-4 flex gap-3" key={flash}>
            <div className="flex flex-col items-center">
              <span className="size-3 rounded-full bg-ink" />
              <DrawLine className="h-12 bg-line" />
              <span className="size-3 rounded-full bg-hero" />
              <DrawLine className="h-12 bg-line" delay={0.3} />
              <span className="size-3 rounded-full border-2 border-line bg-surface" />
            </div>
            <div className="flex flex-col justify-between py-0 text-[14px]">
              <b>Отправлена</b>
              <b className="text-hero-ink">Принята в работу · сейчас</b>
              <span className="text-ink-2">Готовится</span>
            </div>
          </div>
        </Section>

        <Section title="Смахнуть, чтобы прочитать (телефон)">
          <div className="flex flex-col gap-1">
            {rows.map((r) => (
              <SwipeRow key={r} label="Прочитано" onSwipe={() => setRows((xs) => xs.filter((x) => x !== r))}>
                <div className="flex min-h-12 items-center gap-3 border-t border-line py-2">
                  <IconTile icon="bell" tone="hero" />
                  <span className="flex-1 font-bold">{r}</span>
                </div>
              </SwipeRow>
            ))}
          </div>
        </Section>

        <Section title="Скелетоны загрузки">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[92px] w-56" />
            <Skeleton className="h-12 w-full rounded-[14px]" />
            <div className="rounded-[20px] bg-hero p-4">
              <Skeleton tone="glass" className="h-12 w-full rounded-[15px]" />
            </div>
          </div>
        </Section>

        <Section title="Иконки и плашки">
          <div className="flex flex-wrap gap-3 text-ink">
            {ICONS.map((i) => (
              <span
                key={i}
                title={i}
                className="flex size-10 items-center justify-center rounded-[11px] bg-surface-2"
              >
                <Icon name={i} />
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <IconTile icon="clock" tone="hero" />
            <IconTile icon="check" tone="ok" />
            <IconTile icon="alert" tone="danger" />
            <IconTile icon="calendar" tone="neutral" />
            <IconTile icon="video" tone="online" />
          </div>
          <LinkRow
            href="/dev/kit"
            icon="clock"
            title="По делам"
            hint="КТ через 2 дня и ещё 1"
            className="mt-4"
          />
        </Section>
      </div>
    </main>
  );
}
