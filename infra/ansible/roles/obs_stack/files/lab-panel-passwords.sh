#!/usr/bin/env bash
# lab-panel-passwords: три строки — пароли Grafana, Bugsink, панели (Flipt, home). Для ops.yml send-panel-passwords.
set -euo pipefail
# shellcheck disable=SC1091
. /etc/lab/obs/secrets.env
printf '%s\n%s\n%s\n' "$GRAFANA_ADMIN_PASSWORD" "$BUGSINK_ADMIN_PASSWORD" "$PANEL_PASSWORD"
