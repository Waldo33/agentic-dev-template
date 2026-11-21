# Agentic dev template

Шаблон «лаборатории идей»: пишешь агенту в чат, что сделать, — он меняет код, пушит в `main`, а GitHub Actions тестирует и выкатывает на **твои** серверы. Каждая идея — свой поддомен, своя база, ошибки, аналитика и фича-флаги с первого дня. Без вендорлока: Docker, Postgres, Kamal, ClickHouse, Grafana, Bugsink, Flipt, Gatus.

```
ты ──чат──▶ агент ──push──▶ GitHub Actions: проверки → образ → e2e → деплой без простоя → проверка прода → откат
                                                                                     │
                       app-сервер: приложения + Postgres ◀───────────────────────────┘
                       obs-сервер: ClickHouse · Grafana · Bugsink · Gatus · Flipt ──▶ Telegram
```

## Как начать

1. **Use this template** → свой репозиторий (лучше приватный).
2. Подключи его к Claude Code (claude.ai/code). В настройках облачной среды по желанию: переменные `LAB_GIT_NAME`, `LAB_GIT_EMAIL` (автор коммитов) и сетевой доступ Custom с `*.<твой домен>`, чтобы агент сам видел прод.
3. Напиши агенту: **«настрой лабораторию»**. Он запустит скилл `bootstrap` и попросит то, что может дать только ты:
   - две VPS с Ubuntu LTS: `app` (от 2 vCPU / 4 ГБ) и `obs` (4 vCPU / 8 ГБ) — `obs` можно добавить позже;
   - домен и доступ к его DNS;
   - Telegram-бота (@BotFather) и чат для уведомлений;
   - S3-бакет для копий у другого провайдера или в другом регионе;
   - пустой приватный репозиторий для фича-флагов и токен на запись в него.
4. Дальше просто пиши: «новая идея: …», «добавь …», «почему лагает …».

Без серверов шаблон тоже работает: CI проверяет код, собирает образы и гоняет e2e, деплой включается, когда появятся `APP_HOST` и `BASE_DOMAIN`.

## Что внутри

| | |
|---|---|
| `AGENTS.md`, `CLAUDE.md` | правила и рабочий цикл агента |
| `.claude/` | хуки (подготовка сессии, запрет опасных команд, проверки перед концом хода), скиллы `bootstrap` `new-app` `ship` `ops` `db-migration` `incident`, агенты `reviewer` `qa` `researcher` |
| `apps/hello` | пример идеи — проверка всего конвейера |
| `templates/next-app` | шаблон новой идеи: Next.js, Postgres с миграциями, ошибки, аналитика, флаги, e2e, Kamal |
| `packages/*` | общие пакеты: наблюдаемость, аналитика, флаги |
| `infra/` | Ansible, compose, ClickHouse, Grafana (дашборд и тревоги), Gatus, Flipt, Vector |
| `.github/workflows` | `pipeline`, `provision`, `ops`, `watchdog`, `backup-check` |
| `docs/` | архитектура, грабли, дорожная карта, решения, ранбуки |

## Локально

```bash
corepack enable && pnpm install
pnpm check                  # то же, что CI
pnpm --filter hello dev     # http://localhost:3000
pnpm new-app my-idea        # новая идея
```

Подробности — `docs/architecture.md`, состояние — `docs/roadmap.md`.
