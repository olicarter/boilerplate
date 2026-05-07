import { test, expect, API } from '../fixtures';
import { createTopic, createProposal, createComment } from '../helpers';

test('discussion section is visible on proposal detail page', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Build a library');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Discussion (0)')).toBeVisible();
  await expect(page.getByText('No comments yet')).toBeVisible();
});

test('can post a comment', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Build a library');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await page.getByLabel('Add a comment').fill('This is a great idea.');
  await page.getByRole('button', { name: 'Post comment' }).click();

  await expect(page.getByText('Comment posted')).toBeVisible();
  await expect(page.getByText('Discussion (1)')).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'This is a great idea.' })).toBeVisible();
});

test('comment shows author name', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Build a library');
  await createComment(page.request, proposal.id, 'Hello from Alice');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Hello from Alice')).toBeVisible();
  await expect(page.getByText('Alice').first()).toBeVisible();
});

test('can delete own comment', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Build a library');
  await createComment(page.request, proposal.id, 'Delete this please');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText('Delete this please')).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();

  await expect(page.getByText('Delete this please')).not.toBeVisible();
  await expect(page.getByText('Comment deleted')).toBeVisible();
});

test('delete button not shown for plain member on another user\'s comment', async ({ page, asAlice, bob, request }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Build a library');

  // Alice posts a comment
  await page.request.post(`${API}/api/proposals/${proposal.id}/comments`, {
    data: { id: crypto.randomUUID(), body: "Alice's opinion" },
  });

  // Downgrade Alice to member (admins/moderators can delete any comment)
  await page.request.patch(`${API}/api/orgs/ripple-test/members/${asAlice.id}`, { data: { role: 'member' } });

  // Bob (another member) posts a comment via standalone request context
  await request.post(`${API}/api/proposals/${proposal.id}/comments`, {
    data: { id: crypto.randomUUID(), body: "Bob's opinion" },
  });

  // Switch to Bob's session via page.request (now a member)
  await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  await page.request.patch(`${API}/api/orgs/ripple-test/members/${bob.id}`, { data: { role: 'member' } });
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
    { key: 'ripple_user', value: JSON.stringify(bob) },
  );

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByText("Alice's opinion")).toBeVisible();
  // Bob (member) sees Delete only on his own comment, not Alice's
  // Only 1 Delete button visible (for Bob's own comment), not 2
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1);
});

test('sign in prompt shown when not authenticated', async ({ page }) => {
  await page.goto('/orgs/ripple-test/proposals');
  // Auth gate shows sign-in panel for unauthenticated users
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Add a comment')).not.toBeVisible();
});

test('post comment button disabled when body is empty', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Build a library');

  await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  await expect(page.getByRole('button', { name: 'Post comment' })).toBeDisabled();
});
