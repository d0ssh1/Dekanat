'use client';

import Link from 'next/link';
import { m, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/cn';
import { press, spring } from '@/components/motion/tokens';

/**
 * Кнопки из макетов:
 * - primary  — чёрная главная (h 48, r 15, 15/800). Одна на экран.
 * - secondary — мягкая на тёплом сером (ссылки-кнопки «По делам», «Написать специалисту»).
 * - glass    — полупрозрачная белая на оранжевом (колокольчик, иконки в шапке телефона).
 * - white    — белая на сером фоне ПК (стрелки недели, кнопки дней).
 * - join     — синяя «Войти»/«Подключиться» у онлайн-пары.
 * - danger   — тихое разрушительное действие текстом («Отменить заявку»).
 */
const VARIANT = {
  primary: 'bg-ink text-surface font-extrabold',
  secondary: 'bg-surface-2 text-ink font-semibold',
  glass: 'bg-glass-50 text-ink font-bold',
  white: 'bg-surface text-ink-desk font-bold',
  join: 'bg-join text-online font-extrabold',
  danger: 'bg-transparent text-danger font-bold',
} as const;

const SIZE = {
  lg: 'h-12 rounded-[15px] px-5 text-[15px]',
  md: 'h-11 rounded-[14px] px-4 text-[14px]',
  sm: 'h-[34px] rounded-[10px] px-3 text-[13px]',
  icon: 'size-11 rounded-[15px] p-0',
} as const;

type Common = { variant?: keyof typeof VARIANT; size?: keyof typeof SIZE; block?: boolean };

export function Button({
  variant = 'primary',
  size = 'lg',
  block,
  className,
  type = 'button',
  ...rest
}: HTMLMotionProps<'button'> & Common) {
  return (
    <m.button
      type={type}
      whileTap={rest.disabled ? undefined : press}
      transition={spring.snappy}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    />
  );
}

const MotionLink = m.create(Link);

export function ButtonLink({
  variant = 'primary',
  size = 'lg',
  block,
  className,
  ...rest
}: React.ComponentProps<typeof MotionLink> & Common) {
  return (
    <MotionLink
      whileTap={press}
      transition={spring.snappy}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    />
  );
}
