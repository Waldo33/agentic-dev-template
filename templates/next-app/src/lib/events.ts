import { defineEvents } from '@lab/analytics';

/**
 * Каталог событий. Сервер принимает только их. Базовые есть в каждом приложении;
 * `activation` — ключевое действие из SPEC.md (то, ради чего продукт существует).
 */
export const events = defineEvents(['page_view', 'signup', 'activation', 'share', 'error_shown', 'hello_click']);

export type AppEvent = (typeof events.names)[number];
