import { test, expect, ORG_SLUG, API } from '../fixtures';
import { createTopic } from '../helpers';

test.describe('proposal boosting', () => {
  test('boost button visible when org has boost_threshold set', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { boost_threshold: 3 } });

    const topic = await createTopic(page.request, 'Governance');
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await page.locator('#new-proposal-topic').selectOption(topic.id);
    await page.locator('#new-proposal-title').fill('Boost test proposal');
    await page.getByRole('button', { name: 'Create proposal' }).click();
    await page.getByText('Boost test proposal').click();

    await expect(page.getByTestId('boost-btn')).toBeVisible({ timeout: 8000 });
  });

  test('clicking boost shows remove button', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { boost_threshold: 5 } });

    const topic = await createTopic(page.request, 'Governance');
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await page.locator('#new-proposal-topic').selectOption(topic.id);
    await page.locator('#new-proposal-title').fill('Boost increment test');
    await page.getByRole('button', { name: 'Create proposal' }).click();
    await page.getByText('Boost increment test').click();

    await page.getByTestId('boost-btn').click();
    await expect(page.getByTestId('unboost-btn')).toBeVisible({ timeout: 6000 });
  });
});
