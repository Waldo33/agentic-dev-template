#!/usr/bin/env bash
# ops.sh <действие> [приложение] [аргумент] — операция на проде из облачной сессии агента.
# Запуск workflow вручную из сессии недоступен, поэтому запрос — issue «ops: …», ответ — комментарий ops.yml.
#   scripts/ops.sh status
#   scripts/ops.sh logs hello 300
#   scripts/ops.sh sql-readonly hello "select count(*) from counters"
#   scripts/ops.sh clickhouse-query - "select count() from analytics.events"
#   scripts/ops.sh redeploy
# Список действий — docs/runbooks/ops.md. Ждёт ответ до 20 минут и печатает его.
set -euo pipefail

action="${1:?действие}"
app="${2:-}"
arg="${3:-}"
[ "$app" = "-" ] && app=""

remote=$(git remote get-url origin)
repo=$(sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##' <<< "$remote")
repo=$(grep -oE '[^/:]+/[^/]+$' <<< "$repo")   # owner/repo из любого вида адреса (в т. ч. прокси сессии)

title="ops: $action${app:+ $app}"
n=$(gh api "repos/$repo/issues" -f title="$title" -f body="$arg" --jq .number)
echo "Запрос #$n: $title — жду ответ ops.yml…" >&2

for _ in $(seq 120); do
  sleep 10
  reply=$(gh api "repos/$repo/issues/$n/comments" --jq '[.[] | select(.user.login == "github-actions[bot]")] | last | .body // empty')
  if [ -n "$reply" ]; then
    printf '%s\n' "$reply"
    grep -q '^✅' <<< "$reply"
    exit $?
  fi
done
echo "Нет ответа за 20 минут. Проверь: gh run list --workflow ops.yml; issue #$n" >&2
exit 1
