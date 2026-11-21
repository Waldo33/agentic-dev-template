# 0002. Без вендорлока: свои серверы и открытые стандарты

**Решение.** Всё, включая фронтенд, работает на своих VPS. Код говорит только на стандартах:

| Слой | Стандарт в коде | Сейчас за ним | Замена |
|---|---|---|---|
| Приложение | Docker-образ, `GET /up` | Kamal + kamal-proxy | любой хост с Docker |
| База | Postgres | свой Postgres | любой Postgres |
| Ошибки | Sentry SDK + DSN | Bugsink | GlitchTip, Sentry |
| Флаги | OpenFeature | Flipt | любой провайдер OpenFeature |
| Аналитика | `@lab/analytics` (HTTP INSERT) | ClickHouse | любой приёмник |
| Логи | stdout JSON | Vector → ClickHouse | любой сборщик |

**Как держится.** ESLint запрещает `@vercel/*`, `@supabase/*`, SDK вендоров флагов и аналитики, `runtime = 'edge'`, `process.env.VERCEL_*`.

**Цена.** Нет бесплатного CDN и превью веток «из коробки»: статика отдаётся с `immutable`-кэшем, превью — пункт дорожной карты, Cloudflare перед `app` — по мере роста трафика.
