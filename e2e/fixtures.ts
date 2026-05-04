import { test as base } from '@playwright/test';

const API = 'http://localhost:5173';
const STORAGE_KEY = 'ripple_user';

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

  // Creates Alice, sets her session cookie on the page context, and injects
  // localStorage so the React app sees her as logged in on first navigation.
  asAlice: async ({ page }, use) => {
    const res = await page.request.post(`${API}/api/auth/test-setup`, {
      data: { name: 'Alice', email: 'alice@test.ripple' },
    });
    const user = (await res.json()) as TestUser;

    // Inject localStorage before every page navigation so the frontend reads
    // the logged-in user on mount (it reads from localStorage, not session).
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: STORAGE_KEY, value: JSON.stringify(user) },
    );

    await use(user);
  },

  // Creates Bob using the standalone request context (page is NOT logged in as Bob).
  // Subsequent calls via the `request` fixture in the same test use Bob's session.
  bob: async ({ request }, use) => {
    const res = await request.post(`${API}/api/auth/test-setup`, {
      data: { name: 'Bob', email: 'bob@test.ripple' },
    });
    await use((await res.json()) as TestUser);
  },
});

export { expect } from '@playwright/test';
