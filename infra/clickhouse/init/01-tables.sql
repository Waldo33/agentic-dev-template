-- Таблицы наблюдаемости и аналитики. Только CREATE … IF NOT EXISTS: файл выполняется при каждом provision.
-- Менять схему — новыми ALTER … ADD COLUMN IF NOT EXISTS в конце файла (расширяющие изменения).

-- Логи контейнеров (Vector, сервер app и obs). Хранение 14 дней.
CREATE TABLE IF NOT EXISTS logs.container_logs
(
    ts        DateTime64(3) CODEC(Delta, ZSTD),
    host      LowCardinality(String),
    container LowCardinality(String),
    service   LowCardinality(String),
    level     LowCardinality(String),
    message   String CODEC(ZSTD(3)),
    attrs     String CODEC(ZSTD(3)),
    INDEX idx_message message TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4
)
ENGINE = MergeTree
PARTITION BY toDate(ts)
ORDER BY (service, level, ts)
TTL toDateTime(ts) + INTERVAL 14 DAY;

-- Метрики хостов (Vector host_metrics). Хранение 90 дней.
CREATE TABLE IF NOT EXISTS metrics.host
(
    ts    DateTime64(3) CODEC(Delta, ZSTD),
    host  LowCardinality(String),
    name  LowCardinality(String),
    tags  Map(LowCardinality(String), String),
    value Float64 CODEC(Gorilla, ZSTD)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (host, name, ts)
TTL toDateTime(ts) + INTERVAL 90 DAY;

-- Продуктовые события (packages/analytics). Хранение 2 года.
CREATE TABLE IF NOT EXISTS analytics.events
(
    ts         DateTime64(3) CODEC(Delta, ZSTD),
    app        LowCardinality(String),
    event      LowCardinality(String),
    anon_id    String,
    session_id String,
    user_id    String,
    path       String,
    props      String CODEC(ZSTD(3)),
    flags      Map(LowCardinality(String), String),
    release    LowCardinality(String),
    country    LowCardinality(String),
    device     LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (app, event, ts)
TTL toDateTime(ts) + INTERVAL 2 YEAR;

-- Права: писать — только сюда, читать — всё прикладное.
GRANT INSERT ON logs.container_logs TO writer;
GRANT INSERT ON metrics.host TO writer;
GRANT INSERT ON analytics.events TO writer;
GRANT SELECT ON logs.* TO reader;
GRANT SELECT ON metrics.* TO reader;
GRANT SELECT ON analytics.* TO reader;
