import { enrich } from './enrich';
import { incomingBatch, type EventCatalog } from './schema';
import { clickHouseSink, logSink, type Sink } from './sinks';

/** Куда писать: ClickHouse, если заданы CLICKHOUSE_*, иначе — в лог. */
export function sinkFromEnv(env: Record<string, string | undefined> = process.env): Sink {
  if (env.CLICKHOUSE_URL && env.CLICKHOUSE_USER && env.CLICKHOUSE_PASSWORD) {
    return clickHouseSink({ url: env.CLICKHOUSE_URL, user: env.CLICKHOUSE_USER, password: env.CLICKHOUSE_PASSWORD });
  }
  return logSink();
}

export interface EventsHandlerOptions {
  app: string;
  release: string;
  catalog: EventCatalog;
  sink: Sink;
  /** Активные варианты флагов для пользователя — пишутся в каждое событие (для сравнения вариантов). */
  flagsFor?: (anonId: string) => Promise<Record<string, string>> | Record<string, string>;
  onError?: (e: unknown) => void;
}

/**
 * Обработчик POST /_/e. Всегда отвечает 204 на валидный запрос, даже если хранилище недоступно:
 * аналитика не должна ломать продукт.
 */
export function eventsHandler(opts: EventsHandlerOptions) {
  return async function handle(request: Request): Promise<Response> {
    const text = await request.text();
    if (text.length > 64_000) return new Response(null, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(null, { status: 400 });
    }
    const parsed = incomingBatch.safeParse(json);
    if (!parsed.success) return new Response(null, { status: 400 });
    const known = parsed.data.events.filter((e) => opts.catalog.has(e.event));
    if (known.length === 0) return new Response(null, { status: 204 });
    const userAgent = request.headers.get('user-agent');
    const country = request.headers.get('cf-ipcountry') ?? request.headers.get('x-country');
    try {
      const flags = opts.flagsFor ? await opts.flagsFor(known[0]!.anonId) : {};
      await opts.sink.write(known.map((e) => enrich(e, { app: opts.app, release: opts.release, userAgent, country, flags })));
    } catch (e) {
      opts.onError?.(e);
    }
    return new Response(null, { status: 204 });
  };
}
