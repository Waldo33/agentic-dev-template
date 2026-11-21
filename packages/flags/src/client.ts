import { OpenFeature, type Client, type Provider } from '@openfeature/server-sdk';
import type { FlagDefs } from './define';
import { FliptProvider } from './flipt';

type BoolKeys<T extends FlagDefs> = { [K in keyof T]: T[K]['kind'] extends 'boolean' ? K : never }[keyof T] & string;
type VariantKeys<T extends FlagDefs> = { [K in keyof T]: T[K]['kind'] extends 'variant' ? K : never }[keyof T] & string;

export interface Flags<T extends FlagDefs> {
  isOn(key: BoolKeys<T>, entityId: string, context?: Record<string, string>): Promise<boolean>;
  variant(key: VariantKeys<T>, entityId: string, context?: Record<string, string>): Promise<string>;
  /** Все флаги пользователя строками — для аналитики (колонка flags) и для передачи в браузер. */
  snapshot(entityId: string, context?: Record<string, string>): Promise<Record<string, string>>;
}

/**
 * Типизированный доступ к флагам поверх OpenFeature. Провайдер по умолчанию — Flipt из FLIPT_URL;
 * без FLIPT_URL все флаги возвращают значения по умолчанию (локально, в CI).
 */
export function createFlags<const T extends FlagDefs>(
  defs: T,
  opts: { app: string; provider?: Provider; env?: Record<string, string | undefined> } = { app: 'default' },
): Flags<T> {
  const env = opts.env ?? process.env;
  const provider =
    opts.provider ??
    (env.FLIPT_URL
      ? new FliptProvider({ url: env.FLIPT_URL, environment: env.FLIPT_ENVIRONMENT, namespace: env.FLIPT_NAMESPACE ?? opts.app, token: env.FLIPT_TOKEN })
      : undefined);
  // Отдельный домен OpenFeature на приложение: в одном процессе не смешиваются флаги разных провайдеров.
  if (provider) OpenFeature.setProvider(opts.app, provider);
  const client: Client = OpenFeature.getClient(opts.app);

  const def = (key: string) => {
    const d = defs[key];
    if (!d) throw new Error(`Флаг ${key} не объявлен в flags.ts`);
    return d;
  };

  const api: Flags<T> = {
    async isOn(key, entityId, context = {}) {
      const d = def(key);
      return client.getBooleanValue(key, d.default as boolean, { targetingKey: entityId, ...context });
    },
    async variant(key, entityId, context = {}) {
      const d = def(key);
      if (d.kind !== 'variant') return String(d.default);
      const v = await client.getStringValue(key, d.default, { targetingKey: entityId, ...context });
      return d.variants.includes(v) ? v : d.default;
    },
    async snapshot(entityId, context = {}) {
      const out: Record<string, string> = {};
      await Promise.all(
        Object.entries(defs).map(async ([key, d]) => {
          out[key] =
            d.kind === 'boolean'
              ? String(await client.getBooleanValue(key, d.default, { targetingKey: entityId, ...context }))
              : await api.variant(key as VariantKeys<T>, entityId, context);
        }),
      );
      return out;
    },
  };
  return api;
}
