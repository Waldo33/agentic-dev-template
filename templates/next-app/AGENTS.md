# __APP__

Прод: `https://__APP__.<домен>` · база: своя (`DATABASE_URL`) · флаги: namespace `__APP__` · события: `src/lib/events.ts`.

Что это и зачем — `SPEC.md`. Что сделано и что дальше — `PROGRESS.md`. Проверяемые фичи — `features.json`.

## Команды

```bash
pnpm --filter __APP__ dev          # http://localhost:3000 (DATABASE_URL — по желанию)
pnpm --filter __APP__ test         # юнит-тесты
pnpm --filter __APP__ build
BASE_URL=http://localhost:3000 pnpm --filter __APP__ e2e
```

## Устройство

| Где | Что |
|---|---|
| `src/app/page.tsx` | главная |
| `src/app/up/route.ts` | `/up` — живость для kamal-proxy, Gatus и verify |
| `src/app/%5F/e`, `src/app/%5F/err` | `/_/e` — приём аналитики, `/_/err` — туннель ошибок браузера |
| `src/lib/flags.ts` | флаги со значениями по умолчанию |
| `src/lib/events.ts` | каталог событий аналитики |
| `migrations/` | SQL-миграции, накатываются при старте (`src/instrumentation.ts`) |
| `config/deploy.yml` | Kamal: домен, лимиты, healthcheck |

## Грабли этого приложения

- (пока нет — дописывай сюда то, на что наступил)
