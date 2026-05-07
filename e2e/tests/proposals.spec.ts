import { test, expect, API } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test('shows empty state when no proposals', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('No proposals yet')).toBeVisible();
});

test('shows proposals list', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  await createProposal(page.request, topic.id, 'Ban single-use plastics');
  await createProposal(page.request, topic.id, 'Expand national parks');

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('Ban single-use plastics')).toBeVisible();
  await expect(page.getByText('Expand national parks')).toBeVisible();
});

test('shows topic filter pills', async ({ page, asAlice }) => {
  const env = await createTopic(page.request, 'Environment');
  const eco = await createTopic(page.request, 'Economy');
  await createProposal(page.request, env.id, 'Green proposal');
  await createProposal(page.request, eco.id, 'Tax reform');

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByRole('button', { name: 'All topics' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Environment' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Economy' })).toBeVisible();
});

test('topic filter shows only matching proposals', async ({ page, asAlice }) => {
  const env = await createTopic(page.request, 'Environment');
  const eco = await createTopic(page.request, 'Economy');
  await createProposal(page.request, env.id, 'Green proposal');
  await createProposal(page.request, eco.id, 'Tax reform');

  await page.goto('/orgs/ripple-test/proposals');
  await page.getByRole('button', { name: 'Environment' }).click();
  await expect(page.getByText('Green proposal')).toBeVisible();
  await expect(page.getByText('Tax reform')).not.toBeVisible();
});

test('"All topics" filter restores full list', async ({ page, asAlice }) => {
  const env = await createTopic(page.request, 'Environment');
  const eco = await createTopic(page.request, 'Economy');
  await createProposal(page.request, env.id, 'Green proposal');
  await createProposal(page.request, eco.id, 'Tax reform');

  await page.goto('/orgs/ripple-test/proposals');
  await page.getByRole('button', { name: 'Environment' }).click();
  await page.getByRole('button', { name: 'All topics' }).click();
  await expect(page.getByText('Green proposal')).toBeVisible();
  await expect(page.getByText('Tax reform')).toBeVisible();
});

test('"+ New proposal" button hidden when logged out', async ({ page }) => {
  await page.goto('/orgs/ripple-test/proposals');
  // Auth gate shows sign-in panel when not logged in
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ New proposal' })).not.toBeVisible();
});

test('"+ New proposal" button visible when logged in', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByRole('button', { name: '+ New proposal' })).toBeVisible();
});

test('can create a proposal with an existing topic', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Healthcare');

  await page.goto('/orgs/ripple-test/proposals');
  await page.getByRole('button', { name: '+ New proposal' }).click();

  await page.getByLabel('Title').fill('Free dental care');
  await page.getByLabel('Description').fill('Extend NHS dental provision.');
  await page.getByLabel('Topic').selectOption({ label: 'Healthcare' });
  await page.getByRole('button', { name: 'Create proposal' }).click();

  await expect(page.getByText('Free dental care')).toBeVisible();
});

test('can create a proposal with a new topic', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/proposals');
  await page.getByRole('button', { name: '+ New proposal' }).click();

  await page.getByLabel('Title').fill('Build cycle lanes');
  await page.getByLabel('Topic').selectOption({ label: '＋ New topic…' });
  await page.getByLabel('New topic name').fill('Transport');
  await page.getByRole('button', { name: 'Create proposal' }).click();

  await expect(page.getByText('Build cycle lanes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Transport' })).toBeVisible();
});

test('proposal card shows topic badge and status', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Economy');
  await createProposal(page.request, topic.id, 'Tax reform');

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('Economy').first()).toBeVisible();
  // "Open" badge inside the proposal card (not the filter button)
  await expect(page.getByRole('link', { name: /Tax reform/ }).getByText('Open')).toBeVisible();
});

test('proposal card shows vote counts', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Economy');
  const proposal = await createProposal(page.request, topic.id, 'Tax reform');

  // Alice votes yes on the proposal
  await page.request.post(`${API}/api/votes`, {
    data: { id: crypto.randomUUID(), proposal_id: proposal.id, user_id: asAlice.id, choice: 'yes' },
  });

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('↑ 1')).toBeVisible();
});
