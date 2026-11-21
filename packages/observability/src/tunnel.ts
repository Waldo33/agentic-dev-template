/**
 * Туннель ошибок из браузера: SDK шлёт «конверт» Sentry на /_/err своего же домена
 * (блокировщики рекламы режут запросы к сторонним доменам), а сервер пересылает его в Bugsink.
 *
 * Пересылаем только конверты для нашего DSN — иначе туннель стал бы открытым прокси.
 */
export interface EnvelopeTarget {
  url: string;
}

interface ParsedDsn {
  origin: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, '').split('/').pop() || '';
    if (!projectId || !u.username) return null;
    return { origin: `${u.protocol}//${u.host}`, host: u.host, projectId };
  } catch {
    return null;
  }
}

/**
 * Разбирает первую строку конверта и возвращает адрес, куда его переслать,
 * или null, если конверт не для нашего проекта.
 */
export function envelopeTarget(envelope: string, allowedDsn: string | undefined): EnvelopeTarget | null {
  if (!allowedDsn) return null;
  const allowed = parseDsn(allowedDsn);
  if (!allowed) return null;
  const firstLine = envelope.split('\n', 1)[0];
  if (!firstLine) return null;
  let header: { dsn?: unknown };
  try {
    header = JSON.parse(firstLine) as { dsn?: unknown };
  } catch {
    return null;
  }
  if (typeof header.dsn !== 'string') return null;
  const got = parseDsn(header.dsn);
  if (!got || got.host !== allowed.host || got.projectId !== allowed.projectId) return null;
  return { url: `${allowed.origin}/api/${allowed.projectId}/envelope/` };
}
