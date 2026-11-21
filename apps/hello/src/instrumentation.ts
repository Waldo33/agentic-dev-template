/**
 * Выполняется один раз при старте сервера: включаем отправку ошибок и накатываем миграции.
 * Если миграция упала — сервер не стартует, /up не отвечает, и Kamal не переключает трафик:
 * в проде остаётся прошлая версия.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { initServerObservability, logger } = await import('@lab/observability/server');
  initServerObservability();
  if (process.env.DATABASE_URL) {
    const { migrate } = await import('./lib/migrate');
    const applied = await migrate();
    logger.info({ applied }, applied.length ? 'миграции применены' : 'миграций нет');
  } else {
    logger.warn('DATABASE_URL не задан — работаем без базы');
  }
}

export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  const { captureError } = await import('@lab/observability/server');
  captureError(error, { path: request.path, method: request.method });
}
