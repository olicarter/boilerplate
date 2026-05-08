import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal, createVote } from '../helpers';

test.describe('delegation chain UI', () => {
  test('shows delegation chain banner when delegate has voted', async ({ page, asAlice, bob }) => {
    // Bob votes, Alice delegates to Bob
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Chain test proposal');

    // Alice delegates to Bob
    await page.request.post(`${API}/api/delegations`, {
      data: { id: '00000000-0000-0000-0000-000000000501', organisation_id: '00000000-0000-0000-0000-000000000002', delegator_id: asAlice.id, delegate_id: bob.id, topic_id: null },
    });

    // Bob votes yes
    await createVote(page.request, proposal.id, bob.id, 'yes');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('Your vote flows', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('You', { exact: true })).toBeVisible();
    await expect(page.getByText('Bob', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('yes', { exact: true }).first()).toBeVisible();
  });

  test('shows chain without voter when delegate has not yet voted', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'No vote yet proposal');

    await page.request.post(`${API}/api/delegations`, {
      data: { id: '00000000-0000-0000-0000-000000000502', organisation_id: '00000000-0000-0000-0000-000000000002', delegator_id: asAlice.id, delegate_id: bob.id, topic_id: null },
    });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText("delegate hasn't voted yet", { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('chain banner disappears after user casts own vote', async ({ page, asAlice, bob }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Override delegation');

    await page.request.post(`${API}/api/delegations`, {
      data: { id: '00000000-0000-0000-0000-000000000503', organisation_id: '00000000-0000-0000-0000-000000000002', delegator_id: asAlice.id, delegate_id: bob.id, topic_id: null },
    });
    await createVote(page.request, proposal.id, bob.id, 'no');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('Your vote flows', { exact: false })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'yes', exact: true }).click();
    await expect(page.getByText('Your vote flows', { exact: false })).not.toBeVisible({ timeout: 10000 });
  });

  test('no chain banner shown when user voted directly', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Direct vote');
    await createVote(page.request, proposal.id, asAlice.id, 'yes');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('Your vote flows', { exact: false })).not.toBeVisible({ timeout: 10000 });
  });
});
