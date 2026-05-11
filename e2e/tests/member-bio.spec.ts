import { test, expect, ORG_SLUG } from '../fixtures';

test.describe('member bio', () => {
  test('bio input is visible on settings page', async ({ page, asAlice }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('bio-input')).toBeVisible();
  });

  test('save bio button is disabled when bio matches current value', async ({ page, asAlice }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('save-bio-btn')).toBeDisabled();
  });

  test('can save a bio', async ({ page, asAlice }) => {
    await page.goto('/settings');
    await page.getByTestId('bio-input').fill('I care deeply about policy.');
    await page.getByTestId('save-bio-btn').click();
    await expect(page.getByText('Bio updated')).toBeVisible({ timeout: 5000 });
  });

  test('bio appears on user profile page', async ({ page, asAlice }) => {
    await page.goto('/settings');
    await page.getByTestId('bio-input').fill('Democracy enthusiast.');
    await page.getByTestId('save-bio-btn').click();
    await expect(page.getByText('Bio updated')).toBeVisible({ timeout: 5000 });

    await page.goto(`/orgs/${ORG_SLUG}/users/${asAlice.id}`);
    await expect(page.getByTestId('user-bio')).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('user-bio')).toContainText('Democracy enthusiast.');
  });

  test('bio is not shown when empty', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/users/${asAlice.id}`);
    await expect(page.getByTestId('user-bio')).not.toBeVisible();
  });
});
