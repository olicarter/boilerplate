import { test, expect, API } from '../fixtures';
import { createTopic, createProposal, createVote, TEST_ORG_ID } from '../helpers';

test('navigating to a proposal shows its detail page', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics', { description: 'Phase out single-use plastics.' });

  await page.goto('/orgs/ripple-test/proposals');
  await page.getByText('Ban plastics').click();

  await expect(page).toHaveURL(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByRole('heading', { name: 'Ban plastics' })).toBeVisible();
});

test('shows description, topic badge and status', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics', { description: 'Phase out single-use plastics.' });

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Phase out single-use plastics.')).toBeVisible();
  await expect(page.getByText('Environment')).toBeVisible();
  await expect(page.getByText('open')).toBeVisible();
});

test('shows Results tally section', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Results')).toBeVisible();
  await expect(page.getByText(/votes total/)).toBeVisible();
});

test('shows sign-in panel when logged out', async ({ page, asAlice }) => {
  // Open a fresh context without Alice's session
  const anonContext = await page.context().browser()!.newContext({ ignoreHTTPSErrors: true });
  const anonPage = await anonContext.newPage();
  await anonPage.goto(`${API}/orgs/ripple-test/proposals`);
  await expect(anonPage.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await anonContext.close();
});

test('can cast a yes vote', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'yes' }).click();

  await expect(page.getByText('You voted')).toBeVisible();
  await expect(page.getByText('yes').last()).toBeVisible();
});

test('can cast a no vote', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'no' }).click();

  await expect(page.getByText('You voted')).toBeVisible();
});

test('can cast an abstain vote', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'abstain' }).click();

  await expect(page.getByText('You voted')).toBeVisible();
});

test('can change a vote', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'yes' }).click();
  await expect(page.getByText('You voted')).toBeVisible();

  await page.getByRole('button', { name: 'Change vote' }).click();
  await page.getByRole('button', { name: 'no' }).click();

  await expect(page.getByText('no').last()).toBeVisible();
});

test('can remove a vote', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'yes' }).click();
  await expect(page.getByText('You voted')).toBeVisible();

  await page.getByRole('button', { name: 'Remove vote' }).click();
  await page.getByRole('button', { name: 'Yes, remove', exact: true }).click();
  await expect(page.getByRole('button', { name: 'yes' })).toBeVisible();
  await expect(page.getByText('You voted')).not.toBeVisible();
});

test('tally updates after voting', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('0 votes total')).toBeVisible();

  await page.getByRole('button', { name: 'yes' }).click();
  await expect(page.getByText('1 vote total')).toBeVisible();
});

test('delegation-resolved tally counts delegated votes', async ({ page, asAlice, bob, request }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  // Bob votes yes (using Bob's session via the standalone `request` fixture)
  await createVote(request, proposal.id, bob.id, 'yes');

  // Alice delegates to Bob (using Alice's session via page.request)
  await page.request.post(`${API}/api/delegations`, {
    data: { id: crypto.randomUUID(), organisation_id: TEST_ORG_ID, delegator_id: asAlice.id, delegate_id: bob.id, topic_id: null },
  });

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  // 2 total: Bob's direct vote + Alice's delegated vote (resolved to Bob's yes)
  await expect(page.getByText('2 votes total')).toBeVisible();
});

test('closed proposal shows no voting UI', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Old proposal', { status: 'closed' });

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('voting is no longer available')).toBeVisible();
  await expect(page.getByRole('button', { name: 'yes' })).not.toBeVisible();
});

test('back link returns to proposals list', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Environment');
  const proposal = await createProposal(page.request, topic.id, 'Ban plastics');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByRole('link', { name: '← Proposals' }).click();

  await expect(page).toHaveURL('/orgs/ripple-test/proposals');
});
