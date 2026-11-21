# Локальная разработка и проверка в среде агента

```bash
pnpm install
pnpm --filter hello dev                       # без базы: «База не подключена», всё остальное работает
```

## Postgres без Docker (облачная сессия агента)

```bash
mkdir -p /tmp/pgdata && chown postgres /tmp/pgdata
su postgres -s /bin/sh -c "/usr/lib/postgresql/*/bin/initdb -D /tmp/pgdata -A trust -U postgres >/dev/null && \
  /usr/lib/postgresql/*/bin/pg_ctl -D /tmp/pgdata -o '-p 5433 -k /tmp' -l /tmp/pg.log start"
psql -h 127.0.0.1 -p 5433 -U postgres -c "create database hello"
DATABASE_URL=postgres://postgres@127.0.0.1:5433/hello pnpm --filter hello dev
```

## Прод-сборка и e2e как в CI

```bash
pnpm --filter hello build
cd apps/hello && cp -r .next/static .next/standalone/apps/hello/.next/ && cp -r public .next/standalone/apps/hello/
PORT=3124 APP_RELEASE=local DATABASE_URL=postgres://postgres@127.0.0.1:5433/hello node .next/standalone/apps/hello/server.js &
BASE_URL=http://localhost:3124 EXPECT_RELEASE=local PW_CHROMIUM_PATH=/usr/bin/google-chrome pnpm --filter hello e2e
```

Скриншоты — `apps/hello/test-results/**/*.png` (не коммитятся).
