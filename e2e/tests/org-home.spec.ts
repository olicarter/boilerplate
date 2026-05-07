import { test, expect } from '../fixtures';
import { createTopic, createProposal, createVote } from '../helpers';

test('org home page shows org name and slug', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test');
  await expect(page.getByRole('heading', { name: 'Ripple Test' })).toBeVisible();
  await expect(page.getByText('/ripple-test')).toBeVisible();
});

test('org home page shows member count', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test');
  // The stat card shows the label "member" or "members" below the count
  await expect(page.getByText(/^members?$/).first()).toBeVisible();
});

test('org home page shows proposal stats', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Governance');
  await createProposal(page.request, topic.id, 'Home page stat test');

  await page.goto('/orgs/ripple-test');
  await expect(page.getByText('proposals', { exact: true })).toBeVisible();
});

test('org home page shows quick nav links', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test');
  await expect(page.getByRole('link', { name: '🗳 Proposals' })).toBeVisible();
  await expect(page.getByRole('link', { name: '↔ Delegations' })).toBeVisible();
  await expect(page.getByRole('link', { name: '👥 Members' })).toBeVisible();
});

test('quick nav Proposals link navigates to proposals page', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test');
  await page.getByRole('link', { name: '🗳 Proposals' }).click();
  await expect(page).toHaveURL('/orgs/ripple-test/proposals');
});

test('org home page shows recent proposals', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  await createProposal(page.request, topic.id, 'Recent proposal on home page');

  await page.goto('/orgs/ripple-test');
  await expect(page.getByText('Recent proposals')).toBeVisible();
  await expect(page.getByText('Recent proposal on home page')).toBeVisible();
});

test('recent proposal links to proposal detail', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Linked recent proposal');

  await page.goto('/orgs/ripple-test');
  await page.getByText('Linked recent proposal').click();
  await expect(page).toHaveURL(`/orgs/ripple-test/proposals/${proposal.id}`);
});

test('org list navigates to org home page when clicking org card', async ({ page, asAlice }) => {
  await page.goto('/');
  await page.getByText('Ripple Test').click();
  await expect(page).toHaveURL('/orgs/ripple-test');
});

test('View all link goes to proposals page', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test');
  await page.getByRole('link', { name: 'View all →' }).click();
  await expect(page).toHaveURL('/orgs/ripple-test/proposals');
});
