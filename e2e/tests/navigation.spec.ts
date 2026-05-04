import { test, expect } from '../fixtures';

test('/ redirects to /proposals', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/proposals');
});

test('proposals nav link is active on /proposals', async ({ page }) => {
  await page.goto('/proposals');
  const link = page.getByRole('link', { name: 'Proposals' });
  await expect(link).toHaveCSS('font-weight', '600');
});

test('delegations nav link navigates to /delegations', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('link', { name: 'Delegations' }).click();
  await expect(page).toHaveURL('/delegations');
});

test('delegations nav link is active on /delegations', async ({ page }) => {
  await page.goto('/delegations');
  const link = page.getByRole('link', { name: 'Delegations' });
  await expect(link).toHaveCSS('font-weight', '600');
});

test('proposals nav link is not active on /delegations', async ({ page }) => {
  await page.goto('/delegations');
  const link = page.getByRole('link', { name: 'Proposals' });
  await expect(link).not.toHaveCSS('font-weight', '600');
});
