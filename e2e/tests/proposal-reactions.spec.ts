import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('proposal reactions', () => {
  test('reaction buttons are visible on proposal detail', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'React to this');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await expect(page.getByTestId('reaction-👍')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('reaction-👎')).toBeVisible();
  });

  test('clicking a reaction button registers the reaction', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'React please');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await page.getByTestId('reaction-👍').click({ timeout: 8000 });

    // Count should show 1
    await expect(page.getByTestId('reaction-👍')).toContainText('1', { timeout: 5000 });
  });

  test('clicking the same reaction again removes it', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Toggle reaction');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await page.getByTestId('reaction-👍').click({ timeout: 8000 });
    await expect(page.getByTestId('reaction-👍')).toContainText('1', { timeout: 4000 });

    await page.getByTestId('reaction-👍').click();
    // Count should disappear (no text or 0)
    await expect(page.getByTestId('reaction-👍')).not.toContainText('1', { timeout: 4000 });
  });

  test('switching emoji changes existing reaction', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Switch reaction');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await page.getByTestId('reaction-👍').click({ timeout: 8000 });
    await expect(page.getByTestId('reaction-👍')).toContainText('1', { timeout: 4000 });

    await page.getByTestId('reaction-👎').click();
    await expect(page.getByTestId('reaction-👎')).toContainText('1', { timeout: 4000 });
    await expect(page.getByTestId('reaction-👍')).not.toContainText('1', { timeout: 2000 });
  });

  test('reactions API returns list', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'API reactions test');

    await page.request.post(`${API}/api/proposals/${id}/reactions`, {
      data: { emoji: '👍' },
    });

    const res = await page.request.get(`${API}/api/proposals/${id}/reactions`);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0].emoji).toBe('👍');
  });
});
