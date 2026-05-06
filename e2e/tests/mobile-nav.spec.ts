import { test, expect } from '../fixtures';

test.use({ viewport: { width: 375, height: 812 } });

test('hamburger button is visible on mobile', async ({ page }) => {
  await page.goto('/proposals');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});

test('nav links are hidden by default on mobile', async ({ page }) => {
  await page.goto('/proposals');
  await expect(page.getByRole('link', { name: 'Delegations' })).not.toBeVisible();
});

test('hamburger opens the slide-in menu', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('link', { name: 'Proposals' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Delegations' })).toBeVisible();
});

test('close button hides the menu', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(page.getByRole('link', { name: 'Delegations' })).not.toBeVisible();
});

test('overlay click closes the menu', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Open menu' }).click();
  // Click the dark overlay (outside the drawer)
  await page.mouse.click(350, 400);
  await expect(page.getByRole('link', { name: 'Delegations' })).not.toBeVisible();
});

test('navigating from the menu closes it', async ({ page }) => {
  await page.goto('/proposals');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Delegations' }).click();
  await expect(page).toHaveURL('/delegations');
  await expect(page.getByRole('link', { name: 'Delegations' })).not.toBeVisible();
});
