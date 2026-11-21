import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from './db';

/**
 * Простые SQL-миграции: migrations/NNNN_имя.sql по порядку, каждая в своей транзакции,
 * учёт в schema_migrations, advisory lock — две копии приложения не накатят одно и то же.
 *
 * Правило: миграции только расширяют схему (новые таблицы, колонки с default) —
 * старая версия кода работает на новой схеме, пока идёт деплой. Удаление — отдельным
 * релизом и файлом с пометкой `-- contract` в первой строке (см. .claude/skills/db-migration).
 */
// turbopackIgnore: путь читается в рантайме, миграции попадают в образ через outputFileTracingIncludes и Dockerfile
export async function migrate(dir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'migrations')): Promise<string[]> {
  const sql = db();
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  const applied: string[] = [];
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('lab_migrations'))`;
    await tx`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const done = new Set((await tx<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    for (const file of files) {
      if (done.has(file)) continue;
      const body = await readFile(path.join(dir, file), 'utf8');
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
      applied.push(file);
    }
  });
  return applied;
}
