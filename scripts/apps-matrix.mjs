#!/usr/bin/env node
// Какие приложения затронуты коммитом: `node scripts/apps-matrix.mjs [<base-sha>] [--all]`.
// Печатает JSON-массив имён для matrix в GitHub Actions.
// Изменения в packages/* задевают приложения, которые их импортируют; корневые файлы — все приложения.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith('--'));

const apps = readdirSync(path.join(root, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(root, 'apps', d.name, 'package.json')))
  .map((d) => d.name)
  .sort();

function out(list) {
  console.log(JSON.stringify([...new Set(list)].sort()));
  process.exit(0);
}

if (args.includes('--all') || !base || /^0+$/.test(base)) out(apps);

let changed;
try {
  changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch {
  out(apps); // базы нет в истории (форс, мелкий клон) — безопаснее собрать всё
}

const GLOBAL = [/^pnpm-lock\.yaml$/, /^package\.json$/, /^pnpm-workspace\.yaml$/, /^tsconfig\.base\.json$/, /^eslint\.config\.mjs$/, /^\.github\/workflows\/pipeline\.yml$/];
if (changed.some((f) => GLOBAL.some((re) => re.test(f)))) out(apps);

const deps = (app) => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'apps', app, 'package.json'), 'utf8'));
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
};
const pkgName = (dir) => {
  const p = path.join(root, 'packages', dir, 'package.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')).name : null;
};

const result = [];
for (const f of changed) {
  const [top, name] = f.split('/');
  if (top === 'apps' && apps.includes(name)) result.push(name);
  if (top === 'packages' && name) {
    const pn = pkgName(name);
    for (const a of apps) if (pn && deps(a).includes(pn)) result.push(a);
  }
}
out(result);
