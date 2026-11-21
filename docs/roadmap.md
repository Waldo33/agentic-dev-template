# Дорожная карта платформы

Отмечай `[x]` по мере выполнения. SessionStart-хук показывает первые невыполненные пункты.

## Bootstrap (скилл `bootstrap`)

- [ ] Секреты и переменные GitHub заданы (`APP_HOST`, `OBS_HOST`, `BASE_DOMAIN`, `SSH_PRIVATE_KEY`, `TELEGRAM_*`, `S3_*`, `RESTIC_PASSWORD`, `FLIPT_*`)
- [ ] Защита `main` от force-push и удаления, environment `production`
- [ ] DNS: `*` → app, панели → obs (`ops.yml dns-check`)
- [ ] `provision.yml -f bootstrap=true`, затем повторный прогон с `changed=0`
- [ ] Первый деплой `hello`, verify зелёный
- [ ] Пробная тревога пришла (`ops.yml test-alert`), пароли панелей у владельца
- [ ] Проект `hello` в Bugsink, `ops.yml set-sentry-dsn`
- [ ] Репозиторий флагов с `hello/features.yaml`
- [ ] Первая ночная копия и зелёный `backup-check.yml`
- [ ] Пройти «Требует проверки» в `docs/gotchas.md`

## Дальше

- [ ] Превью веток: `preview.yml` — копия приложения на `pr-N.<имя>.<домен>` со своей базой, удаление при закрытии PR
- [ ] Трейсы: OpenTelemetry SDK в `packages/observability` → OTLP → ClickHouse; HyperDX как интерфейс поиска
- [ ] Пиннинг образов по digest после первого живого развёртывания
- [ ] Tailscale вместо открытого порта 22; единый вход в панели (oauth2-proxy с GitHub)
- [ ] Агент по расписанию: утренний разбор новых ошибок, недельная сводка по идеям, уборка старых флагов
- [ ] GrowthBook поверх ClickHouse, когда понадобятся A/B-тесты со статистикой
- [ ] `templates/static-site` — статика в маленьком образе Caddy
- [ ] Общий вход пользователей (`packages/auth`) и отправка почты по SMTP — по первой идее, которой это нужно
