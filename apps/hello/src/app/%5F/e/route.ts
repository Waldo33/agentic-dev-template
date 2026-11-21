import { eventsHandler, sinkFromEnv } from '@lab/analytics/server';
import { appInfo } from '@lab/observability';
import { logger } from '@lab/observability/server';
import { events } from '@/lib/events';
import { flags } from '@/lib/flags';

// Папка %5F = «_» в адресе: POST /_/e — приём событий аналитики на своём домене.
export const dynamic = 'force-dynamic';

const info = appInfo();

export const POST = eventsHandler({
  app: info.app,
  release: info.release,
  catalog: events,
  sink: sinkFromEnv(),
  flagsFor: (anonId) => flags.snapshot(anonId),
  onError: (e) => logger.warn({ err: e }, 'аналитика: не удалось записать события'),
});
