import { bool, createFlags, defineFlags } from '@lab/flags';

/**
 * Флаги приложения. Значение по умолчанию работает, пока флага нет во Flipt или Flipt недоступен.
 * Сами флаги живут в репозитории флагов (namespace = имя приложения), меняются в панели или коммитом.
 */
export const flagDefs = defineFlags({
  release_greeting_v2: bool(false, 'Новое приветствие на главной'),
});

export const flags = createFlags(flagDefs, { app: 'hello' });
