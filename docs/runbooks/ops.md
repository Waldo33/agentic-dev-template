# ops.yml — операции на проде

```bash
gh workflow run ops.yml -f action=<действие> [-f app=<имя>] [-f arg='<аргумент>']
id=$(gh run list --workflow ops.yml -L 1 --json databaseId --jq '.[0].databaseId'); gh run watch "$id"; gh run view "$id" --log
```

| action | app | arg | Что делает |
|---|---|---|---|
| `status` | — | — | uptime, диск, память, контейнеры, таймер бэкапа на обоих серверах |
| `logs` | да | строк (200) | логи запущенного контейнера приложения |
| `restart` | да | — | `docker restart` контейнера, потом `/up` |
| `rollback` | да | sha | `kamal rollback <sha>` (последние 5 версий хранятся на сервере) |
| `sql-readonly` | да | SQL | запрос к базе приложения под ролью `<имя>_ro` (транзакции только для чтения) |
| `clickhouse-query` | — | SQL | запрос к ClickHouse под `reader`, лимит 30 с |
| `backup-now` | — | — | внеочередной бэкап обоих серверов |
| `set-sentry-dsn` | да | DSN | сохранить DSN проекта Bugsink для приложения (применится при деплое) |
| `dns-check` | — | — | куда смотрят поддомены приложений и панелей |
| `test-alert` | — | — | пробное сообщение в Telegram |
| `send-panel-passwords` | — | — | пароли Grafana, Bugsink, Flipt — владельцу в Telegram |

Произвольных команд нет специально. Нужна новая операция — добавь действие в `ops.yml` с проверкой ввода и строку сюда.
