# Новый сервер (переезд или потеря старого)

1. Владелец создаёт VPS (Ubuntu LTS, тот же публичный SSH-ключ `deploy` — его выводит `ssh-add -L` в логе `provision.yml`, или новый по скиллу `bootstrap`).
2. Новый IP → `gh variable set APP_HOST` (или `OBS_HOST`), DNS-записи → новый IP (`ops.yml dns-check`).
3. `gh workflow run provision.yml -f bootstrap=true`, затем без bootstrap до `changed=0`.
4. **app**: восстановить базу из последней копии — `docs/runbooks/restore.md`. Потом `gh workflow run pipeline.yml -f all=true`.
5. **obs**: секреты сгенерируются заново → `provision.yml` перерендерит env-файлы приложений; затем `pipeline.yml -f all=true`, чтобы контейнеры приложений их перечитали. Данные Bugsink, Grafana, Flipt — из копии (`restore.md`); логи и метрики не восстанавливаем.
6. Проверка: `/up` всех приложений, `ops.yml test-alert`, `backup-now`.
