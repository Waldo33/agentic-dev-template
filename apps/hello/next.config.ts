import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Самодостаточный сервер для Docker-образа — без привязки к хостингу (docs/decisions/0002).
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  // Миграции читаются с диска при старте — берём их в сборку.
  outputFileTracingIncludes: { '/**': ['./migrations/**'] },
  transpilePackages: ['@lab/observability', '@lab/analytics', '@lab/flags'],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // Статика /_next/static Next.js сам отдаёт с кэшем на год (immutable) — CDN не обязателен.
};

export default config;
