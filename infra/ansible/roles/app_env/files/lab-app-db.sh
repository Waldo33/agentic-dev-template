#!/usr/bin/env bash
# lab-app-db <имя>: создаёт (если нет) пользователя и базу приложения и read-only роль <имя>_ro.
# Пароль приложения — /etc/lab/apps/<имя>.pg (генерируется один раз). Печатает created/exists.
set -euo pipefail
app="$1"
[[ "$app" =~ ^[a-z][a-z0-9-]{1,29}$ ]] || { echo "плохое имя: $app" >&2; exit 1; }
db="${app//-/_}"
pwfile="/etc/lab/apps/${app}.pg"
umask 077
[ -f "$pwfile" ] || openssl rand -hex 24 > "$pwfile"
pw="$(cat "$pwfile")"

psql() { docker exec -i lab-postgres psql -U postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

if [ "$(psql -c "select 1 from pg_database where datname='${db}'")" = "1" ]; then
  psql -c "alter role \"${db}\" with login password '${pw}'" >/dev/null
  echo "exists ${app}"
  exit 0
fi

psql <<SQL
do \$\$ begin
  if not exists (select from pg_roles where rolname = '${db}') then
    create role "${db}" login password '${pw}';
  end if;
  if not exists (select from pg_roles where rolname = '${db}_ro') then
    create role "${db}_ro" login;
  end if;
end \$\$;
alter role "${db}_ro" set default_transaction_read_only = on;
create database "${db}" owner "${db}";
SQL
psql -d "${db}" <<SQL
grant connect on database "${db}" to "${db}_ro";
grant usage on schema public to "${db}_ro";
grant select on all tables in schema public to "${db}_ro";
alter default privileges for role "${db}" in schema public grant select on tables to "${db}_ro";
SQL
echo "created ${app}"
