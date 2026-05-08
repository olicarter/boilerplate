import { test, expect, API } from '../fixtures';
import { createTopic, createProposal, createVote, createDelegation } from '../helpers';

// ── Delegation override ──────────────────────────────────────────────────────

test('shows delegation override banner when delegate has voted', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Solar panels on roof');

  // Alice delegates to Bob globally
  await createDelegation(page.request, asAlice.id, bob.id);

  // Bob votes yes (using bob fixture's standalone request context)
  await createVote(page.request, proposal.id, bob.id, 'yes');

  // Alice views the proposal — should see the delegation chain banner
  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Your vote flows', { exact: false })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Bob', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('yes', { exact: true }).first()).toBeVisible();
});

test('delegation banner not shown when user voted directly', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Wind turbines');

  await createDelegation(page.request, asAlice.id, bob.id);
  await createVote(page.request, proposal.id, bob.id, 'yes');

  // Alice also votes directly
  await createVote(page.request, proposal.id, asAlice.id, 'no');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Your vote flows', { exact: false })).not.toBeVisible({ timeout: 10000 });
});

test('delegation banner disappears after casting own vote', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Insulation grants');

  await createDelegation(page.request, asAlice.id, bob.id);
  await createVote(page.request, proposal.id, bob.id, 'yes');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Your vote flows', { exact: false })).toBeVisible({ timeout: 10000 });

  // Alice votes directly
  await page.getByRole('button', { name: 'no', exact: true }).click();
  await expect(page.getByText('Your vote flows', { exact: false })).not.toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Vote cast')).toBeVisible();
});

// ── Delegation expiry ────────────────────────────────────────────────────────

test('expired delegation is not counted in tally', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Finance');
  const proposal = await createProposal(page.request, topic.id, 'Budget proposal');

  // Alice delegates to Bob, but the delegation already expired
  const pastDate = new Date(Date.now() - 60_000).toISOString();
  await createDelegation(page.request, asAlice.id, bob.id, null, pastDate);

  // Bob votes yes
  await createVote(page.request, proposal.id, bob.id, 'yes');

  // Tally: only Bob's direct vote counts, Alice's expired delegation is ignored
  // total should be 1 (Bob only), not 2 (Bob + delegated Alice)
  const res = await page.request.get(`${API}/api/proposals/${proposal.id}/tally`);
  const tally = await res.json();
  expect(tally.total).toBe(1);
  expect(tally.yes).toBe(1);
});

test('active delegation (with future expiry) is counted in tally', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Finance');
  const proposal = await createProposal(page.request, topic.id, 'Investment proposal');

  // Alice delegates to Bob with a future expiry
  const futureDate = new Date(Date.now() + 86_400_000).toISOString();
  await createDelegation(page.request, asAlice.id, bob.id, null, futureDate);

  // Bob votes yes
  await createVote(page.request, proposal.id, bob.id, 'yes');

  // Tally: Bob's vote + Alice's delegated vote = 2 total
  const res = await page.request.get(`${API}/api/proposals/${proposal.id}/tally`);
  const tally = await res.json();
  expect(tally.total).toBe(2);
  expect(tally.yes).toBe(2);
});

test('expired delegation shows Expired badge in delegations list', async ({ page, asAlice, bob }) => {
  // Create an already-expired delegation
  const pastDate = new Date(Date.now() - 60_000).toISOString();
  await createDelegation(page.request, asAlice.id, bob.id, null, pastDate);

  await page.goto('/orgs/ripple-test/delegations');
  await expect(page.getByText('Expired')).toBeVisible();
});

test('delegation with future expiry shows expiry date in list', async ({ page, asAlice, bob }) => {
  const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await createDelegation(page.request, asAlice.id, bob.id, null, futureDate);

  await page.goto('/orgs/ripple-test/delegations');
  await expect(page.getByText(/expires/)).toBeVisible();
});
