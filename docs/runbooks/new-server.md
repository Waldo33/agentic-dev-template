# Новый сервер (переезд или потеря старого)

1. Владелец создаёт VPS (Ubuntu LTS, тот же публичный SSH-ключ `deploy` — его выводит `ssh-add -L` в логе `provision.yml`, или новый по скиллу `bootstrap`).
2. Новый IP → `gh variable set APP_HOST` (или `OBS_HOST`), DNS-записи → новый IP (`scripts/ops.sh dns-check`).
3. `scripts/ops.sh provision - bootstrap`, затем без bootstrap до `changed=0`.
4. **app**: восстановить базу из последней копии — `docs/runbooks/restore.md`. Потом `scripts/ops.sh redeploy`.
5. **obs**: секреты сгенерируются заново → `provision.yml` перерендерит env-файлы приложений; затем `scripts/ops.sh redeploy`, чтобы контейнеры приложений их перечитали. Данные Bugsink, Grafana, Flipt — из копии (`restore.md`); логи и метрики не восстанавливаем.
6. Проверка: `/up` всех приложений, `scripts/ops.sh test-alert`, `backup-now`.
