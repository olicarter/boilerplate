import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('@mention autocomplete', () => {
  test('mention dropdown appears when typing @', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Mention test proposal');
    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    const ta = page.getByTestId('comment-body');
    await ta.click();
    await ta.type('@');

    await expect(page.getByTestId('mention-dropdown')).toBeVisible({ timeout: 5000 });
  });

  test('mention dropdown filters by query', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Mention filter test');
    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    const ta = page.getByTestId('comment-body');
    await ta.click();
    await ta.type('@Bo');

    await expect(page.getByTestId('mention-dropdown')).toBeVisible({ timeout: 5000 });
    // Should show Bob's suggestion
    await expect(page.getByTestId('mention-suggestion').filter({ hasText: 'Bob' })).toBeVisible();
  });

  test('clicking a suggestion inserts @Name into the textarea', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Mention insert test');
    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    const ta = page.getByTestId('comment-body');
    await ta.click();
    await ta.type('Hello @Bo');

    await expect(page.getByTestId('mention-dropdown')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('mention-suggestion').filter({ hasText: 'Bob' }).click();

    await expect(ta).toHaveValue(/Hello @Bob /);
    // Dropdown should be closed after selection
    await expect(page.getByTestId('mention-dropdown')).not.toBeVisible();
  });

  test('comment.mention notification is sent to mentioned user', async ({
    page,
    asAlice,
    bob,
    request,
  }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Mention notification test');

    // Post a comment mentioning Bob via the API (Alice's session)
    await page.request.post(`${API}/api/proposals/${proposal.id}/comments`, {
      data: { id: crypto.randomUUID(), body: `Hey @${bob.name} check this out` },
    });

    // Bob should receive a comment.mention notification
    const notifRes = await request.get(`${API}/api/notifications`);
    const notifications = await notifRes.json();
    const mentionNotif = notifications.find(
      (n: { type: string; target_id: string }) =>
        n.type === 'comment.mention' && n.target_id === proposal.id,
    );
    expect(mentionNotif).toBeTruthy();
  });

  test('mention dropdown closes on Escape', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Mention escape test');
    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    const ta = page.getByTestId('comment-body');
    await ta.click();
    await ta.type('@Bo');

    await expect(page.getByTestId('mention-dropdown')).toBeVisible({ timeout: 5000 });
    await ta.press('Escape');
    await expect(page.getByTestId('mention-dropdown')).not.toBeVisible();
  });

  test('Tab key selects first suggestion', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Mention tab test');
    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    const ta = page.getByTestId('comment-body');
    await ta.click();
    await ta.type('@Bo');

    await expect(page.getByTestId('mention-suggestion').first()).toBeVisible({ timeout: 5000 });
    await ta.press('Tab');
    await expect(ta).toHaveValue(/@Bob /);
  });
});
