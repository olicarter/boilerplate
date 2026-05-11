import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('pinned proposals', () => {
  test('moderator can pin a proposal from detail page', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Proposal to pin');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await page.getByTestId('pin-proposal').click({ timeout: 8000 });
    await expect(page.getByTestId('pinned-badge')).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('unpin-proposal')).toBeVisible();
  });

  test('pinned proposal appears at top of list', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    await createProposal(page.request, topic.id, 'First created');
    const { id: pinnedId } = await createProposal(page.request, topic.id, 'To be pinned');

    // Pin via API
    await page.request.post(`${API}/api/proposals/${pinnedId}/pin`);

    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    const cards = page.locator('[data-testid="proposal-card"], a[href*="/proposals/"]');
    await expect(cards.first()).toContainText('To be pinned', { timeout: 8000 });
  });

  test('moderator can unpin a proposal', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Pinned proposal');
    await page.request.post(`${API}/api/proposals/${id}/pin`);

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await expect(page.getByTestId('pinned-badge')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('unpin-proposal').click();
    await expect(page.getByTestId('pinned-badge')).not.toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('pin-proposal')).toBeVisible();
  });

  test('pin/unpin via API returns updated proposal', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Via API');

    const pinRes = await page.request.post(`${API}/api/proposals/${id}/pin`);
    expect(pinRes.ok()).toBe(true);
    const pinned = (await pinRes.json() as { item: { pinned: boolean } }).item;
    expect(pinned.pinned).toBe(true);

    const unpinRes = await page.request.post(`${API}/api/proposals/${id}/unpin`);
    expect(unpinRes.ok()).toBe(true);
    const unpinned = (await unpinRes.json() as { item: { pinned: boolean } }).item;
    expect(unpinned.pinned).toBe(false);
  });

  test('pinned badge shows on detail page', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Pinned forever');
    await page.request.post(`${API}/api/proposals/${id}/pin`);

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await expect(page.getByTestId('pinned-badge')).toBeVisible({ timeout: 8000 });
  });
});
