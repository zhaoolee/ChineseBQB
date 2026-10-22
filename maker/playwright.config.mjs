import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser', workers: 1, retries: 0, timeout: 180_000,
  expect: { timeout: 120_000 },
  use: {
    baseURL: process.env.OCR_BASE_URL || 'http://127.0.0.1:5177/ChineseBQB/maker/',
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/155.0.0.0 Mobile/15E148 Safari/604.1',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
      },
    },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5177', port: 5177,
    reuseExistingServer: !process.env.CI,
  },
})
