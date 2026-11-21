---
name: bootstrap
description: Первая настройка свежей копии шаблона — проверить, что есть, собрать у владельца недостающие доступы, включить защиту main, подготовить серверы и сделать первый деплой hello. Использовать, когда репозиторий только что создан из шаблона или владелец пишет «настрой», «подключи сервер», «почему не деплоится».
---

# Bootstrap: от копии шаблона до первого деплоя

Цель — `https://hello.<домен>/up` отдаёт sha последнего коммита, тревога пробно пришла в Telegram. Владелец пишет с телефона: спрашивай только то, что можешь получить лишь от него, одним списком.

## 1. Что уже есть (без вопросов)

Из облачной сессии читать можно, а менять настройки репозитория (секреты, environment, защиту веток) и запускать workflow вручную — обычно нельзя. Это делает владелец в интерфейсе GitHub по твоему точному списку; запуск — через `scripts/ops.sh`.

```bash
gh api repos/{owner}/{repo} --jq '{name: .full_name, template: .is_template, default: .default_branch}'
gh api repos/{owner}/{repo}/actions/variables --jq '.variables[].name'
gh api repos/{owner}/{repo}/environments --jq '.environments[].name'
gh api repos/{owner}/{repo}/environments/production/secrets --jq '.secrets[].name' 2>/dev/null
gh api repos/{owner}/{repo}/actions/secrets --jq '.secrets[].name'
```

Сравни со списком ниже. Отметь в `docs/roadmap.md › Bootstrap`, что уже готово.

| Что | Где (Settings) | Кто даёт |
|---|---|---|
| `APP_HOST`, `OBS_HOST` (IP серверов) | Secrets and variables › Actions › Variables | владелец |
| `BASE_DOMAIN` (например `lab.example.com`), `ACME_EMAIL` | Variables | владелец |
| `IMAGE_ARCH` (`amd64` или `arm64`) | Variables | по ответу владельца о сервере; по умолчанию `amd64` |
| `FLIPT_GIT_REMOTE` (`https://github.com/<владелец>/lab-flags.git`) | Variables | владелец создаёт пустой приватный репозиторий |
| `SSH_PRIVATE_KEY` | Environments › production › Secrets | см. шаг 2 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | production › Secrets | владелец (@BotFather; ID чата — например, через @userinfobot) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | production › Secrets | владелец (бакет у другого провайдера или в другом регионе) |
| `RESTIC_PASSWORD` | production › Secrets | владелец придумывает (или генерирует менеджером паролей) и **сохраняет у себя** — без него копии не прочитать |
| `FLIPT_GIT_TOKEN` | production › Secrets | fine-grained токен: Contents read/write только на репозиторий флагов |

Владельцу одним сообщением: что создать (VPS, домен, бот, бакет, репозиторий флагов), куда вписать каждое значение (таблица выше, с путём в Settings), и ещё две настройки в интерфейсе:
- Settings › Environments › **New environment** `production`;
- Settings › Rules › Rulesets › новая для `main`: запретить force push и удаление.

## 2. SSH-ключ

Приватный ключ в чат не пишем. Варианты по удобству владельца:

- **Владелец генерирует сам** (на компьютере): `ssh-keygen -t ed25519 -N '' -C deploy@lab -f lab_deploy`, содержимое `lab_deploy` → секрет `SSH_PRIVATE_KEY`, строка из `lab_deploy.pub` → в панели VPS как SSH-ключ root на обоих серверах.
- **Владелец только с телефона**: многие панели VPS умеют создать ключ сами и показать приватную часть один раз — её в секрет, публичная уже на сервере.

Первый прогон provision заходит под root и создаёт пользователя `deploy` с тем же ключом, дальше root не нужен и вход под ним закрывается.

## 3. DNS (владелец или агент, если дали токен DNS)

`*.<BASE_DOMAIN>` → `APP_HOST`; `grafana errors flags status ch home` `.<BASE_DOMAIN>` → `OBS_HOST`. Проверка: `scripts/ops.sh dns-check`.

## 4. Серверы

```bash
scripts/ops.sh provision - bootstrap      # первый раз: заходит под root
gh run list --workflow provision.yml -L 1  # id запуска; gh run watch <id>
scripts/ops.sh provision                  # второй прогон: в сводке changed=0
```

Красное — `gh run view <id> --log-failed`, чини роль, повторяй. Приёмка: `changed=0`, открыты только 22/80/443.

## 5. Первый деплой

`scripts/ops.sh redeploy` → `gh run list --workflow pipeline.yml -L 1` → `gh run watch <id>`. Приёмка: verify зелёный, `https://hello.<домен>/up` отдаёт sha.

## 6. Ошибки, флаги, тревоги

- Bugsink: владелец входит в `errors.<домен>` (пароль — шаг 7), создаёт проект `hello`, присылает DSN → `scripts/ops.sh set-sentry-dsn hello '<DSN>'` → `scripts/ops.sh redeploy`.
- Флаги: подключи репозиторий флагов к сессии (`add_repo`), положи `hello/features.yaml` из `infra/flags-repo/example/`.
- Пробная тревога: `scripts/ops.sh test-alert`.

## 7. Отчёт

Владельцу — что заработало: ссылки на `hello`, Grafana, Bugsink, Flipt и статус-страницу. Пароли панелей генерирует Ansible на сервере; в логи Actions их не выводим (логи видят все, у кого есть доступ к репозиторию). Владелец получает их в Telegram: `scripts/ops.sh send-panel-passwords`. Отметь этапы в `docs/roadmap.md`.
