import type { EventRow } from './enrich';

export interface Sink {
  write(rows: EventRow[]): Promise<void>;
}

/**
 * Запись в ClickHouse по HTTP: `INSERT … FORMAT JSONEachRow` с async_insert —
 * ClickHouse сам собирает мелкие вставки в пачки. Пользователь — только INSERT в analytics.events.
 */
export function clickHouseSink(opts: { url: string; user: string; password: string; table?: string; fetchImpl?: typeof fetch }): Sink {
  const table = opts.table ?? 'analytics.events';
  const f = opts.fetchImpl ?? fetch;
  const query = `INSERT INTO ${table} FORMAT JSONEachRow`;
  const url = new URL(opts.url);
  url.searchParams.set('query', query);
  url.searchParams.set('async_insert', '1');
  url.searchParams.set('wait_for_async_insert', '0');
  url.searchParams.set('date_time_input_format', 'best_effort');
  return {
    async write(rows) {
      if (rows.length === 0) return;
      const res = await f(url, {
        method: 'POST',
        headers: {
          'x-clickhouse-user': opts.user,
          'x-clickhouse-key': opts.password,
          'content-type': 'application/x-ndjson',
        },
        body: rows.map((r) => JSON.stringify(r)).join('\n'),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`ClickHouse ответил ${res.status}: ${(await res.text()).slice(0, 300)}`);
    },
  };
}

/** Без ClickHouse (локально, в CI) события просто пишутся в лог. */
export function logSink(log: (rows: EventRow[]) => void = (rows) => console.warn('[analytics]', JSON.stringify(rows))): Sink {
  return {
    async write(rows) {
      log(rows);
    },
  };
}
