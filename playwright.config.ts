import { defineConfig, devices } from '@playwright/test'

// E2E y visuales contra el dev server local (Firebase real del .env).
// Credenciales: E2E_EMAIL y E2E_PASSWORD en el entorno o en .env.e2e (no se versiona).
const AUTH = 'e2e/.auth/user.json'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', stylePath: './e2e/screenshot.css' } },
  fullyParallel: false,
  workers: 1, // comparten la misma cuenta y los mismos datos
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, storageState: AUTH },
    },
    {
      name: 'desktop',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: AUTH },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
