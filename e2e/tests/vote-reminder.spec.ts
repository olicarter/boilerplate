import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('vote reminder', () => {
  test('send vote reminder button visible for moderator on open proposal', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Reminder test');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('send-vote-reminder')).toBeVisible({ timeout: 6000 });
  });

  test('send vote reminder button not visible on closed proposal', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Closed proposal');
    await page.request.post(`${API}/api/proposals/${proposal.id}/close`);

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('send-vote-reminder')).not.toBeVisible({ timeout: 6000 });
  });

  test('send vote reminder button not visible on discussion proposals', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Discussion type', { proposal_type: 'discussion' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('send-vote-reminder')).not.toBeVisible({ timeout: 6000 });
  });

  test('clicking send vote reminder shows success toast', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Toast test');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('send-vote-reminder').click();
    await expect(page.getByText('Vote reminder sent')).toBeVisible({ timeout: 5000 });
  });

  test('vote reminder API returns count of non-voters notified', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'API count test');

    const res = await page.request.post(`${API}/api/proposals/${proposal.id}/vote-reminder`);
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(typeof body.count).toBe('number');
  });
});
