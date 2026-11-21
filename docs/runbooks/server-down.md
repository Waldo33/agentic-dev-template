# Сервер не отвечает или кончаются ресурсы

1. `scripts/ops.sh status` — что живо, сколько диска и памяти.
2. **Не отвечает SSH** (ops падает на подключении): сервер выключен, завис или сеть. Владельцу: перезагрузить в панели VPS; после — `provision.yml` (идемпотентно вернёт всё на место) и `scripts/ops.sh redeploy`.
3. **Диск > 80%**: логи Docker ограничены ротацией (20 МБ × 5 на контейнер); обычно копятся старые образы. Добавь в `ops.yml` действие `prune` (`docker image prune -af --filter until=168h`) по образцу других и запусти. На obs проверь размер ClickHouse запросом из `queries.md` к `system.parts`.
4. **Память**: какой контейнер ест — `status`. Приложению — лимит `memory` в `config/deploy.yml`; ClickHouse ограничен 60% RAM (`infra/clickhouse/config.d/lab.xml`).
5. **Сервер потерян совсем** — `docs/runbooks/new-server.md`.
