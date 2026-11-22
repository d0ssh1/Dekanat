'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { StatefulButton } from '@/components/motion/StatefulButton';
import { useShake } from '@/components/motion/useShake';
import { spring } from '@/components/motion/tokens';
import { loginAction, type LoginState } from './actions';

const field =
  'h-[52px] w-full rounded-[15px] border-[1.5px] border-field-line bg-surface px-3.5 text-[16px] text-ink outline-none transition-colors focus:border-ink';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <StatefulButton type="submit" state={pending ? 'loading' : 'idle'} className="mt-[18px] w-full">
      Войти
    </StatefulButton>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, undefined);
  const [show, setShow] = useState(false);
  const [shakeRef, shake] = useShake<HTMLDivElement>();
  const pwRef = useRef<HTMLInputElement>(null);
  const hasError = Boolean(state?.error);

  useEffect(() => {
    if (!state?.error) return;
    shake();
    pwRef.current?.focus();
    pwRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ink-2">Логин или почта</span>
        <input
          name="login"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.values?.login}
          className={field}
        />
      </label>
      <div ref={shakeRef}>
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-2">Пароль</span>
          <span className="relative block">
            <input
              ref={pwRef}
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? 'login-error' : undefined}
              className={cn(field, 'pr-16', hasError && 'border-2 border-danger focus:border-danger')}
            />
            <button
              type="button"
              onClick={() => setShow((x) => !x)}
              aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
              aria-pressed={show}
              className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-[12px] text-ink-2"
            >
              <Icon name="eye" />
            </button>
          </span>
        </label>
      </div>
      <AnimatePresence initial={false}>
        {hasError && (
          <m.div
            key="login-error"
            id="login-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="overflow-hidden"
          >
            <div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-danger">
              <span aria-hidden>!</span>
              {/* Один блок с одним id; меняется только текст — без дублей для экранных дикторов. */}
              <m.span key={state?.error} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                {state?.error}
              </m.span>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <Submit />
    </form>
  );
}
