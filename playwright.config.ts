import { defineConfig } from '@playwright/test';
const PORT = process.env.E2E_PORT ?? '3100';
const HOST = '127.0.0.1';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://${HOST}:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', testIgnore: /responsive\.spec/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'tablet', testMatch: /responsive\.spec/, use: { viewport: { width: 768, height: 1024 } } },
  ],
  webServer: { command: 'pnpm start', env: { PORT, HOSTNAME: '127.0.0.1' }, url: `http://127.0.0.1:${PORT}`, reuseExistingServer: false, timeout: 60000 },
});
