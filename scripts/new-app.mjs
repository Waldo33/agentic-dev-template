#!/usr/bin/env node
// Новое приложение из шаблона: `pnpm new-app <имя> [--template next-app]`.
// Копирует templates/<шаблон> в apps/<имя> и подставляет имя вместо __APP__.
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const tIdx = args.indexOf('--template');
const template = tIdx >= 0 ? args[tIdx + 1] : 'next-app';

const RESERVED = new Set(['www', 'api', 'grafana', 'logs', 'errors', 'flags', 'status', 'otlp', 'ch', 'home', 'mail']);

if (!name || !/^[a-z][a-z0-9-]{1,29}$/.test(name)) {
  console.error('Имя: латиница в нижнем регистре, цифры и дефис, 2–30 символов. Пример: pnpm new-app habit-tracker');
  process.exit(1);
}
if (RESERVED.has(name)) {
  console.error(`Имя «${name}» занято служебным поддоменом.`);
  process.exit(1);
}
const src = path.join(root, 'templates', template);
const dst = path.join(root, 'apps', name);
if (!existsSync(src)) {
  console.error(`Нет шаблона templates/${template}`);
  process.exit(1);
}
if (existsSync(dst)) {
  console.error(`apps/${name} уже существует`);
  process.exit(1);
}

cpSync(src, dst, { recursive: true });

const TEXT = /\.(ts|tsx|js|mjs|json|md|yml|yaml|sql|txt|sh)$|Dockerfile$|secrets$/;
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (TEXT.test(entry)) writeFileSync(p, readFileSync(p, 'utf8').replaceAll('__APP__', name));
    if (entry.includes('__APP__')) renameSync(p, path.join(dir, entry.replaceAll('__APP__', name)));
  }
})(dst);
if (existsSync(path.join(dst, 'docker-entrypoint.sh'))) chmodSync(path.join(dst, 'docker-entrypoint.sh'), 0o755);

console.log(`Готово: apps/${name}
Дальше:
  1. pnpm install
  2. заполнить apps/${name}/SPEC.md и features.json
  3. pnpm check
  4. push в main → пайплайн выкатит https://${name}.<домен> (база создаётся шагом provision)`);
