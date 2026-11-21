import * as Sentry from '@sentry/node';
import pino from 'pino';
import { appInfo } from './info';
import { envelopeTarget } from './tunnel';

const info = appInfo();
const startedAt = Date.now();

/**
 * Логи — JSON в stdout. На сервере их собирает OTel-агент и отправляет в ClickHouse на `obs`.
 * Токены, пароли и cookie вырезаются.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: info.app, release: info.release, env: info.env },
  redact: {
    paths: ['*.password', '*.token', '*.authorization', '*.cookie', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[скрыто]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

let started = false;

/** Включает отправку серверных ошибок в Bugsink (если задан SENTRY_DSN). Вызывать один раз при старте. */
export function initServerObservability(): void {
  if (started) return;
  started = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('SENTRY_DSN не задан — ошибки пишутся только в лог');
    return;
  }
  Sentry.init({
    dsn,
    release: info.release,
    environment: info.env,
    serverName: info.app,
    // Трейсы идут через OpenTelemetry отдельно (этап 4); здесь — только ошибки.
    tracesSampleRate: 0,
  });
  logger.info('ошибки сервера уходят в Bugsink');
}

/** Ошибка → лог + Bugsink (если включён). */
export function captureError(error: unknown, context: Record<string, unknown> = {}): void {
  logger.error({ err: error, ...context }, 'необработанная ошибка');
  if (process.env.SENTRY_DSN) Sentry.captureException(error, { extra: context });
}

/** Обработчик туннеля /_/err: пересылает конверт браузерного SDK в Bugsink. */
export async function forwardBrowserEnvelope(request: Request): Promise<Response> {
  const body = await request.text();
  if (body.length > 1_000_000) return new Response(null, { status: 413 });
  const target = envelopeTarget(body, process.env.SENTRY_DSN);
  if (!target) return new Response(null, { status: 204 });
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-sentry-envelope' },
      signal: AbortSignal.timeout(5000),
    });
    return new Response(null, { status: res.ok ? 204 : 502 });
  } catch (e) {
    logger.warn({ err: e }, 'не удалось переслать ошибку браузера');
    return new Response(null, { status: 502 });
  }
}

/** Ответ для GET /up: kamal-proxy и Gatus проверяют, что приложение живо и какой релиз крутится. */
export function healthResponse(extra: Record<string, unknown> = {}): Response {
  return Response.json(
    { ok: true, app: info.app, release: info.release, uptime: Math.round((Date.now() - startedAt) / 1000), ...extra },
    { headers: { 'cache-control': 'no-store' } },
  );
}
