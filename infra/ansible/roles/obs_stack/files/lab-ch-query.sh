#!/usr/bin/env bash
# lab-ch-query: SQL со stdin → ClickHouse под пользователем reader (только чтение, 30 с). Для ops.yml.
set -euo pipefail
# shellcheck disable=SC1091
. /etc/lab/obs/secrets.env
docker exec -i lab-clickhouse clickhouse-client --user reader --password "$CH_READER_PASSWORD" \
  --readonly 1 --max_execution_time 30 --format PrettyCompactMonoBlock
