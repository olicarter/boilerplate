import { test, expect, API } from '../fixtures';
import { createTopic, createProposal, createVote } from '../helpers';

// ── Author ──────────────────────────────────────────────────────────────────

test('proposal card shows author name', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Governance');
  await createProposal(page.request, topic.id, 'Author test proposal');

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('by Alice')).toBeVisible();
});

test('proposal detail shows author with link to profile', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Governance');
  const proposal = await createProposal(page.request, topic.id, 'Author link proposal');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  const authorLink = page.getByRole('main').getByRole('link', { name: 'Alice' });
  await expect(authorLink).toBeVisible();
  await authorLink.click();
  await expect(page).toHaveURL(new RegExp(`/users/${asAlice.id}`));
});

// ── Voting deadline ─────────────────────────────────────────────────────────

test('proposal card shows deadline countdown for open proposals', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  // Use 7 days so floor(6.999...) = 6 — still clearly "days left" territory
  const closesAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await createProposal(page.request, topic.id, 'Deadline proposal', { closes_at: closesAt });

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText(/\dd left/)).toBeVisible();
});

test('proposal detail shows deadline countdown', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const closesAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const proposal = await createProposal(page.request, topic.id, 'Detail deadline', { closes_at: closesAt });

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText(/\d+ days? left/)).toBeVisible();
});

test('proposals without a deadline show Open badge instead of countdown', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  await createProposal(page.request, topic.id, 'No deadline proposal');

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByRole('link', { name: /No deadline proposal/ }).getByText('Open')).toBeVisible();
});

test('create proposal form has a voting deadline field', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/proposals');
  await page.getByRole('button', { name: '+ New proposal' }).click();
  await expect(page.getByLabel('Voting deadline')).toBeVisible();
});

test('create proposal form has a passing threshold field', async ({ page, asAlice }) => {
  await page.goto('/orgs/ripple-test/proposals');
  await page.getByRole('button', { name: '+ New proposal' }).click();
  await expect(page.getByLabel('Passing threshold')).toBeVisible();
});

// ── Passing threshold & pass/fail ───────────────────────────────────────────

test('closed proposal with majority yes shows Passed', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Budget');
  // Vote before closing — the lock only applies to closed proposals
  const proposal = await createProposal(page.request, topic.id, 'Budget increase');
  await createVote(page.request, proposal.id, asAlice.id, 'yes');
  await createVote(page.request, proposal.id, bob.id, 'yes');
  await page.request.post(`${API}/api/proposals/${proposal.id}/close`);

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('Passed')).toBeVisible();
});

test('closed proposal with minority yes shows Failed', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Budget');
  const proposal = await createProposal(page.request, topic.id, 'Cut budget');
  await createVote(page.request, proposal.id, asAlice.id, 'no');
  await createVote(page.request, proposal.id, bob.id, 'no');
  await page.request.post(`${API}/api/proposals/${proposal.id}/close`);

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('Failed')).toBeVisible();
});

test('closed proposal detail shows result banner with percentage', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'New policy', { threshold: 60 });
  await createVote(page.request, proposal.id, asAlice.id, 'yes');
  await createVote(page.request, proposal.id, bob.id, 'no');
  await page.request.post(`${API}/api/proposals/${proposal.id}/close`);

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  // 50% yes, requires 60% → Failed
  await expect(page.getByText('Proposal failed')).toBeVisible();
  await expect(page.getByText(/60% required/)).toBeVisible();
});

test('closed proposal with no votes shows No votes result', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Untouched proposal', { status: 'closed' });

  await page.goto('/orgs/ripple-test/proposals');
  await expect(page.getByText('No votes')).toBeVisible();
});

test('can create a proposal with a custom threshold', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Constitutional');
  await page.goto('/orgs/ripple-test/proposals');

  await page.getByRole('button', { name: '+ New proposal' }).click();
  await page.getByLabel('Title').fill('Supermajority required');
  await page.getByLabel('Topic').selectOption({ label: 'Constitutional' });
  await page.getByLabel('Passing threshold').fill('66');
  await page.getByRole('button', { name: 'Create proposal' }).click();

  // Proposal appears in the list
  await expect(page.getByText('Supermajority required')).toBeVisible();
});
