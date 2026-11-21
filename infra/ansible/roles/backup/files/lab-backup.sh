#!/usr/bin/env bash
# Бэкап в S3 через restic. Запускается таймером ночью и вручную: ops.yml action=backup-now.
# Хранение: 7 дневных, 4 недельных, 6 месячных. После успеха — пульс в Gatus (иначе через 26 ч тревога).
set -euo pipefail
: "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD:?}"

restic cat config >/dev/null 2>&1 || restic init

case "${HOST_ROLE:-}" in
  app)
    docker exec lab-postgres pg_dumpall -U postgres \
      | restic backup --stdin --stdin-filename postgres.sql --tag postgres --host app
    ;;
  obs)
    restic backup --tag obs-data --host obs \
      /var/lib/lab/obs/bugsink /var/lib/lab/obs/grafana /var/lib/lab/obs/gatus /var/lib/lab/obs/flipt /etc/lab/obs
    docker exec lab-clickhouse sh -c 'clickhouse-client --user admin --password "$CLICKHOUSE_PASSWORD" -q "SELECT * FROM analytics.events FORMAT Native"' \
      | restic backup --stdin --stdin-filename analytics-events.native --tag analytics --host obs
    ;;
  *)
    echo "HOST_ROLE не задан" >&2
    exit 1
    ;;
esac

restic forget --prune --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --host "${HOST_ROLE}"

if [ -n "${GATUS_TOKEN:-}" ]; then
  key=$(printf '%s' "$GATUS_KEY" | jq -sRr @uri)
  curl -fsS -X POST -H "Authorization: Bearer ${GATUS_TOKEN}" \
    "${GATUS_URL}/api/v1/endpoints/${key}/external?success=true" >/dev/null || echo "пульс в Gatus не ушёл" >&2
fi
echo "бэкап ${HOST_ROLE} готов"
