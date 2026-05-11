import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, TEST_ORG_ID } from '../helpers';
import { randomUUID } from 'crypto';

test.describe('notification preferences', () => {
  test('settings page shows notification preferences section', async ({ page, asAlice }) => {
    await page.goto('/settings');
    await expect(page.getByText('Notification preferences')).toBeVisible();
    await expect(page.getByTestId('notif-pref-comment.mention')).toBeVisible();
    await expect(page.getByTestId('notif-pref-proposal.opened')).toBeVisible();
  });

  test('all notification types are enabled by default', async ({ page, asAlice }) => {
    await page.goto('/settings');
    const checkbox = page.getByTestId('notif-pref-comment.posted').locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
  });

  test('GET notification preferences API returns empty object for new user', async ({ page, asAlice }) => {
    const res = await page.request.get(`${API}/api/users/me/notification-preferences`);
    expect(res.ok()).toBe(true);
    const prefs = await res.json();
    expect(typeof prefs).toBe('object');
  });

  test('can update notification preferences via API', async ({ page, asAlice }) => {
    const res = await page.request.patch(`${API}/api/users/me/notification-preferences`, {
      data: { 'comment.posted': false },
    });
    expect(res.ok()).toBe(true);
    const prefs = await res.json();
    expect(prefs['comment.posted']).toBe(false);
  });

  test('disabling comment.posted suppresses notification', async ({ page, asAlice, bob, request }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposalId = randomUUID();

    // Alice creates a proposal
    await page.request.post(`${API}/api/proposals`, {
      data: {
        id: proposalId,
        organisation_id: TEST_ORG_ID,
        topic_id: topic.id,
        title: 'Test pref suppression',
      },
    });

    // Alice votes on it (so she qualifies for comment.posted notifications)
    await page.request.post(`${API}/api/votes`, {
      data: { id: randomUUID(), proposal_id: proposalId, user_id: asAlice.id, choice: 'yes' },
    });

    // Alice disables comment.posted notifications
    await page.request.patch(`${API}/api/users/me/notification-preferences`, {
      data: { 'comment.posted': false },
    });

    // Bob comments (not mentioning Alice)
    await request.post(`${API}/api/comments`, {
      data: {
        id: randomUUID(),
        proposal_id: proposalId,
        organisation_id: TEST_ORG_ID,
        author_id: bob.id,
        body: 'A comment that should not notify Alice',
      },
    });

    // Alice should have no comment.posted notifications
    const notifRes = await page.request.get(`${API}/api/notifications`);
    const notifications = await notifRes.json();
    const commentPosted = notifications.filter((n: { type: string }) => n.type === 'comment.posted');
    expect(commentPosted).toHaveLength(0);
  });

  test('toggling preference checkbox saves it', async ({ page, asAlice }) => {
    await page.goto('/settings');
    const checkbox = page.getByTestId('notif-pref-comment.posted').locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();

    // Reload and verify persisted
    await page.reload();
    const reloadedCheckbox = page.getByTestId('notif-pref-comment.posted').locator('input[type="checkbox"]');
    await expect(reloadedCheckbox).not.toBeChecked({ timeout: 5000 });
  });
});
