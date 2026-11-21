import { describe, expect, it, vi } from 'vitest';
import { clickHouseSink, defineEvents, deviceOf, enrich } from '../src/index';
import { eventsHandler } from '../src/server';

const catalog = defineEvents(['page_view', 'signup']);
const base = { anonId: 'anon-12345678', sessionId: 'sess-12345678' };

describe('каталог событий', () => {
  it('требует snake_case', () => {
    expect(() => defineEvents(['PageView'])).toThrow();
    expect(catalog.has('signup')).toBe(true);
    expect(catalog.has('unknown_event')).toBe(false);
  });
});

describe('enrich', () => {
  it('добавляет приложение, релиз, устройство и страну', () => {
    const row = enrich(
      { ...base, event: 'signup', props: { plan: 'free' }, ts: 1_800_000_000_000 },
      { app: 'hello', release: 'abc', userAgent: 'Mozilla/5.0 (iPhone)', country: 'tr', now: 1_800_000_000_500 },
    );
    expect(row).toMatchObject({ app: 'hello', release: 'abc', device: 'mobile', country: 'TR', props: '{"plan":"free"}' });
    expect(row.ts).toBe('2027-01-15 08:00:00.000');
  });

  it('не верит времени клиента, если оно дальше суток', () => {
    const now = 1_800_000_000_000;
    const row = enrich({ ...base, event: 'signup', ts: 1 }, { app: 'a', release: 'r', now });
    expect(row.ts).toBe(new Date(now).toISOString().replace('T', ' ').replace('Z', ''));
  });

  it('узнаёт ботов превью', () => {
    expect(deviceOf('TelegramBot (like TwitterBot)')).toBe('bot');
    expect(deviceOf(null)).toBe('unknown');
  });
});

describe('eventsHandler', () => {
  const post = (body: unknown) => new Request('http://x/_/e', { method: 'POST', body: JSON.stringify(body) });

  it('пишет только события из каталога', async () => {
    const write = vi.fn(async () => {});
    const handle = eventsHandler({ app: 'hello', release: 'r', catalog, sink: { write } });
    const res = await handle(post({ events: [{ ...base, event: 'signup' }, { ...base, event: 'junk' }] }));
    expect(res.status).toBe(204);
    expect(write).toHaveBeenCalledOnce();
    expect((write.mock.calls[0] as unknown as [{ event: string }[]])[0].map((r) => r.event)).toEqual(['signup']);
  });

  it('отвечает 400 на мусор и 204, даже если хранилище упало', async () => {
    const handle = eventsHandler({
      app: 'a',
      release: 'r',
      catalog,
      sink: { write: async () => Promise.reject(new Error('down')) },
      onError: () => {},
    });
    expect((await handle(new Request('http://x', { method: 'POST', body: 'не json' }))).status).toBe(400);
    expect((await handle(post({ events: [] }))).status).toBe(400);
    expect((await handle(post({ events: [{ ...base, event: 'signup' }] }))).status).toBe(204);
  });
});

describe('clickHouseSink', () => {
  it('шлёт JSONEachRow с async_insert и авторизацией в заголовках', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 200 }));
    const sink = clickHouseSink({ url: 'https://ch.example.com', user: 'writer', password: 'secret', fetchImpl });
    const row = enrich({ ...base, event: 'signup' }, { app: 'a', release: 'r', now: 0 });
    await sink.write([row, row]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get('query')).toBe('INSERT INTO analytics.events FORMAT JSONEachRow');
    expect(url.searchParams.get('async_insert')).toBe('1');
    expect((init.headers as Record<string, string>)['x-clickhouse-user']).toBe('writer');
    expect(String(init.body).split('\n')).toHaveLength(2);
  });
});
