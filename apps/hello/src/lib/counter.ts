import { db, hasDb } from './db';

/** +1 к счётчику и новое значение; без базы — null. */
export async function bump(name: string): Promise<number | null> {
  if (!hasDb()) return null;
  const [row] = await db()<{ value: string }[]>`
    insert into counters (name, value) values (${name}, 1)
    on conflict (name) do update set value = counters.value + 1
    returning value`;
  return row ? Number(row.value) : null;
}
