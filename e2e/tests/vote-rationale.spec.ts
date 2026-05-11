import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('vote rationale', () => {
  test('vote reason input is shown when casting a vote', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Test proposal');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('vote-reason-input')).toBeVisible({ timeout: 6000 });
  });

  test('can submit vote with a reason', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Rationale proposal');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('vote-reason-input').fill('I support this because of X');
    await page.getByRole('button', { name: 'yes' }).click();

    await expect(page.getByTestId('my-vote-reason')).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('my-vote-reason')).toContainText('I support this because of X');
  });

  test('reason appears in vote statements section', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Statement proposal');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('vote-reason-input').fill('My reasoning here');
    await page.getByRole('button', { name: 'yes' }).click();

    await expect(page.getByTestId('vote-statement')).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('vote-statement')).toContainText('My reasoning here');
  });

  test('voting without a reason shows no statement', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'No reason proposal');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByRole('button', { name: 'yes' }).click();

    await expect(page.getByTestId('vote-statement')).not.toBeVisible({ timeout: 6000 });
  });

  test('reason is preserved when changing vote', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Change vote reason');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('vote-reason-input').fill('Original reason');
    await page.getByRole('button', { name: 'yes' }).click();
    await expect(page.getByTestId('my-vote-reason')).toContainText('Original reason', { timeout: 6000 });

    await page.getByRole('button', { name: 'Change vote' }).click();
    await expect(page.getByTestId('vote-reason-input')).toBeVisible({ timeout: 4000 });
    await page.getByTestId('vote-reason-input').fill('Updated reason');
    await page.getByRole('button', { name: 'no', exact: true }).click();

    await expect(page.getByTestId('my-vote-reason')).toContainText('Updated reason', { timeout: 6000 });
  });

  test('can submit vote reason via API', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'API reason test');

    const res = await page.request.post(`${API}/api/votes`, {
      data: {
        id: crypto.randomUUID(),
        proposal_id: proposal.id,
        user_id: asAlice.id,
        choice: 'yes',
        reason: 'API reason text',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.item.reason).toBe('API reason text');
  });
});
