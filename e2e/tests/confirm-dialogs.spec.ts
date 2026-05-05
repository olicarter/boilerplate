import { test, expect } from '../fixtures';
import { createTopic, createProposal, createDelegation, createVote } from '../helpers';

// ── Delegation remove ────────────────────────────────────────────────────────

test('remove delegation shows confirmation', async ({ page, asAlice, bob }) => {
  await createDelegation(page.request, asAlice.id, bob.id, null);
  await page.goto('/delegations');

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Are you sure?')).toBeVisible();
});

test('cancel keeps delegation', async ({ page, asAlice, bob }) => {
  await createDelegation(page.request, asAlice.id, bob.id, null);
  await page.goto('/delegations');

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Are you sure?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Delegation must still be present — "No delegations set." must not appear
  await expect(page.getByText('No delegations set.')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
});

test('confirm removes delegation', async ({ page, asAlice, bob }) => {
  await createDelegation(page.request, asAlice.id, bob.id, null);
  await page.goto('/delegations');

  await page.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('button', { name: 'Yes, remove' }).click();

  await expect(page.getByText('Delegation removed')).toBeVisible();
  await expect(page.getByText('No delegations set.')).toBeVisible();
});

// ── Proposal withdraw ────────────────────────────────────────────────────────

test('withdraw proposal shows confirmation', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Some proposal');

  await page.goto(`/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'Withdraw' }).click();
  await expect(page.getByText('Are you sure?')).toBeVisible();
});

test('cancel withdraw keeps proposal open', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Some proposal');

  await page.goto(`/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'Withdraw' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByText('Are you sure?')).not.toBeVisible();
  await expect(page.getByText('open')).toBeVisible();
});

// ── Close voting ─────────────────────────────────────────────────────────────

test('close voting shows confirmation', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Close me');

  await page.goto(`/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'Close voting' }).click();
  await expect(page.getByText('Are you sure?')).toBeVisible();
});

// ── Remove vote ──────────────────────────────────────────────────────────────

test('remove vote shows confirmation', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Vote on me');
  await createVote(page.request, proposal.id, asAlice.id, 'yes');

  await page.goto(`/proposals/${proposal.id}`);
  await page.getByRole('button', { name: 'Remove vote' }).click();
  await expect(page.getByText('Are you sure?')).toBeVisible();
});
