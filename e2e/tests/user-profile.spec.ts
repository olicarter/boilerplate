import { test, expect } from '../fixtures';
import { createTopic, createProposal, createVote, createDelegation } from '../helpers';

test('shows user name and email', async ({ page, asAlice }) => {
  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText(asAlice.name)).toBeVisible();
  await expect(page.getByText(asAlice.email)).toBeVisible();
});

test('shows "(you)" on own profile', async ({ page, asAlice }) => {
  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText('(you)')).toBeVisible();
});

test('does not show "(you)" on another user\'s profile', async ({ page, asAlice, bob }) => {
  await page.goto(`/users/${bob.id}`);
  await expect(page.getByText('(you)')).not.toBeVisible();
});

test('shows "Manage your delegations" link on own profile', async ({ page, asAlice }) => {
  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByRole('link', { name: 'Manage your delegations →' })).toBeVisible();
});

test('"Manage your delegations" link not shown on other profiles', async ({ page, asAlice, bob }) => {
  await page.goto(`/users/${bob.id}`);
  await expect(page.getByRole('link', { name: 'Manage your delegations →' })).not.toBeVisible();
});

test('shows member since date', async ({ page, asAlice }) => {
  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText(/Member since/)).toBeVisible();
});

test('shows vote history', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');
  await createVote(page.request, proposal.id, asAlice.id, 'yes');

  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText('Votes (1)')).toBeVisible();
  await expect(page.getByText('Ban plastics')).toBeVisible();
  await expect(page.getByText('yes')).toBeVisible();
});

test('vote history links to the proposal', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');
  await createVote(page.request, proposal.id, asAlice.id, 'yes');

  await page.goto(`/users/${asAlice.id}`);
  await page.getByRole('link', { name: 'Ban plastics' }).click();

  await expect(page).toHaveURL(`/proposals/${proposal.id}`);
});

test('shows empty vote history', async ({ page, asAlice }) => {
  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText('Votes (0)')).toBeVisible();
  await expect(page.getByText('No votes cast yet.')).toBeVisible();
});

test('shows outgoing delegations', async ({ page, asAlice, bob }) => {
  await createDelegation(page.request, asAlice.id, bob.id, null);

  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText('Delegations (1)')).toBeVisible();
  await expect(page.getByText('Delegates to')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bob' })).toBeVisible();
});

test('shows empty delegations', async ({ page, asAlice }) => {
  await page.goto(`/users/${asAlice.id}`);
  await expect(page.getByText('Delegations (0)')).toBeVisible();
  await expect(page.getByText('No delegations set.')).toBeVisible();
});
