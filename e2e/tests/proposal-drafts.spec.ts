import { test, expect } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test('draft is visible to the author in the proposals list', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  await createProposal(page.request, topic.id, 'My draft idea', { status: 'draft' });

  await page.goto('/proposals');
  await expect(page.getByText('My draft idea')).toBeVisible();
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
});

test('draft is not visible to other users', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Policy');
  // Bob creates a draft (using bob's API session via fixture request)
  await page.request.post('http://localhost:5173/api/proposals', {
    data: {
      id: crypto.randomUUID(),
      topic_id: topic.id,
      title: "Bob's secret draft",
      status: 'draft',
    },
  });

  // Alice views the proposals list — should NOT see Bob's draft
  await page.goto('/proposals');
  await expect(page.getByText("Bob's secret draft")).not.toBeVisible();
});

test('draft detail page shows draft banner', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Draft proposal', { status: 'draft' });

  await page.goto(`/proposals/${proposal.id}`);
  await expect(page.getByText(/not yet visible to other members/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
});

test('draft does not show vote buttons', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Draft proposal', { status: 'draft' });

  await page.goto(`/proposals/${proposal.id}`);
  await expect(page.getByRole('button', { name: 'yes' })).not.toBeVisible();
});

test('author can publish a draft via API', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  const proposal = await createProposal(page.request, topic.id, 'Ready to publish', { status: 'draft' });

  const res = await page.request.post(`http://localhost:5173/api/proposals/${proposal.id}/publish`);
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.item.status).toBe('open');
});

test('can create a draft from the create form', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Governance');
  await page.goto('/proposals');

  await page.getByRole('button', { name: '+ New proposal' }).click();
  await page.getByLabel('Title').fill('A draft proposal');
  await page.getByLabel('Topic').selectOption({ label: 'Governance' });
  await page.getByRole('button', { name: 'Save as draft' }).click();

  await expect(page.getByText('Draft saved')).toBeVisible();
  await expect(page.getByText('A draft proposal')).toBeVisible();
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
});
