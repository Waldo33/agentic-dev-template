# Восстановление из копии

Копии: restic в S3, репозиторий `s3:<S3_ENDPOINT>/<S3_BUCKET>/<app|obs>`, пароль — `RESTIC_PASSWORD` (у владельца в менеджере паролей).

Проверка, что копии восстанавливаются, — `backup-check.yml` каждую неделю.

## Postgres на app

Необратимо перезаписывает данные — только с явного «да» владельца. Сначала `scripts/ops.sh backup-now` (копия текущего состояния).

На сервере (через новое действие `ops.yml` по образцу или вручную владельцем):

```bash
sudo -i
set -a; . /etc/lab/backup.env; set +a
restic snapshots --tag postgres --host app
restic dump --tag postgres --host app latest /postgres.sql > /tmp/restore.sql
docker exec -i lab-postgres psql -U postgres -f - < /tmp/restore.sql
rm /tmp/restore.sql
```

`pg_dumpall` содержит роли и все базы; на чистом сервере после этого перезапусти `scripts/ops.sh provision - app_env` — пароли ролей вернутся к значениям из `/etc/lab/apps/*.pg`.

## Данные obs

```bash
restic restore latest --tag obs-data --host obs --target /
docker compose --project-directory /opt/lab/obs restart
```

Аналитика: `restic dump --tag analytics --host obs latest /analytics-events.native | docker exec -i lab-clickhouse clickhouse-client --user admin --password … -q "INSERT INTO analytics.events FORMAT Native"`.
