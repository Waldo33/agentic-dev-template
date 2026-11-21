#!/usr/bin/env node
// Stop-хук: агент не может закончить ход с красными lint/typecheck/test по изменённому коду.
// Повторный вызов (stop_hook_active) пропускаем, чтобы не зациклиться. Отключить: LAB_SKIP_STOP_CHECK=1.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  // нет ввода — проверяем как обычно
}
if (input.stop_hook_active || process.env.LAB_SKIP_STOP_CHECK === '1') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let status = '';
try {
  status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
} catch {
  process.exit(0);
}
if (!/\.(ts|tsx|mjs|js|json|sql)$/m.test(status)) process.exit(0);

const r = spawnSync('pnpm', ['-s', 'check:fast'], { cwd: root, encoding: 'utf8', timeout: 170_000 });
if (r.status === 0) process.exit(0);
const output = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n');
console.error(`pnpm check:fast красный — почини до конца хода:\n${output}`);
process.exit(2);
