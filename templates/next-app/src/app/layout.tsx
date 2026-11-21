import { appInfo } from '@lab/observability';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Telemetry } from './telemetry';

export const metadata: Metadata = {
  title: '__APP__',
  description: 'Идея из лаборатории',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111111',
};

// Значения окружения читаются при каждом запросе, а не при сборке: один образ — любые окружения.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  const info = appInfo();
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#111', color: '#eee' }}>
        <Telemetry dsn={process.env.SENTRY_DSN} release={info.release} env={info.env} />
        {children}
      </body>
    </html>
  );
}
