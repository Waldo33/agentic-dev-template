---
name: bootstrap
description: Первая настройка свежей копии шаблона — проверить, что есть, собрать у владельца недостающие доступы, включить защиту main, подготовить серверы и сделать первый деплой hello. Использовать, когда репозиторий только что создан из шаблона или владелец пишет «настрой», «подключи сервер», «почему не деплоится».
---

# Bootstrap: от копии шаблона до первого деплоя

Цель — `https://hello.<домен>/up` отдаёт sha последнего коммита, тревога пробно пришла в Telegram. Владелец пишет с телефона: спрашивай только то, что можешь получить лишь от него, одним списком.

## 1. Что уже есть (без вопросов)

```bash
gh repo view --json nameWithOwner,isTemplate,defaultBranchRef
gh variable list
gh secret list
gh api repos/{owner}/{repo}/environments --jq '.environments[].name'
gh api repos/{owner}/{repo}/branches/main/protection 2>/dev/null | head -c 200
```

Сравни со списком ниже. Отметь в `docs/roadmap.md › Bootstrap`, что уже готово.

| Что | Где | Кто даёт |
|---|---|---|
| `APP_HOST`, `OBS_HOST` (IP серверов) | variables | владелец |
| `BASE_DOMAIN` (например `lab.example.com`) | variables | владелец |
| `IMAGE_ARCH` (`amd64` или `arm64`) | variables | агент по ответу владельца о сервере, по умолчанию `amd64` |
| `SSH_PRIVATE_KEY` (пользователь `deploy`) | secret, env `production` | агент генерирует пару, владелец кладёт публичную часть на сервер |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secrets | владелец (@BotFather) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `RESTIC_PASSWORD` | secrets | владелец (бакет), агент (пароль restic — сгенерировать и попросить сохранить в менеджер паролей) |
| `FLIPT_GIT_REMOTE`, `FLIPT_GIT_TOKEN` | variable / secret | владелец: пустой приватный репозиторий флагов + fine-grained токен с записью только в него |

## 2. SSH-ключ

```bash
ssh-keygen -t ed25519 -N '' -C deploy@lab -f /tmp/lab_deploy
gh secret set SSH_PRIVATE_KEY --env production < /tmp/lab_deploy   # если нет прав — см. ниже
cat /tmp/lab_deploy.pub    # отправить владельцу
shred -u /tmp/lab_deploy
```

Владельцу: «Вставь эту строку в панели VPS в SSH-ключи root (или в `/root/.ssh/authorized_keys`) на обоих серверах». Первый прогон `provision.yml` заходит под root и создаёт пользователя `deploy` с тем же ключом, дальше root не нужен (`ssh_bootstrap_user` в инвентаре).

Если `gh secret set` отказывает (нет прав у токена агента) — не обходи: попроси владельца добавить секреты в GitHub › Settings › Environments › production, дай точный список имён. Приватный ключ в чат не пиши — тогда пусть владелец сгенерирует пару сам по команде выше на своём компьютере.

## 3. Настройки репозитория (агент сам)

```bash
gh api -X PUT repos/{owner}/{repo}/environments/production
gh api -X PUT repos/{owner}/{repo}/branches/main/protection --input - <<'EOF'
{"required_status_checks":null,"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
EOF
```

## 4. DNS (владелец или агент, если дали токен DNS)

`*.<BASE_DOMAIN>` → `APP_HOST`; `grafana logs errors flags status otlp ch home` `.<BASE_DOMAIN>` → `OBS_HOST`. Проверка: `gh workflow run ops.yml -f action=dns-check`.

## 5. Серверы

```bash
gh workflow run provision.yml -f bootstrap=true   # первый раз: заходит под root
gh run watch
gh workflow run provision.yml                      # второй прогон: в сводке changed=0
```

Красное — `gh run view --log-failed`, чини роль, повторяй. Приёмка: `changed=0`, открыты только 22/80/443.

## 6. Первый деплой и тревога

Пустой коммит не делай — запусти пайплайн вручную: `gh workflow run pipeline.yml -f all=true`, `gh run watch`. Приёмка: verify зелёный, `/up` отдаёт sha. Пробная тревога: `gh workflow run ops.yml -f action=test-alert`.

## 7. Отчёт

Владельцу — что заработало: ссылки на `hello`, Grafana, Bugsink, Flipt и статус-страницу. Пароли панелей генерирует Ansible на сервере; в логи Actions их не выводим (логи видят все, у кого есть доступ к репозиторию). Владелец получает их в Telegram: `gh workflow run ops.yml -f action=send-panel-passwords`. Отметь этапы в `docs/roadmap.md`.
