import { test, expect } from '@playwright/test';

test.describe('Invite by email', () => {
  async function registerUser(page: import('@playwright/test').Page, name: string, email: string) {
    const cdpClient = await page.context().newCDPSession(page);
    await cdpClient.send('WebAuthn.enable');
    await cdpClient.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });
    const res = await page.request.post('/api/auth/register/begin', { data: { name, email } });
    const opts = await res.json();
    const credential = await page.evaluate(async (options) => {
      const { startRegistration } = await import('/node_modules/@simplewebauthn/browser/esm/browser/index.js' as string);
      return startRegistration({ optionsJSON: options });
    }, opts);
    await page.request.post('/api/auth/register/finish', { data: credential });
    await page.reload();
    await page.waitForTimeout(500);
  }

  test('admin can see invite members section in admin panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await registerUser(page, 'InviteAdmin', `invite-admin-${Date.now()}@test.com`);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Invite Test Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/invite-test-org/**');

    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByText('Invite members')).toBeVisible();
    await expect(page.getByTestId('invite-email-input')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send invite' })).toBeVisible();
  });

  test('send invite button is disabled when email is empty', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await registerUser(page, 'InviteAdmin2', `invite-admin2-${Date.now()}@test.com`);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Invite Empty Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/invite-empty-org/**');

    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('button', { name: 'Send invite' })).toBeDisabled();
  });

  test('sending invite shows it in pending invites list', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await registerUser(page, 'InviteAdmin3', `invite-admin3-${Date.now()}@test.com`);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Invite List Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/invite-list-org/**');

    await page.getByRole('link', { name: 'Admin' }).click();

    await page.getByTestId('invite-email-input').fill('newmember@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();

    await expect(page.getByTestId('pending-invite-row')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('newmember@example.com')).toBeVisible();
    await expect(page.getByTestId('cancel-invite-btn')).toBeVisible();
  });

  test('cancelling invite removes it from the list', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await registerUser(page, 'InviteAdmin4', `invite-admin4-${Date.now()}@test.com`);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Invite Cancel Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/invite-cancel-org/**');

    await page.getByRole('link', { name: 'Admin' }).click();

    await page.getByTestId('invite-email-input').fill('cancelme@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByTestId('pending-invite-row')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('cancel-invite-btn').click();
    await expect(page.getByTestId('pending-invite-row')).not.toBeVisible({ timeout: 3000 });
  });

  test('accept invite page shows error for invalid token', async ({ page }) => {
    await page.goto('/accept-invite?token=invalid-token-xyz');
    await expect(page.getByText('invalid or has expired')).toBeVisible({ timeout: 5000 });
  });

  test('accept invite page shows error with no token', async ({ page }) => {
    await page.goto('/accept-invite');
    await expect(page.getByText('invalid')).toBeVisible({ timeout: 5000 });
  });
});
