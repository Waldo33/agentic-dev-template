#!/usr/bin/env bash
# SessionStart-хук Claude Code: готовит облачную сессию и печатает сводку (её видит агент).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if ! pnpm install --frozen-lockfile --prefer-offline >/tmp/pnpm-install.log 2>&1; then
    echo "⚠ pnpm install упал — см. /tmp/pnpm-install.log"
  fi
  # Автор коммитов — из переменных окружения облачной среды (LAB_GIT_NAME / LAB_GIT_EMAIL).
  if [ -n "${LAB_GIT_NAME:-}" ] && [ -n "${LAB_GIT_EMAIL:-}" ]; then
    git config user.name "$LAB_GIT_NAME"
    git config user.email "$LAB_GIT_EMAIL"
  fi
fi

echo "## Сводка на старте сессии"
echo
echo "Последние коммиты:"
git log --oneline -5 2>/dev/null | sed 's/^/  /'
echo
if command -v gh >/dev/null 2>&1; then
  runs=$(gh run list --branch main -L 3 --json workflowName,conclusion,status,displayTitle \
    --jq '.[] | "  \(.workflowName): \(.conclusion // .status) — \(.displayTitle)"' 2>/dev/null)
  [ -n "$runs" ] && { echo "Пайплайн main:"; echo "$runs"; echo; }
  incidents=$(gh issue list --label incident --state open --json number,title --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null)
  [ -n "$incidents" ] && { echo "Открытые инциденты:"; echo "$incidents"; echo; }
fi
if [ -f docs/roadmap.md ]; then
  echo "Платформа (docs/roadmap.md):"
  grep -E '^- \[ \]' docs/roadmap.md | head -3 | sed 's/^/  /'
fi
exit 0
