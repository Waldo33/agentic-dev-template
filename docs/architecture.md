# Архитектура

## Поток «сообщение → прод»

```
владелец ──чат──▶ агент (Claude Code, облако) ──push main──▶ GitHub
                                                               │
                                          pipeline.yml ◀───────┘
   plan → check → build (образ) → e2e против контейнера → prepare (Ansible: базы, env, Gatus)
        → deploy (Kamal, без простоя) → verify (/up = sha, смоук на телефоне) → rollback? → Telegram
```

Агент трогает только GitHub. На серверы код и конфигурация попадают только из Actions (SSH-ключ в environment `production`).

## Серверы

| Сервер | Что крутится | Наружу |
|---|---|---|
| `app` | kamal-proxy (HTTPS, маршрутизация по поддомену, бесшовная смена версий), контейнеры `apps/*`, Postgres `lab-postgres` (сеть `kamal`), Vector, таймер бэкапа | 22, 80, 443 |
| `obs` | Caddy, ClickHouse, Grafana, Bugsink, Gatus, Flipt, Vector, таймер бэкапа | 22, 80, 443 |

Без `OBS_HOST` всё работает, но без логов, метрик, аналитики в ClickHouse, флагов (значения по умолчанию) и ошибок в Bugsink.

## Приложение (`templates/next-app`)

- Next.js `output: 'standalone'` → образ `node:22-alpine`, пользователь uid 1001.
- `src/instrumentation.ts`: при старте — Sentry SDK (если `SENTRY_DSN`) и миграции из `migrations/`. Упала миграция — контейнер не стартует, Kamal не переключает трафик.
- `/up` — живость + релиз + состояние базы. `/_/e` — приём событий. `/_/err` — туннель ошибок браузера в Bugsink.
- Секреты: `/etc/lab/apps/<имя>.env` на сервере (роль `app_env`) монтируется в `/run/secrets/app.env`, его читает `docker-entrypoint.sh`. В образе и в GitHub секретов приложения нет.

## Данные наблюдаемости (ClickHouse на `obs`)

| Таблица | Откуда | Хранение |
|---|---|---|
| `logs.container_logs` | Vector: логи всех контейнеров; `service` = метка Kamal (`lab-<имя>`), JSON-логи pino разобраны на `level`/`message`, исходник — в `attrs` | 14 дней |
| `metrics.host` | Vector `host_metrics`: CPU, память, диск, load, сеть | 90 дней |
| `analytics.events` | `packages/analytics` → HTTP INSERT с async_insert | 2 года |

Пользователи ClickHouse: `writer` (только INSERT в эти три таблицы), `reader` (только SELECT; Grafana и `ops.yml`), `admin`. HTTP ClickHouse (`ch.<домен>`) открыт только для IP наших серверов.

## Ошибки

Sentry SDK (стандарт) → Bugsink. Сервер: `@sentry/node` в `instrumentation.ts` + `onRequestError`. Браузер: `@sentry/browser` с `tunnel: '/_/err'`; DSN приходит с сервера при рендере (`layout.tsx`), поэтому образ один для всех окружений. Проект в Bugsink и DSN — `ops.yml set-sentry-dsn`.

## Флаги

`packages/flags`: флаги объявлены в коде со значением по умолчанию → OpenFeature → провайдер Flipt (REST `/evaluate/v1/*`, basic auth через Caddy). Flipt v2 хранит флаги в git-репозитории флагов; панель пишет коммиты. Flipt недоступен → последнее известное значение → значение по умолчанию.

## Тревоги

- Gatus: `/up` каждого приложения, панели, сертификаты, пульс бэкапов → Telegram.
- Grafana: 5xx по логам kamal-proxy, диск > 80%, сервер замолчал → Telegram.
- `watchdog.yml` (GitHub, каждые 10 мин): статус-страница и `/up` — следит за самим `obs`.
- `pipeline.yml`: итог каждого деплоя и откаты → Telegram, провал → issue `incident`.
