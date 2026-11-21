# Грабли и решения

Каждая запись — то, на что уже наступили. Лучше всего грабля превращается в тест, хук или правило линтера; сюда — то, что так не ловится.

## Next.js

- `export const runtime = 'edge'` и `@vercel/*` запрещены линтером: привязка к платформе.
- Папки с `_` в `app/` — приватные и не становятся адресами. Адрес `/_/e` — папка `%5F/e`.
- `path.join(process.cwd(), …)` в серверном коде заставляет Turbopack тащить в standalone весь проект — помечать `/*turbopackIgnore: true*/` и класть нужные файлы через `outputFileTracingIncludes`.
- `instrumentation.ts` собирается и для edge — в общем серверном коде не использовать `process.uptime()` и другие Node-only API на верхнем уровне.
- Свои `Cache-Control` на `/_next/static` не ставить: Next.js уже отдаёт `immutable`, а свой заголовок ломает dev.

## Grafana

- Подстановка `$VAR` в провижининге Grafana превращает цифровой ID чата Telegram в число даже в кавычках — провижининг тревог падает, Grafana не стартует. Поэтому `telegram.yml` рендерит Ansible (`infra/obs/grafana-telegram.yml.j2`) со значениями-строками.

## Sentry SDK

- В v11 нет опции `sendDefaultPii` (заменена на `dataCollection`); по умолчанию персональные данные не собираются.

## Среда агента

- Docker Hub, CDN Playwright и большинство сайтов из облачной сессии недоступны. Образы и e2e в Chromium проверяет CI. Локально e2e: системный Chrome через `PW_CHROMIUM_PATH=/usr/bin/google-chrome`.
- Postgres локально без Docker: `/usr/lib/postgresql/*/bin/initdb` + `pg_ctl` от пользователя `postgres` (см. `docs/runbooks/local-dev.md`).
- SSH на серверы из сессии нет — только `ops.yml` и `provision.yml`.
- `gh run download` из сессии не работает: артефакты лежат в хранилище Azure, оно закрыто. Ошибки — из `gh run view --log-failed`, скриншоты — воспроизведением e2e локально.
- Настройки репозитория (`is_template`, описание, environments, защита веток) и секреты из сессии не меняются — это делает владелец в интерфейсе GitHub по списку из скилла `bootstrap`.
- `workflow_dispatch` из сессии запрещён («Resource not accessible by integration»): workflow вручную не запустить. Операции — через issue `ops: …` (`scripts/ops.sh`), а `ops.yml` уже своим токеном запускает `pipeline` и `provision`.
- GraphQL GitHub из сессии закрыт: `gh repo view`, `gh issue list/create`, `gh pr create`, `gh workflow run` не работают. Работают `gh api` (REST), `gh run list/view/watch`.

## Требует проверки на первом живом развёртывании

Эти места написаны по документации, но на настоящих серверах ещё не проверены. Проверил — убери пункт или перенеси в раздел выше.

- Поля JSON-логов kamal-proxy (`status`, `host`, `target`) в тревоге 5xx и на дашборде.
- Формат флагов Flipt v2 (`infra/flags-repo/example/features.yaml`) и ответ `/evaluate/v1/*` с `environmentKey`.
- Gatus: `external-endpoints` с `heartbeat` и ключ `backups_backup-<host>` для пульса бэкапов.
- Bugsink: переменные `BEHIND_HTTPS_PROXY`, `BASE_URL`, хранение в `/data`.
- Метрика `host_filesystem_used_ratio` Vector внутри контейнера отражает диск хоста (overlay на том же разделе).
