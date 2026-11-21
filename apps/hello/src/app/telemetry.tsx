'use client';

import { track } from '@lab/analytics/client';
import { initBrowserObservability } from '@lab/observability/browser';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { AppEvent } from '@/lib/events';

/** Ошибки браузера → Bugsink (через /_/err), просмотры страниц → аналитика (через /_/e). */
export function Telemetry(props: { dsn?: string; release: string; env: string }) {
  const pathname = usePathname();
  useEffect(() => {
    initBrowserObservability(props);
  }, [props]);
  useEffect(() => {
    track<AppEvent>('page_view');
  }, [pathname]);
  return null;
}
