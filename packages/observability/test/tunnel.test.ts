import { describe, expect, it } from 'vitest';
import { appInfo, envelopeTarget } from '../src/index';

const DSN = 'https://abc123@errors.example.com/7';
const envelope = (dsn: string) => `${JSON.stringify({ dsn, sent_at: '2026-01-01T00:00:00Z' })}\n{"type":"event"}\n{}`;

describe('envelopeTarget', () => {
  it('пересылает конверт нашего проекта в Bugsink', () => {
    expect(envelopeTarget(envelope(DSN), DSN)).toEqual({ url: 'https://errors.example.com/api/7/envelope/' });
  });

  it('не пересылает чужой проект или чужой хост — туннель не открытый прокси', () => {
    expect(envelopeTarget(envelope('https://abc123@errors.example.com/8'), DSN)).toBeNull();
    expect(envelopeTarget(envelope('https://abc123@evil.example.com/7'), DSN)).toBeNull();
  });

  it('молча отбрасывает мусор и работает без DSN', () => {
    expect(envelopeTarget('не json', DSN)).toBeNull();
    expect(envelopeTarget('', DSN)).toBeNull();
    expect(envelopeTarget(envelope(DSN), undefined)).toBeNull();
  });
});

describe('appInfo', () => {
  it('берёт имя и релиз из окружения', () => {
    expect(appInfo({ APP_NAME: 'hello', APP_RELEASE: 'abc', NODE_ENV: 'production' })).toEqual({
      app: 'hello',
      release: 'abc',
      env: 'production',
    });
    expect(appInfo({})).toEqual({ app: 'unknown', release: 'dev', env: 'development' });
  });
});
