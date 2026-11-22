import 'server-only';
import { rawClient } from '@/server/db';
import type { LiveEvent } from './publish';

/**
 * Раздача событий реального времени внутри одной копии приложения.
 * Одно соединение LISTEN на копию → все SSE-подписчики этой копии. Копий может быть сколько угодно:
 * Postgres рассылает NOTIFY каждой из них (docs/architecture.md §6, §11).
 */
type Listener = (e: LiveEvent) => void;

declare global {
  var __dekanatHub: { listeners: Set<Listener>; started: Promise<void> | null } | undefined;
}
const hub = (globalThis.__dekanatHub ??= { listeners: new Set(), started: null });

function start() {
  hub.started ??= rawClient()
    .listen('events', (payload) => {
      let e: LiveEvent;
      try {
        e = JSON.parse(payload) as LiveEvent;
      } catch {
        return;
      }
      for (const l of hub.listeners) l(e);
    })
    .then(() => undefined)
    .catch((err) => {
      hub.started = null;
      console.error('LISTEN не удалось', err);
    });
  return hub.started;
}

export async function subscribe(l: Listener) {
  hub.listeners.add(l);
  await start();
  return () => hub.listeners.delete(l);
}
