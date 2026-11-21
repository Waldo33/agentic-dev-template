/**
 * Флаги объявляются в коде приложения (`src/flags.ts`) со значением по умолчанию —
 * оно работает, пока Flipt недоступен или флаг ещё не создан. Префикс имени задаёт тип:
 * release_* — временный выкат, kill_* — выключатель, exp_* — эксперимент, config_* — настройка.
 */
export interface BoolFlag {
  kind: 'boolean';
  default: boolean;
  description: string;
}
export interface VariantFlag {
  kind: 'variant';
  default: string;
  variants: readonly string[];
  description: string;
}
export type FlagDef = BoolFlag | VariantFlag;

export type FlagDefs = Record<string, FlagDef>;

export const bool = (defaultValue: boolean, description: string): BoolFlag => ({ kind: 'boolean', default: defaultValue, description });

export const variant = <const V extends readonly string[]>(defaultValue: V[number], variants: V, description: string): VariantFlag => ({
  kind: 'variant',
  default: defaultValue,
  variants,
  description,
});

const NAME = /^(release|kill|exp|config)_[a-z0-9_]{2,60}$/;

export function defineFlags<const T extends FlagDefs>(defs: T): T {
  for (const [key, def] of Object.entries(defs)) {
    if (!NAME.test(key)) throw new Error(`Флаг ${key}: имя должно начинаться с release_/kill_/exp_/config_ и быть в snake_case`);
    if (def.kind === 'variant' && !def.variants.includes(def.default)) throw new Error(`Флаг ${key}: значения по умолчанию нет среди вариантов`);
    if (key.startsWith('exp_') && def.kind !== 'variant') throw new Error(`Флаг ${key}: эксперимент должен быть variant`);
  }
  return defs;
}
