import { test, expect, API } from '../fixtures';

test('admin sees Generate invite link button when no token exists', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/members');
  await expect(page.getByRole('button', { name: 'Generate invite link' })).toBeVisible();
});

test('clicking Generate invite link shows the invite URL input', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/members');
  await page.getByRole('button', { name: 'Generate invite link' }).click();
  const urlInput = page.locator('input[readonly]');
  await expect(urlInput).toBeVisible();
  await expect(urlInput).toHaveValue(/\/orgs\/ripple-test\/join\?token=/);
});

test('Copy button copies the invite URL to clipboard', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/members');
  await page.getByRole('button', { name: 'Generate invite link' }).click();
  await expect(page.locator('input[readonly]')).toBeVisible();
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByText('Invite link copied')).toBeVisible();
});

test('Revoke removes the invite link', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/members');
  await page.getByRole('button', { name: 'Generate invite link' }).click();
  await expect(page.locator('input[readonly]')).toBeVisible();

  await page.getByRole('button', { name: 'Revoke' }).click();
  await page.getByRole('button', { name: 'Yes, revoke' }).click();

  await expect(page.getByRole('button', { name: 'Generate invite link' })).toBeVisible();
});

test('API: generate invite token returns a token', async ({ page, asAlice }) => {
  const res = await page.request.post(`${API}/api/orgs/ripple-test/invite-token`);
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.item.invite_token).toMatch(/^[0-9a-f-]{36}$/);
});

test('API: revoke invite token clears it', async ({ page, asAlice }) => {
  await page.request.post(`${API}/api/orgs/ripple-test/invite-token`);
  const res = await page.request.delete(`${API}/api/orgs/ripple-test/invite-token`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.item.invite_token).toBeNull();
});

test('API: user can join org via valid invite token', async ({ page, asAlice, bob, request }) => {
  // Generate a token as Alice
  const tokenRes = await page.request.post(`${API}/api/orgs/ripple-test/invite-token`);
  const { item: { invite_token } } = await tokenRes.json();

  // Bob joins via the invite link using Bob's authenticated request context
  const joinRes = await request.post(`${API}/api/orgs/ripple-test/join`, {
    data: { token: invite_token },
  });
  expect(joinRes.status()).toBe(201);
  const joinBody = await joinRes.json();
  expect(joinBody.item.user_id).toBe(bob.id);
});

test('API: join with invalid token is rejected', async ({ page, asAlice }) => {
  const res = await page.request.post(`${API}/api/orgs/ripple-test/join`, {
    data: { token: '00000000-0000-0000-0000-000000000000' },
  });
  expect(res.status()).toBe(403);
});

test('join page shows error for missing token', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/join');
  await expect(page.getByText(/invalid or has expired/)).toBeVisible();
});

test('join page shows org name when token present in URL', async ({ page, asAlice }) => {
  const tokenRes = await page.request.post(`${API}/api/orgs/ripple-test/invite-token`);
  const { item: { invite_token } } = await tokenRes.json();

  await page.goto(`/orgs/ripple-test/join?token=${invite_token}`);
  await expect(page.getByRole('heading', { name: 'Ripple Test' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join organisation' })).toBeVisible();
});
