import {
  ErrorCode,
  StandardResolutionReasons,
  type EvaluationContext,
  type JsonValue,
  type Provider,
  type ResolutionDetails,
} from '@openfeature/server-sdk';

export interface FliptOptions {
  /** Адрес Flipt, например https://flags.example.com. Логин и пароль basic auth можно указать прямо в адресе. */
  url: string;
  environment?: string;
  namespace?: string;
  /** Bearer-токен Flipt (если включена его собственная авторизация). */
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * OpenFeature-провайдер для Flipt v2 (REST: POST /evaluate/v1/boolean и /variant).
 * Если Flipt недоступен — отдаёт последнее известное значение, а без него — значение по умолчанию:
 * упавший `obs` не должен ронять приложения.
 */
export class FliptProvider implements Provider {
  readonly metadata = { name: 'flipt' } as const;
  readonly runsOn = 'server' as const;
  private readonly base: string;
  private readonly headers: Record<string, string>;
  private readonly lastKnown = new Map<string, boolean | string>();

  constructor(private readonly opts: FliptOptions) {
    const u = new URL(opts.url);
    this.headers = { 'content-type': 'application/json' };
    if (u.username) {
      const creds = `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
      this.headers.authorization = `Basic ${Buffer.from(creds).toString('base64')}`;
      u.username = '';
      u.password = '';
    }
    if (opts.token) this.headers.authorization = `Bearer ${opts.token}`;
    this.base = u.toString().replace(/\/$/, '');
  }

  private async evaluate(kind: 'boolean' | 'variant', flagKey: string, context: EvaluationContext): Promise<Record<string, unknown>> {
    const { targetingKey, ...rest } = context;
    const ctx: Record<string, string> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined && v !== null) ctx[k] = String(v);
    const res = await (this.opts.fetchImpl ?? fetch)(`${this.base}/evaluate/v1/${kind}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        namespaceKey: this.opts.namespace ?? 'default',
        environmentKey: this.opts.environment ?? 'production',
        flagKey,
        entityId: targetingKey || 'anonymous',
        context: ctx,
      }),
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 800),
    });
    if (!res.ok) throw new Error(`Flipt ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  }

  private fallback<T extends boolean | string>(key: string, defaultValue: T, e: unknown): ResolutionDetails<T> {
    const known = this.lastKnown.get(key);
    if (known !== undefined && typeof known === typeof defaultValue) {
      return { value: known as T, reason: StandardResolutionReasons.CACHED };
    }
    return {
      value: defaultValue,
      reason: StandardResolutionReasons.ERROR,
      errorCode: ErrorCode.GENERAL,
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }

  async resolveBooleanEvaluation(flagKey: string, defaultValue: boolean, context: EvaluationContext): Promise<ResolutionDetails<boolean>> {
    const key = `${flagKey}|${context.targetingKey ?? ''}`;
    try {
      const r = await this.evaluate('boolean', flagKey, context);
      if (typeof r.enabled !== 'boolean') throw new Error('нет поля enabled');
      this.lastKnown.set(key, r.enabled);
      return { value: r.enabled, reason: StandardResolutionReasons.TARGETING_MATCH };
    } catch (e) {
      return this.fallback(key, defaultValue, e);
    }
  }

  async resolveStringEvaluation(flagKey: string, defaultValue: string, context: EvaluationContext): Promise<ResolutionDetails<string>> {
    const key = `${flagKey}|${context.targetingKey ?? ''}`;
    try {
      const r = await this.evaluate('variant', flagKey, context);
      if (!r.match || typeof r.variantKey !== 'string' || !r.variantKey) {
        return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT };
      }
      this.lastKnown.set(key, r.variantKey);
      return { value: r.variantKey, variant: r.variantKey, reason: StandardResolutionReasons.TARGETING_MATCH };
    } catch (e) {
      return this.fallback(key, defaultValue, e);
    }
  }

  async resolveNumberEvaluation(_flagKey: string, defaultValue: number): Promise<ResolutionDetails<number>> {
    return { value: defaultValue, reason: StandardResolutionReasons.ERROR, errorCode: ErrorCode.TYPE_MISMATCH };
  }

  async resolveObjectEvaluation<T extends JsonValue>(_flagKey: string, defaultValue: T): Promise<ResolutionDetails<T>> {
    return { value: defaultValue, reason: StandardResolutionReasons.ERROR, errorCode: ErrorCode.TYPE_MISMATCH };
  }
}
