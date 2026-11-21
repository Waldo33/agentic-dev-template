import * as Sentry from '@sentry/browser';

export interface BrowserObservabilityOptions {
  /** Публичный DSN Bugsink (DSN не секрет). Нет DSN — ошибки браузера не отправляются. */
  dsn?: string;
  release: string;
  env: string;
}

let started = false;

/**
 * Ошибки и необработанные промисы в браузере → /_/err своего домена → Bugsink.
 * DSN приходит с сервера во время рендера, поэтому образ не нужно пересобирать под окружение.
 */
export function initBrowserObservability(opts: BrowserObservabilityOptions): void {
  if (started || !opts.dsn || typeof window === 'undefined') return;
  started = true;
  Sentry.init({
    dsn: opts.dsn,
    release: opts.release,
    environment: opts.env,
    tunnel: '/_/err',
    tracesSampleRate: 0,
  });
}

export function captureBrowserError(error: unknown): void {
  if (started) Sentry.captureException(error);
  else console.error(error);
}
