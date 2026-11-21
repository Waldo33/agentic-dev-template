#!/usr/bin/env bash
# Проверка инфраструктуры без серверов (CI, job «infra»): синтаксис Ansible, рендер шаблонов,
# compose, Vector, Caddy, и живой прогон схемы ClickHouse, прав и скрипта баз Postgres в Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=/tmp/lab-validate
rm -rf "$OUT" && mkdir -p "$OUT"
step() { echo; echo "::group::$1"; }
end() { echo "::endgroup::"; }

step "Ansible: синтаксис"
(cd ansible && ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook site.yml --syntax-check)
end

step "Шаблоны"
python3 scripts/render.py "$OUT"
end

step "docker compose config"
cat > "$OUT/.env" <<'EOF'
CH_ADMIN_PASSWORD=x
CH_WRITER_PASSWORD=x
CH_READER_PASSWORD=x
GRAFANA_ADMIN_PASSWORD=x
BUGSINK_SECRET_KEY=x
BUGSINK_ADMIN_PASSWORD=x
BASE_DOMAIN=lab.example.com
TELEGRAM_BOT_TOKEN=x
TELEGRAM_CHAT_ID=1
POSTGRES_PASSWORD=x
EOF
docker network inspect kamal >/dev/null 2>&1 || docker network create kamal >/dev/null
for f in compose/obs/compose.yml compose/app/postgres.yml compose/vector.yml; do
  docker compose -f "$f" --env-file "$OUT/.env" config -q && echo "ok $f"
done
end

step "Образы существуют"
for img in $(grep -hoE 'image: [^ ]+' compose/obs/compose.yml compose/app/postgres.yml compose/vector.yml | awk '{print $2}' | sort -u); do
  docker pull -q "$img" >/dev/null && echo "ok $img $(docker image inspect --format '{{index .RepoDigests 0}}' "$img")"
done
end

step "Vector: конфиг"
VECTOR_IMAGE=$(awk '/image: timberio/{print $2}' compose/vector.yml)
docker run --rm -v "$OUT/vector.yaml:/etc/vector/vector.yaml:ro" "$VECTOR_IMAGE" validate --no-environment /etc/vector/vector.yaml
end

step "Caddy: конфиг"
docker run --rm -v "$OUT/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
end

step "ClickHouse: пользователи, таблицы, права"
CH_IMAGE=$(awk '/image: clickhouse/{print $2}' compose/obs/compose.yml)
docker rm -f lab-ch-test >/dev/null 2>&1 || true
docker run -d --name lab-ch-test \
  -e CLICKHOUSE_USER=admin -e CLICKHOUSE_PASSWORD=admin -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
  -e CH_WRITER_PASSWORD=writer -e CH_READER_PASSWORD=reader \
  -v "$PWD/clickhouse/init:/docker-entrypoint-initdb.d:ro" \
  -v "$PWD/clickhouse/config.d/lab.xml:/etc/clickhouse-server/config.d/lab.xml:ro" \
  -p 18123:8123 "$CH_IMAGE" >/dev/null
for _ in $(seq 60); do curl -fs "http://localhost:18123/ping" >/dev/null 2>&1 && break; sleep 1; done
sleep 3
# повторный прогон как в Ansible — должен быть идемпотентным
docker exec lab-ch-test bash /docker-entrypoint-initdb.d/00-users.sh
docker exec -i lab-ch-test sh -c 'clickhouse-client --user admin --password admin --multiquery' < clickhouse/init/01-tables.sql
ch() { curl -fsS "http://localhost:18123/?$1" --data-binary @-; }
NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)   # свежие даты: строки старше TTL ClickHouse удаляет сразу
echo '{"ts":"'"$NOW"'","app":"hello","event":"page_view","anon_id":"a1","session_id":"s1","user_id":"","path":"/","props":"{}","flags":{"release_x":"true"},"release":"r1","country":"TR","device":"mobile"}' \
  | ch "user=writer&password=writer&query=INSERT%20INTO%20analytics.events%20FORMAT%20JSONEachRow&async_insert=1&wait_for_async_insert=1&date_time_input_format=best_effort"
echo '{"ts":"'"$NOW"'","host":"app","container":"kamal-proxy","service":"kamal-proxy","level":"info","message":"Request","attrs":"{\"status\":502}"}' \
  | ch "user=writer&password=writer&query=INSERT%20INTO%20logs.container_logs%20FORMAT%20JSONEachRow&date_time_input_format=best_effort"
echo '{"ts":"'"$NOW"'","host":"app","name":"host_load1","tags":{"collector":"load"},"value":0.5}' \
  | ch "user=writer&password=writer&query=INSERT%20INTO%20metrics.host%20FORMAT%20JSONEachRow&date_time_input_format=best_effort"
