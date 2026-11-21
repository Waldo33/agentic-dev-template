#!/bin/sh
# Секреты приложения живут на сервере в /etc/lab/apps/<имя>.env (кладёт Ansible)
# и монтируются в контейнер только для чтения — в образе и в GitHub их нет.
set -e
if [ -f /run/secrets/app.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /run/secrets/app.env
  set +a
fi
exec "$@"
