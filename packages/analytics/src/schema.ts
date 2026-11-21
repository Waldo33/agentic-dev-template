import { z } from 'zod';

/**
 * Таксономия событий живёт в коде приложения: `defineEvents(['page_view', 'signup', ...])`.
 * Событие, которого нет в каталоге, сервер не примет — так аналитика не зарастает мусором.
 */
export function defineEvents<const T extends readonly string[]>(names: T) {
  for (const n of names) {
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(n)) throw new Error(`Плохое имя события: ${n} (нужно snake_case)`);
  }
  return { names, has: (name: string): name is T[number] => (names as readonly string[]).includes(name) };
}

export type EventCatalog<T extends readonly string[] = readonly string[]> = ReturnType<typeof defineEvents<T>>;
export type EventName<C> = C extends EventCatalog<infer T> ? T[number] : never;

const propValue = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const incomingEvent = z.object({
  event: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  props: z.record(z.string().max(64), propValue).optional(),
  anonId: z.string().min(8).max(64),
  sessionId: z.string().min(8).max(64),
  userId: z.string().max(128).optional(),
  path: z.string().max(500).optional(),
  ts: z.number().int().positive().optional(),
});

export const incomingBatch = z.object({ events: z.array(incomingEvent).min(1).max(50) });

export type IncomingEvent = z.infer<typeof incomingEvent>;
