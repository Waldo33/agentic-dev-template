#!/usr/bin/env node
// PostToolUse(Edit|Write): eslint --fix только по изменённому файлу. Молча: ошибки покажет Stop-хук.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const file = String(input?.tool_input?.file_path ?? '');
if (/\.(ts|tsx|mjs)$/.test(file) && !file.includes('/templates/')) {
  spawnSync('pnpm', ['exec', 'eslint', '--fix', '--no-warn-ignored', file], {
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
    stdio: 'ignore',
    timeout: 30_000,
  });
}
process.exit(0);
