# Ротация секретов

| Секрет | Как |
|---|---|
| `SSH_PRIVATE_KEY` | новая пара (скилл `bootstrap`, шаг 2) → `gh secret set` → `provision.yml` положит новый публичный ключ `deploy` |
| `TELEGRAM_*`, `S3_*`, `FLIPT_GIT_TOKEN` | владелец обновляет в GitHub → `provision.yml` |
| `RESTIC_PASSWORD` | только вместе с `restic key add/remove` на обоих серверах — иначе старые копии не прочитать |
| Внутренние (Postgres, ClickHouse, Grafana, Bugsink, панели) | удалить строку из `/etc/lab/obs/secrets.env` (и `hashes.env` для паролей панелей) или `/etc/lab/apps/<имя>.pg` → `provision.yml` сгенерирует новый и перерендерит конфиги → `scripts/ops.sh redeploy` |

Утечка подозревается — сначала ротация, потом разбор (скилл `incident`).
