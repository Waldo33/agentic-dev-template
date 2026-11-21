import { expect, test } from '@playwright/test';

/**
 * Смоук: обязателен в каждом приложении. Гоняется в CI против контейнера и после деплоя против прода.
 * SMOKE_READONLY=1 (прод) — без проверок, которые пишут лишнее.
 */
test('главная открывается и кнопка отвечает', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('greeting')).toBeVisible();
  await expect(page.getByTestId('visits')).toContainText(/Визитов: \d+|База не подключена/);
  await page.getByTestId('hello-button').click();
  await expect(page.getByTestId('hello-button')).toHaveText('Нажато: 1');
  expect(errors).toEqual([]);
});

test('/up отвечает и сообщает релиз', async ({ request }) => {
  const res = await request.get('/up');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.app).toBe('__APP__');
  if (process.env.EXPECT_RELEASE) expect(body.release).toBe(process.env.EXPECT_RELEASE);
});

test('приём аналитики и туннель ошибок отвечают', async ({ request }) => {
  test.skip(process.env.SMOKE_READONLY === '1', 'на проде не шлём тестовые события');
  const ok = await request.post('/_/e', {
    data: { events: [{ event: 'page_view', anonId: 'e2e-anon-0001', sessionId: 'e2e-sess-0001' }] },
  });
  expect(ok.status()).toBe(204);
  const bad = await request.post('/_/e', { data: { events: [] } });
  expect(bad.status()).toBe(400);
  const err = await request.post('/_/err', { data: 'не конверт' });
  expect(err.status()).toBe(204);
});
