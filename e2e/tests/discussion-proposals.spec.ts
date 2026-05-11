import { test, expect, ORG_SLUG } from '../fixtures';
import { createTopic } from '../helpers';

test.describe('discussion-only proposals', () => {
  test('Discussion type can be selected when creating a proposal', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await expect(page.getByTestId('proposal-type-discussion')).toBeVisible();
  });

  test('voting fields are hidden when Discussion type is selected', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await page.getByTestId('proposal-type-discussion').click();

    // Voting deadline and threshold should not be visible
    await expect(page.locator('#new-proposal-closes-at')).not.toBeVisible();
    await expect(page.locator('#new-proposal-threshold')).not.toBeVisible();
  });

  test('discussion proposal shows Discussion badge in list', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();

    // Select topic
    await page.locator('#new-proposal-topic').selectOption(topic.id);
    // Switch to discussion type
    await page.getByTestId('proposal-type-discussion').click();
    // Fill title
    await page.locator('#new-proposal-title').fill('A discussion thread');
    await page.getByRole('button', { name: 'Create proposal' }).click();

    await expect(page.getByText('Discussion', { exact: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test('discussion proposal detail has no vote buttons', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();

    await page.locator('#new-proposal-topic').selectOption(topic.id);
    await page.getByTestId('proposal-type-discussion').click();
    await page.locator('#new-proposal-title').fill('No vote discussion');
    await page.getByRole('button', { name: 'Create proposal' }).click();

    // Click through to the proposal
    await page.getByText('No vote discussion').click();

    await expect(page.getByRole('button', { name: 'yes' })).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'no', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'abstain' })).not.toBeVisible();
    await expect(page.getByText('Discussion').first()).toBeVisible();
  });
});
