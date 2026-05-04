import { test as base } from '@playwright/test';

const API = 'http://localhost:5173';

export type TestUser = { id: string; name: string; email: string; created_at: string };

export const test = base.extend<{
  resetDb: void;
  asAlice: TestUser;
  bob: TestUser;
}>({
  // Truncates all tables before each test for a clean slate.
  resetDb: [async ({ request }, use) => {
    await request.post(`${API}/api/auth/test-reset`);
    await use();
  }, { auto: true }],

  // Creates Alice and logs the page in as Alice (session cookie set on page context).
  asAlice: async ({ page }, use) => {
    const res = await page.request.post(`${API}/api/auth/test-setup`, {
      data: { name: 'Alice', email: 'alice@test.ripple' },
    });
    await use((await res.json()) as TestUser);
  },

  // Creates Bob using the standalone request context (page is NOT logged in as Bob).
  // Subsequent calls via `request` fixture in the same test use Bob's session.
  bob: async ({ request }, use) => {
    const res = await request.post(`${API}/api/auth/test-setup`, {
      data: { name: 'Bob', email: 'bob@test.ripple' },
    });
    await use((await res.json()) as TestUser);
  },
});

export { expect } from '@playwright/test';
