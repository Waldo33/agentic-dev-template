import postgres from 'postgres';

let client: postgres.Sql | null = null;

/** Подключение к своей базе приложения (DATABASE_URL кладёт Ansible в /etc/lab/apps/<имя>.env). */
export function db(): postgres.Sql {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL не задан');
  client ??= postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 30, connect_timeout: 5 });
  return client;
}

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function dbHealthy(): Promise<boolean> {
  if (!hasDb()) return true;
  try {
    await db()`select 1`;
    return true;
  } catch {
    return false;
  }
}
