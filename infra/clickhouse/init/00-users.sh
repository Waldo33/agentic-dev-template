#!/bin/bash
# Пользователи ClickHouse. Выполняется при первом старте и при каждом provision (идемпотентно).
#   writer — только INSERT в логи, метрики и аналитику (Vector, приложения)
#   reader — только SELECT (Grafana, ops.yml для агента)
set -euo pipefail
q() { clickhouse-client --user admin --password "${CLICKHOUSE_PASSWORD}" --multiquery -q "$1"; }

q "
CREATE DATABASE IF NOT EXISTS logs;
CREATE DATABASE IF NOT EXISTS metrics;
CREATE DATABASE IF NOT EXISTS analytics;
CREATE USER IF NOT EXISTS writer IDENTIFIED WITH sha256_password BY '${CH_WRITER_PASSWORD}';
ALTER USER writer IDENTIFIED WITH sha256_password BY '${CH_WRITER_PASSWORD}';
CREATE USER IF NOT EXISTS reader IDENTIFIED WITH sha256_password BY '${CH_READER_PASSWORD}' SETTINGS readonly = 1;
ALTER USER reader IDENTIFIED WITH sha256_password BY '${CH_READER_PASSWORD}' SETTINGS readonly = 1;
"
