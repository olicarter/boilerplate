import { test, expect } from '../fixtures';

test('shows sign-in panel when logged out', async ({ page }) => {
  await page.goto('/proposals');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with passkey' })).toBeVisible();
});

test('register link toggles to registration form', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create passkey' })).toBeVisible();
});

test('registration form has name, email fields', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
});

test('sign-in link on register form switches back', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('shows user name in sidebar when logged in', async ({ page, asAlice }) => {
  await page.goto('/proposals');
  await expect(page.getByText(asAlice.name)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('sign out clears session and shows sign-in panel', async ({ page, asAlice }) => {
  await page.goto('/proposals');
  await expect(page.getByText(asAlice.name)).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
