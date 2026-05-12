import { test, expect } from '@playwright/test';

test.describe('Decision record', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
  });

  async function signIn(page: import('@playwright/test').Page) {
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

    const res = await page.request.post('/api/auth/register/begin', {
      data: { name: 'Decision Tester', email: 'decisions@example.com' },
    });
    const opts = await res.json();
    const credential = await page.evaluate(async (options) => {
      const { startRegistration } = await import('/node_modules/@simplewebauthn/browser/dist/browser/index.js' as string);
      return startRegistration({ optionsJSON: options });
    }, opts);
    await page.request.post('/api/auth/register/finish', { data: credential });
    await page.reload();
  }

  test('nav link exists and decisions page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

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

    const regBegin = await page.request.post('/api/auth/register/begin', {
      data: { name: 'DecisionUser', email: `dec-${Date.now()}@test.com` },
    });
    const opts = await regBegin.json();
    const credential = await page.evaluate(async (options) => {
      const { startRegistration } = await import('/node_modules/@simplewebauthn/browser/esm/browser/index.js' as string);
      return startRegistration({ optionsJSON: options });
    }, opts);
    await page.request.post('/api/auth/register/finish', { data: credential });
    await page.reload();
    await page.waitForTimeout(500);

    // Create an org
    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Decision Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/decision-org/**');

    // Decisions nav link should be visible
    await expect(page.getByRole('link', { name: 'Decisions' })).toBeVisible();

    // Navigate to decisions page
    await page.getByRole('link', { name: 'Decisions' }).click();
    await expect(page).toHaveURL(/\/decisions/);
    await expect(page.getByRole('heading', { name: 'Decision record' })).toBeVisible();
    await expect(page.getByTestId('export-csv-btn')).toBeVisible();
  });

  test('shows empty state when no decisions', async ({ page }) => {
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

    const regBegin = await page.request.post('/api/auth/register/begin', {
      data: { name: 'EmptyDecision', email: `empty-dec-${Date.now()}@test.com` },
    });
    const opts = await regBegin.json();
    const credential = await page.evaluate(async (options) => {
      const { startRegistration } = await import('/node_modules/@simplewebauthn/browser/esm/browser/index.js' as string);
      return startRegistration({ optionsJSON: options });
    }, opts);
    await page.request.post('/api/auth/register/finish', { data: credential });
    await page.reload();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Empty Decision Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/empty-decision-org/**');

    await page.goto(page.url().replace(/\/[^/]+$/, '/decisions'));
    await expect(page.getByText('No decisions yet')).toBeVisible();
  });

  test('export CSV button is disabled with no decisions', async ({ page }) => {
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

    const regBegin = await page.request.post('/api/auth/register/begin', {
      data: { name: 'ExportUser', email: `export-${Date.now()}@test.com` },
    });
    const opts = await regBegin.json();
    const credential = await page.evaluate(async (options) => {
      const { startRegistration } = await import('/node_modules/@simplewebauthn/browser/esm/browser/index.js' as string);
      return startRegistration({ optionsJSON: options });
    }, opts);
    await page.request.post('/api/auth/register/finish', { data: credential });
    await page.reload();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Export Test Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/export-test-org/**');

    await page.goto(page.url().replace(/\/[^/]+$/, '/decisions'));
    await page.waitForTimeout(500);

    await expect(page.getByTestId('export-csv-btn')).toBeDisabled();
  });

  test('filter pills exist and are interactive', async ({ page }) => {
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

    const regBegin = await page.request.post('/api/auth/register/begin', {
      data: { name: 'FilterUser', email: `filter-${Date.now()}@test.com` },
    });
    const opts = await regBegin.json();
    const credential = await page.evaluate(async (options) => {
      const { startRegistration } = await import('/node_modules/@simplewebauthn/browser/esm/browser/index.js' as string);
      return startRegistration({ optionsJSON: options });
    }, opts);
    await page.request.post('/api/auth/register/finish', { data: credential });
    await page.reload();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill('Filter Test Org');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL('**/orgs/filter-test-org/**');

    await page.goto(page.url().replace(/\/[^/]+$/, '/decisions'));
    await page.waitForTimeout(500);

    for (const f of ['all', 'passed', 'failed', 'withdrawn', 'no-votes']) {
      await expect(page.getByTestId(`filter-${f}`)).toBeVisible();
    }

    // Click a filter and confirm it activates
    await page.getByTestId('filter-passed').click();
    await expect(page.getByTestId('filter-passed')).toHaveClass(/filterPillActive/);
  });
});
