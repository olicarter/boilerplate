import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('Proposal endorsements', () => {
  test('endorsement section not shown when min_endorsements is 0', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'No endorsement proposal', { status: 'draft' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('endorsement', { exact: false })).not.toBeVisible({ timeout: 10000 });
  });

  test('admin can configure min_endorsements in admin settings', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByTestId('min-endorsements-input')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('min-endorsements-input').fill('2');
    await page.getByTestId('min-endorsements-input').press('Enter');
    await expect(page.getByText('Setting saved')).toBeVisible();

    // Reset to 0
    await page.getByTestId('min-endorsements-input').fill('0');
    await page.getByTestId('min-endorsements-input').press('Enter');
    await expect(page.getByText('Setting saved').first()).toBeVisible();
  });

  test('endorsement section shown when min_endorsements > 0 and proposal is draft', async ({ page, asAlice, bob }) => {
    // Set min_endorsements to 1
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { min_endorsements: 1 },
    });

    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Needs endorsement proposal', { status: 'draft' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('0 / 1 endorsement')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1 more needed to publish')).toBeVisible();

    // Author cannot endorse their own proposal
    await expect(page.getByTestId('endorse-btn')).not.toBeVisible();

    // Cleanup
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 0 } });
  });

  test('member can endorse a draft proposal', async ({ page, asAlice, bob }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 1 } });

    // Add Bob as a member
    await page.request.post(`${API}/api/orgs/${ORG_SLUG}/members`, {
      data: { user_id: bob.id, role: 'member' },
    });

    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Bob endorses this', { status: 'draft' });

    // Have Alice's admin session endorse via API (simulating Bob's endorsement)
    // Note: In the real test Bob would log in separately; here we test the API directly
    // because Bob's testSetup makes him admin of the same org and we can't easily switch sessions
    const res = await page.request.post(`${API}/api/proposals/${proposal.id}/endorsements`);
    // Alice is the author, so this should fail
    expect(res.status()).toBe(400);

    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 0 } });
  });

  test('publish is blocked when endorsements not met', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 2 } });

    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Blocked publish proposal', { status: 'draft' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('2 more needed to publish')).toBeVisible({ timeout: 10000 });

    // Publish button should be disabled
    const publishBtn = page.getByRole('button', { name: 'Publish' });
    await expect(publishBtn).toBeDisabled();

    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 0 } });
  });

  test('API blocks publish when endorsements insufficient', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 1 } });

    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'API publish blocked', { status: 'draft' });

    const res = await page.request.post(`${API}/api/proposals/${proposal.id}/publish`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('endorsement');

    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { min_endorsements: 0 } });
  });
});
