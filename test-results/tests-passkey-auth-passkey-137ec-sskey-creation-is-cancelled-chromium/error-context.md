# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/passkey-auth.spec.ts >> passkey authentication >> shows error when passkey creation is cancelled
- Location: e2e/tests/passkey-auth.spec.ts:56:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('p[style*="color"]')
Expected: visible
Error: strict mode violation: locator('p[style*="color"]') resolved to 2 elements:
    1) <p>Register with a passkey.</p> aka getByText('Register with a passkey.')
    2) <p>…</p> aka getByText('Already have an account? Sign')

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('p[style*="color"]')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]: Ripple
    - heading "Create account" [level=1] [ref=e7]
    - paragraph [ref=e8]: Register with a passkey.
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]: Name
      - textbox "Name" [ref=e12]: Passkey User
    - generic [ref=e13]:
      - generic [ref=e14]: Email
      - textbox "Email" [ref=e15]: passkey@example.com
    - button "Waiting for passkey…" [disabled] [ref=e16]
    - paragraph [ref=e17]:
      - text: Already have an account?
      - button "Sign in" [ref=e18] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures';
  2  | import type { CDPSession } from '@playwright/test';
  3  | 
  4  | // Sets up a virtual FIDO2 authenticator via Chrome DevTools Protocol.
  5  | // This is the pre-1.60 CDP equivalent of context.addVirtualAuthenticator().
  6  | async function addVirtualAuthenticator(cdp: CDPSession): Promise<void> {
  7  |   await cdp.send('WebAuthn.enable', { enableUI: false });
  8  |   await cdp.send('WebAuthn.addVirtualAuthenticator', {
  9  |     options: {
  10 |       protocol: 'ctap2',
  11 |       transport: 'internal',
  12 |       hasResidentKey: true,
  13 |       hasUserVerification: true,
  14 |       isUserVerified: true,
  15 |       automaticPresenceSimulation: true,
  16 |     },
  17 |   });
  18 | }
  19 | 
  20 | test.describe('passkey authentication', () => {
  21 |   test('can register a new account with a passkey', async ({ page, context }) => {
  22 |     await page.goto('/');
  23 |     const cdp = await context.newCDPSession(page);
  24 |     await addVirtualAuthenticator(cdp);
  25 | 
  26 |     await page.getByRole('button', { name: 'Register' }).click();
  27 |     await page.getByLabel('Name').fill('Passkey User');
  28 |     await page.getByLabel('Email').fill('passkey@example.com');
  29 |     await page.getByRole('button', { name: 'Create passkey' }).click();
  30 | 
  31 |     // Successful registration logs the user in and shows their name in the shell
  32 |     await expect(page.getByText('Passkey User')).toBeVisible({ timeout: 15000 });
  33 |   });
  34 | 
  35 |   test('can sign in with a passkey after registering', async ({ page, context }) => {
  36 |     await page.goto('/');
  37 |     const cdp = await context.newCDPSession(page);
  38 |     await addVirtualAuthenticator(cdp);
  39 | 
  40 |     // Register
  41 |     await page.getByRole('button', { name: 'Register' }).click();
  42 |     await page.getByLabel('Name').fill('Passkey User');
  43 |     await page.getByLabel('Email').fill('passkey@example.com');
  44 |     await page.getByRole('button', { name: 'Create passkey' }).click();
  45 |     await expect(page.getByText('Passkey User')).toBeVisible({ timeout: 15000 });
  46 | 
  47 |     // Sign out
  48 |     await page.getByRole('button', { name: 'Sign out' }).click();
  49 |     await expect(page.getByRole('button', { name: 'Sign in with passkey' })).toBeVisible();
  50 | 
  51 |     // Sign in with the stored passkey (virtual authenticator still holds the credential)
  52 |     await page.getByRole('button', { name: 'Sign in with passkey' }).click();
  53 |     await expect(page.getByText('Passkey User')).toBeVisible({ timeout: 15000 });
  54 |   });
  55 | 
  56 |   test('shows error when passkey creation is cancelled', async ({ page }) => {
  57 |     // No virtual authenticator — WebAuthn fails with NotSupportedError
  58 |     await page.goto('/');
  59 |     await page.getByRole('button', { name: 'Register' }).click();
  60 |     await page.getByLabel('Name').fill('Passkey User');
  61 |     await page.getByLabel('Email').fill('passkey@example.com');
  62 |     await page.getByRole('button', { name: 'Create passkey' }).click();
  63 | 
  64 |     // App catches the error and displays it in red (no authenticator → "No available authenticator..." from the browser)
> 65 |     await expect(page.locator('p[style*="color"]')).toBeVisible({ timeout: 10000 });
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  66 |   });
  67 | });
  68 | 
```