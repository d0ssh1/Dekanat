/**
 * Фоновые задачи сервера: проактивные напоминания раз в час (и один раз через 15 секунд после старта).
 * Выполняется только в Node.js-рантайме; при нескольких копиях приложения правила защищены advisory-lock.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.DISABLE_PROACTIVE === '1') return;
  const { runProactive } = await import('./server/proactive');
  const tick = () =>
    runProactive()
      .then((r) => r.sent && console.log(`[proactive] отправлено напоминаний: ${r.sent}`))
      .catch((e) => console.error('[proactive]', e));
  setTimeout(tick, 15_000);
  setInterval(tick, 60 * 60 * 1000);
}
