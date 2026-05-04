import { defineConfig, devices } from '@playwright/test';

// Requires docker-compose stack (postgres + electric): npm run db:up
// Start API with NODE_ENV=test before running: NODE_ENV=test npm run dev:api
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'NODE_ENV=test npm run dev --workspace=apps/api',
      url: 'http://localhost:3001/api/users',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev --workspace=apps/web',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
