import { describe, expect, it, vi } from 'vitest';
import { bool, createFlags, defineFlags, FliptProvider, variant } from '../src/index';

const defs = defineFlags({
  release_new_home: bool(false, 'новая главная'),
  kill_payments: bool(true, 'выключатель оплаты'),
  exp_cta_text: variant('control', ['control', 'bold'] as const, 'текст кнопки'),
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('defineFlags', () => {
  it('проверяет имена и варианты', () => {
    expect(() => defineFlags({ newHome: bool(false, 'x') })).toThrow(/release_/);
    expect(() => defineFlags({ exp_x_y: bool(false, 'x') })).toThrow(/variant/);
    // @ts-expect-error — значение по умолчанию не из списка, проверяем и в рантайме
    expect(() => defineFlags({ exp_x_y: variant('nope', ['a', 'b'], 'x') })).toThrow(/вариантов/);
  });
});

describe('без Flipt', () => {
  it('отдаёт значения по умолчанию', async () => {
    const flags = createFlags(defs, { app: 'nodefaults', env: {} });
    expect(await flags.isOn('release_new_home', 'u1')).toBe(false);
    expect(await flags.isOn('kill_payments', 'u1')).toBe(true);
    expect(await flags.variant('exp_cta_text', 'u1')).toBe('control');
    expect(await flags.snapshot('u1')).toEqual({ release_new_home: 'false', kill_payments: 'true', exp_cta_text: 'control' });
  });
});

describe('FliptProvider', () => {
  it('спрашивает Flipt по REST с basic auth из адреса и окружением', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('/boolean') ? ok({ enabled: true }) : ok({ match: true, variantKey: 'bold' }),
    );
    const provider = new FliptProvider({ url: 'https://agent:p%40ss@flags.example.com/', environment: 'production', fetchImpl });
    const flags = createFlags(defs, { app: 'withflipt', provider });

    expect(await flags.isOn('release_new_home', 'u1', { plan: 'pro' })).toBe(true);
    expect(await flags.variant('exp_cta_text', 'u1')).toBe('bold');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://flags.example.com/evaluate/v1/boolean');
    expect((init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from('agent:p@ss').toString('base64')}`);
    expect(JSON.parse(String(init.body))).toMatchObject({
      flagKey: 'release_new_home',
      entityId: 'u1',
      environmentKey: 'production',
      context: { plan: 'pro' },
    });
  });

  it('при падении Flipt помнит последнее значение, а без него — значение по умолчанию', async () => {
    let up = true;
    const fetchImpl = vi.fn(async () => {
      if (!up) throw new Error('down');
      return ok({ enabled: true });
    });
    const flags = createFlags(defs, { app: 'fallback', provider: new FliptProvider({ url: 'https://flags.example.com', fetchImpl }) });
    expect(await flags.isOn('release_new_home', 'u1')).toBe(true);
    up = false;
    expect(await flags.isOn('release_new_home', 'u1')).toBe(true);
    expect(await flags.isOn('release_new_home', 'u2')).toBe(false);
  });

  it('незнакомый вариант заменяется значением по умолчанию', async () => {
    const fetchImpl = vi.fn(async () => ok({ match: true, variantKey: 'weird' }));
    const flags = createFlags(defs, { app: 'weird', provider: new FliptProvider({ url: 'https://f.example.com', fetchImpl }) });
    expect(await flags.variant('exp_cta_text', 'u1')).toBe('control');
  });
});
