import type { IncomingEvent } from './schema';

/** Строка таблицы analytics.events в ClickHouse (см. infra/clickhouse/init/01-analytics.sql). */
export interface EventRow {
  ts: string;
  app: string;
  event: string;
  anon_id: string;
  session_id: string;
  user_id: string;
  path: string;
  props: string;
  flags: Record<string, string>;
  release: string;
  country: string;
  device: string;
}

export function deviceOf(userAgent: string | null | undefined): 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown' {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/bot|crawler|spider|preview|facebookexternalhit|telegrambot|whatsapp/.test(ua)) return 'bot';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|iphone|android/.test(ua)) return 'mobile';
  return 'desktop';
}

/** Время клиента принимаем, только если оно не дальше суток от серверного. */
function pickTime(clientTs: number | undefined, now: number): number {
  if (clientTs && Math.abs(clientTs - now) < 86_400_000) return clientTs;
  return now;
}

export function enrich(
  e: IncomingEvent,
  ctx: { app: string; release: string; userAgent?: string | null; country?: string | null; flags?: Record<string, string>; now?: number },
): EventRow {
  const now = ctx.now ?? Date.now();
  return {
    // ClickHouse DateTime64(3) принимает 'YYYY-MM-DD hh:mm:ss.sss'
    ts: new Date(pickTime(e.ts, now)).toISOString().replace('T', ' ').replace('Z', ''),
    app: ctx.app,
    event: e.event,
    anon_id: e.anonId,
    session_id: e.sessionId,
    user_id: e.userId ?? '',
    path: e.path ?? '',
    props: JSON.stringify(e.props ?? {}),
    flags: ctx.flags ?? {},
    release: ctx.release,
    country: (ctx.country ?? '').slice(0, 2).toUpperCase(),
    device: deviceOf(ctx.userAgent),
  };
}
