import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';
import { randomUUID } from 'crypto';

test.describe('activity feed', () => {
  test('activity feed page loads and shows heading', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/activity`);
    await expect(page.getByRole('heading', { name: 'Activity feed' })).toBeVisible();
  });

  test('nav shows Activity link', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await expect(page.getByRole('link', { name: 'Activity' })).toBeVisible();
  });

  test('opened proposal appears in activity feed', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'My unique activity proposal');

    await page.goto(`/orgs/${ORG_SLUG}/activity`);
    await expect(page.getByText('My unique activity proposal')).toBeVisible({ timeout: 8000 });
  });

  test('comment shows in activity feed', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'A proposal with comments');

    await page.request.post(`${API}/api/proposals/${id}/comments`, {
      data: {
        id: randomUUID(),
        body: 'Unique feed comment text',
      },
    });

    await page.goto(`/orgs/${ORG_SLUG}/activity`);
    await expect(page.getByTestId('activity-event-comment_posted')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Unique feed comment text/)).toBeVisible({ timeout: 5000 });
  });

  test('member joined event shows in feed', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/activity`);
    await expect(page.getByTestId('activity-event-member_joined').first()).toBeVisible({ timeout: 8000 });
  });

  test('activity link navigates to feed', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('link', { name: 'Activity' }).click();
    await expect(page).toHaveURL(/\/activity/);
    await expect(page.getByRole('heading', { name: 'Activity feed' })).toBeVisible();
  });
});
