import { test, expect, ORG_SLUG, API } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('community sentiment poll', () => {
  test('Community Sentiment section is visible on open proposals', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Sentiment test', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('Community Sentiment')).toBeVisible({ timeout: 8000 });
  });

  test('"Will pass" and "Will fail" buttons are shown before predicting', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Before predict', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByRole('button', { name: 'Will pass' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Will fail' })).toBeVisible();
  });

  test('clicking "Will pass" records the prediction', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Click will pass', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByRole('button', { name: 'Will pass' }).click({ timeout: 8000 });

    await expect(page.getByText(/Your expectation/)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Will pass').first()).toBeVisible();
  });

  test('clicking "Will fail" records the prediction', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Click will fail', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByRole('button', { name: 'Will fail' }).click({ timeout: 8000 });

    await expect(page.getByText(/Your expectation/)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Will fail').first()).toBeVisible();
  });

  test('predicting updates the pass/fail counts', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Count update test', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText(/Will pass: 0/)).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Will pass' }).click();
    await expect(page.getByText(/Will pass: 1/)).toBeVisible({ timeout: 8000 });
  });

  test('prediction can be removed', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Remove prediction', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByRole('button', { name: 'Will pass' }).click({ timeout: 8000 });
    await expect(page.getByText(/Your expectation/)).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('button', { name: 'Will pass' })).toBeVisible({ timeout: 8000 });
  });

  test('Sentiment section is hidden on discussion proposals', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');

    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: /New proposal/i }).click();
    await page.locator('#new-proposal-topic').selectOption(topic.id);
    await page.getByTestId('proposal-type-discussion').click();
    await page.locator('#new-proposal-title').fill('Discussion no sentiment');
    await page.getByRole('button', { name: 'Create proposal' }).click();
    await page.getByText('Discussion no sentiment').click();

    await expect(page.getByText('Community Sentiment')).not.toBeVisible({ timeout: 8000 });
  });

  test('Sentiment section is hidden when sentiment feature is disabled', async ({ page, asAlice }) => {
    // Disable sentiment feature for the org
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { features: { delegation: true, advanced_voting: true, argumentation: true, proposal_queue: true, sentiment: false } },
    });

    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'No sentiment feature', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('Community Sentiment')).not.toBeVisible({ timeout: 8000 });

    // Re-enable for other tests (reset runs per test, so not strictly needed but good practice)
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { features: { delegation: true, advanced_voting: true, argumentation: true, proposal_queue: true, sentiment: true } },
    });
  });
});
