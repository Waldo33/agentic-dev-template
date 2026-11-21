#!/usr/bin/env node
// Быстрая проверка только того, что изменено относительно HEAD (для Stop-хука): lint + typecheck + test.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sh = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: 'inherit' }).status ?? 1;

const changed = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3).split(' -> ').pop());

const code = changed.filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !f.startsWith('templates/'));
if (changed.length === 0) {
  console.log('изменений нет');
  process.exit(0);
}

let status = 0;
if (code.length) status ||= sh('pnpm', ['exec', 'eslint', '--no-warn-ignored', ...code]);
status ||= sh('pnpm', ['--filter', '...[HEAD]', '--if-present', 'typecheck']);
status ||= sh('pnpm', ['--filter', '...[HEAD]', '--if-present', 'test']);
status ||= sh('node', ['scripts/check-contract.mjs']);
process.exit(status);
