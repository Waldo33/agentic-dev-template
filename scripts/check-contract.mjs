#!/usr/bin/env node
// Контракт приложения: без него нет деплоя. Запускается в `pnpm check` и в CI.
// CONTRACT_BASE=<sha> — дополнительно проверить, что уже применённые миграции не правили.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const fail = (app, msg) => errors.push(`apps/${app}: ${msg}`);

const apps = readdirSync(path.join(root, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const app of apps) {
  const dir = path.join(root, 'apps', app);
  const need = ['package.json', 'Dockerfile', 'config/deploy.yml', '.kamal/secrets', 'e2e/smoke.spec.ts', 'AGENTS.md', 'SPEC.md', 'features.json', 'PROGRESS.md'];
  for (const f of need) if (!existsSync(path.join(dir, f))) fail(app, `нет ${f}`);

  const deploy = existsSync(path.join(dir, 'config/deploy.yml')) ? readFileSync(path.join(dir, 'config/deploy.yml'), 'utf8') : '';
  if (deploy && !new RegExp(`^service: lab-${app}$`, 'm').test(deploy)) fail(app, `config/deploy.yml: service должен быть lab-${app}`);
  if (deploy && !/healthcheck:\s*\n\s+path: \/up/m.test(deploy)) fail(app, 'config/deploy.yml: healthcheck.path должен быть /up');
  if (deploy && !new RegExp(`host: ${app}\\.`).test(deploy)) fail(app, `config/deploy.yml: proxy.host должен быть ${app}.<домен>`);

  const secrets = existsSync(path.join(dir, '.kamal/secrets')) ? readFileSync(path.join(dir, '.kamal/secrets'), 'utf8') : '';
  for (const line of secrets.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    if (!/^([A-Z0-9_]+)=\$\1$/.test(l)) fail(app, `.kamal/secrets: только ссылки вида NAME=$NAME, а не значения (строка «${l.slice(0, 20)}…»)`);
  }

  if (existsSync(path.join(dir, 'features.json'))) {
    try {
      const fj = JSON.parse(readFileSync(path.join(dir, 'features.json'), 'utf8'));
      for (const f of fj.features ?? []) if (typeof f.passes !== 'boolean' || !f.id) fail(app, `features.json: у фичи ${f.id ?? '?'} нет id или passes`);
    } catch (e) {
      fail(app, `features.json не JSON: ${e.message}`);
    }
  }

  const mdir = path.join(dir, 'migrations');
  if (existsSync(mdir)) {
    for (const f of readdirSync(mdir)) {
      if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(f)) fail(app, `migrations/${f}: имя должно быть NNNN_snake_case.sql`);
      const body = readFileSync(path.join(mdir, f), 'utf8');
      const destructive = /\b(drop\s+(table|column)|rename\s+(column|to)|alter\s+column\s+\S+\s+type)\b/i.test(body);
      if (destructive && !body.startsWith('-- contract')) fail(app, `migrations/${f}: разрушающее изменение без пометки «-- contract» в первой строке (см. skill db-migration)`);
    }
  }
}

const base = process.env.CONTRACT_BASE;
if (base && !/^0+$/.test(base)) {
  try {
    const diff = execFileSync('git', ['diff', '--name-status', `${base}...HEAD`, '--', 'apps/*/migrations/*.sql'], { cwd: root, encoding: 'utf8' });
    for (const line of diff.split('\n').filter(Boolean)) {
      const [status, file] = line.split('\t');
      if (status !== 'A') errors.push(`${file}: уже выкаченную миграцию нельзя менять или удалять — добавь новую`);
    }
  } catch {
    // нет базы в истории — пропускаем
  }
}

if (errors.length) {
  console.error('Контракт приложений нарушен:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`Контракт ок: ${apps.join(', ') || 'приложений нет'}`);
