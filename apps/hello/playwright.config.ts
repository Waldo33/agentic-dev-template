import { defineConfig, devices } from '@playwright/test';

/**
 * e2e идут против уже запущенного приложения: BASE_URL — контейнер в CI или прод на шаге verify.
 * Локально без скачанного Chromium можно указать системный: PW_CHROMIUM_PATH=/usr/bin/google-chrome.
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'on',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