n=$(echo "SELECT (SELECT count() FROM analytics.events) + (SELECT count() FROM logs.container_logs) + (SELECT count() FROM metrics.host)" | ch "user=reader&password=reader")
[ "$n" = "3" ] || { echo "ожидали 3 строки, получили $n"; exit 1; }
if echo "SELECT 1 FROM system.users" | ch "user=writer&password=writer" >/dev/null 2>&1; then echo "writer не должен читать"; exit 1; fi
if echo "INSERT INTO analytics.events (app) VALUES ('x')" | ch "user=reader&password=reader" >/dev/null 2>&1; then echo "reader не должен писать"; exit 1; fi
echo "ok ClickHouse: схема, writer пишет, reader читает, права разделены"
docker rm -f lab-ch-test >/dev/null
end

step "Postgres: lab-app-db (создание, повтор, read-only роль)"
PG_IMAGE=$(awk '/image: postgres/{print $2}' compose/app/postgres.yml)
docker rm -f lab-postgres >/dev/null 2>&1 || true
docker run -d --name lab-postgres -e POSTGRES_PASSWORD=x "$PG_IMAGE" >/dev/null
for _ in $(seq 30); do docker exec lab-postgres pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
sleep 2
TMP_ETC=$(mktemp -d)
sed "s#/etc/lab/apps#${TMP_ETC}#g" ansible/roles/app_env/files/lab-app-db.sh > "$OUT/lab-app-db.sh"
bash "$OUT/lab-app-db.sh" my-app | grep -q '^created my-app$'
bash "$OUT/lab-app-db.sh" my-app | grep -q '^exists my-app$'
docker exec -i lab-postgres psql -U my_app -d my_app -v ON_ERROR_STOP=1 -q -c "create table t (id int); insert into t values (1);"
docker exec -i lab-postgres psql -U my_app_ro -d my_app -v ON_ERROR_STOP=1 -qtA -c "select count(*) from t" | grep -q '^1$'
if docker exec -i lab-postgres psql -U my_app_ro -d my_app -v ON_ERROR_STOP=1 -q -c "insert into t values (2)" 2>/dev/null; then echo "ro-роль не должна писать"; exit 1; fi
echo "ok Postgres: база, пользователь и read-only роль"
docker rm -f lab-postgres >/dev/null
end

step "Grafana: провижининг дашборда, источника и тревог"
GF_IMAGE=$(awk '/image: grafana/{print $2}' compose/obs/compose.yml)
GF_PROV="$OUT/grafana-provisioning"
cp -r obs/grafana/provisioning "$GF_PROV"
cp "$OUT/grafana-telegram.yml" "$GF_PROV/alerting/telegram.yml"   # как делает Ansible
docker rm -f lab-gf-test >/dev/null 2>&1 || true
docker run -d --name lab-gf-test -p 13000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=validate -e GF_PLUGINS_PREINSTALL=grafana-clickhouse-datasource \
  -e CH_READER_PASSWORD=x \
  -v "$GF_PROV:/etc/grafana/provisioning:ro" \
  -v "$PWD/obs/grafana/dashboards:/var/lib/grafana-dashboards:ro" "$GF_IMAGE" >/dev/null
ok=0
for _ in $(seq 90); do curl -fs http://localhost:13000/api/health >/dev/null 2>&1 && { ok=1; break; }; sleep 2; done
if [ "$ok" != 1 ]; then echo "Grafana не поднялась:"; docker ps -a --filter name=lab-gf-test; docker logs lab-gf-test 2>&1 | tail -60; exit 1; fi
sleep 5
curl -fsS -u "admin:validate" "http://localhost:13000/api/dashboards/uid/lab-apps" | jq -e '.dashboard.panels | length > 5' >/dev/null  # gitleaks:allow — временная Grafana в CI
curl -fsS -u "admin:validate" "http://localhost:13000/api/datasources/uid/clickhouse" | jq -e '.type == "grafana-clickhouse-datasource"' >/dev/null  # gitleaks:allow — временная Grafana в CI
rules=$(curl -fsS -u "admin:validate" "http://localhost:13000/api/v1/provisioning/alert-rules" | jq length)  # gitleaks:allow — временная Grafana в CI
[ "$rules" -ge 3 ] || { echo "тревог $rules, ожидали ≥ 3"; docker logs lab-gf-test | grep -iE 'error|fail' | tail -20; exit 1; }
echo "ok Grafana: дашборд, источник, $rules тревоги"
docker rm -f lab-gf-test >/dev/null
end

echo
echo "Инфраструктура: все проверки пройдены"
