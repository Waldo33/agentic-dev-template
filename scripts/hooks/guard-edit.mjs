#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit): не даёт править секреты и уже закоммиченные миграции.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const file = String(input?.tool_input?.file_path ?? '');
if (!file) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = path.relative(root, path.resolve(root, file));
const base = path.basename(rel);

if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') {
  console.error('Заблокировано хуком guard-edit: секреты не хранятся в репозитории (.env*). См. AGENTS.md › Секреты.');
  process.exit(2);
}

if (/^apps\/[^/]+\/migrations\/\d{4}_[a-z0-9_]+\.sql$/.test(rel)) {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:${rel}`], { cwd: root, stdio: 'ignore' });
    console.error(`Заблокировано хуком guard-edit: ${rel} уже в истории (и, скорее всего, в проде). Добавь новую миграцию.`);
    process.exit(2);
  } catch {
    // файла нет в HEAD — новая миграция, можно
  }
}
process.exit(0);
