import { forwardBrowserEnvelope } from '@lab/observability/server';

// POST /_/err — туннель ошибок браузера в Bugsink через свой домен.
export const dynamic = 'force-dynamic';

export const POST = forwardBrowserEnvelope;
