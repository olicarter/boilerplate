import { test, expect, ORG_SLUG } from '../fixtures';

test.describe('proposal templates', () => {
  test('admin can see proposal templates section in admin page', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByText('Proposal templates')).toBeVisible();
    await expect(page.getByTestId('template-name-input')).toBeVisible();
    await expect(page.getByTestId('add-template-btn')).toBeVisible();
  });

  test('add template-btn is disabled when name is empty', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByTestId('add-template-btn')).toBeDisabled();
  });

  test('admin can add a template', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await page.getByTestId('template-name-input').fill('Standard policy vote');
    await page.getByTestId('add-template-btn').click();
    await expect(page.getByTestId('template-row').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('Standard policy vote')).toBeVisible();
  });

  test('template appears in new proposal form dropdown', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await page.getByTestId('template-name-input').fill('Budget approval');
    await page.getByTestId('add-template-btn').click();
    await expect(page.getByTestId('template-row').first()).toBeVisible({ timeout: 6000 });

    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await expect(page.getByTestId('use-template-select')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('use-template-select')).toContainText('Budget approval');
  });

  test('selecting a template pre-fills description', async ({ page, asAlice }) => {
    // Add template via admin
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await page.getByTestId('template-name-input').fill('My template');
    await page.locator('input[placeholder="Description (optional)"]').fill('Pre-filled description text');
    await page.getByTestId('add-template-btn').click();
    await expect(page.getByTestId('template-row').first()).toBeVisible({ timeout: 6000 });

    // Use template in new proposal form
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await expect(page.getByTestId('use-template-select')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('use-template-select').selectOption({ label: 'My template' });
    await expect(page.locator('#new-proposal-description')).toHaveValue('Pre-filled description text', { timeout: 3000 });
  });

  test('admin can remove a template', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await page.getByTestId('template-name-input').fill('Removable template');
    await page.getByTestId('add-template-btn').click();
    await expect(page.getByTestId('template-row').first()).toBeVisible({ timeout: 6000 });

    await page.getByTestId('template-row').first().getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByTestId('template-row')).not.toBeVisible({ timeout: 5000 });
  });
});
