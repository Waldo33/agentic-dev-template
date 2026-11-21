import { healthResponse } from '@lab/observability/server';
import { dbHealthy } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Проверка живости для kamal-proxy, Gatus и шага verify в пайплайне. */
export async function GET() {
  const db = await dbHealthy();
  const res = healthResponse({ db });
  return db ? res : new Response(res.body, { status: 503, headers: res.headers });
}
