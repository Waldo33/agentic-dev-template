/** Кто мы: имя приложения, версия (sha коммита) и окружение — попадают в логи, ошибки и /up. */
export interface AppInfo {
  app: string;
  release: string;
  env: string;
}

export function appInfo(env: Record<string, string | undefined> = process.env): AppInfo {
  return {
    app: env.APP_NAME || 'unknown',
    release: env.APP_RELEASE || 'dev',
    env: env.APP_ENV || (env.NODE_ENV === 'production' ? 'production' : 'development'),
  };
}
