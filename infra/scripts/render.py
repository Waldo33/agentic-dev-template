#!/usr/bin/env python3
"""Рендерит Jinja-шаблоны infra/ с тестовыми значениями — для проверки конфигов в CI (validate.sh)."""
import json
import pathlib
import sys

import jinja2

root = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/lab-validate")
out.mkdir(parents=True, exist_ok=True)

apps = sorted(p.name for p in (root.parent / "apps").iterdir() if (p / "package.json").exists())
ctx = {
    "base_domain": "lab.example.com",
    "acme_email": "ops@example.com",
    "app_host_ip": "203.0.113.10",
    "obs_host_ip": "203.0.113.20",
    "telegram_bot_token": "123:test",
    "telegram_chat_id": "42",
    "flipt_git_remote": "https://github.com/example/lab-flags.git",
    "flipt_git_token": "test-token",
    "lab_apps": apps,
    "host_label": "app",
    "ch_password": "test-writer",
    "obs": {
        # bcrypt-хэш слова "test" — Caddy проверяет формат
        "PANEL_HASH": "$2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG",
        "FLAGS_APP_HASH": "$2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG",
        "GATUS_PUSH_TOKEN": "test-push",
    },
}

env = jinja2.Environment(undefined=jinja2.StrictUndefined, keep_trailing_newline=True)
templates = {
    "vector/vector.yaml.j2": "vector.yaml",
    "obs/Caddyfile.j2": "Caddyfile",
    "obs/gatus.yaml.j2": "gatus.yaml",
    "obs/flipt.yml.j2": "flipt.yml",
    "obs/home.html.j2": "index.html",
}
for src, dst in templates.items():
    text = env.from_string((root / src).read_text()).render(**ctx)
    (out / dst).write_text(text)
    print(f"ok {src} -> {out / dst}")
print(json.dumps({"apps": apps}))
