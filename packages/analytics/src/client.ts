/**
 * Браузерный трекер: копит события и отправляет пачкой на /_/e своего домена
 * (sendBeacon — доходит даже при закрытии вкладки). Без cookie: анонимный id в localStorage.
 */
type Props = Record<string, string | number | boolean | null>;

interface Queued {
  event: string;
  props?: Props;
  anonId: string;
  sessionId: string;
  userId?: string;
  path: string;
  ts: number;
}

const ENDPOINT = '/_/e';
const queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let userId: string | undefined;

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function stored(storage: 'localStorage' | 'sessionStorage', key: string): string {
  try {
    const s = window[storage];
    let v = s.getItem(key);
    if (!v) {
      v = randomId();
      s.setItem(key, v);
    }
    return v;
  } catch {
    // приватный режим Safari и т. п. — id живёт до перезагрузки
    return (memory[key] ??= randomId());
  }
}
const memory: Record<string, string> = {};

export function identify(id: string | undefined): void {
  userId = id;
}

export function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 50);
  const body = JSON.stringify({ events: batch });
  const sent = typeof navigator !== 'undefined' && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }));
  if (!sent) void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
  if (queue.length) flush();
}

export function track<E extends string>(event: E, props?: Props): void {
  if (typeof window === 'undefined') return;
  queue.push({
    event,
    props,
    anonId: stored('localStorage', 'lab:anon'),
    sessionId: stored('sessionStorage', 'lab:session'),
    userId,
    path: location.pathname,
    ts: Date.now(),
  });
  if (queue.length >= 20) return flush();
  timer ??= setTimeout(() => {
    timer = null;
    flush();
  }, 2000);
}

if (typeof window !== 'undefined') {
  addEventListener('pagehide', flush);
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
