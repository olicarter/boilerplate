import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic } from '../helpers';

async function createProposalWithDeliberation(
  request: Parameters<typeof createTopic>[0],
  topicId: string,
  title: string,
  deliberationEndsAt: string,
  closesAt?: string,
) {
  const res = await request.post(`${API}/api/proposals`, {
    data: {
      id: crypto.randomUUID(),
      organisation_id: '00000000-0000-0000-0000-000000000002',
      topic_id: topicId,
      title,
      status: 'open',
      deliberation_ends_at: deliberationEndsAt,
      closes_at: closesAt ?? null,
    },
  });
  const body = await res.json();
  return body.item as { id: string; title: string };
}

test.describe('Deliberation window', () => {
  test('proposal in deliberation phase shows timeline and blocks voting', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');

    // Set deliberation to end in 1 hour
    const deliberationEnd = new Date(Date.now() + 3600000).toISOString();
    const proposal = await createProposalWithDeliberation(page.request, topic.id, 'Deliberation proposal', deliberationEnd);

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    // Timeline visible
    await expect(page.getByText('Deliberation', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Voting', { exact: true })).toBeVisible();

    // Voting blocked by deliberation banner
    await expect(page.getByText('Deliberation phase — voting is not yet open.')).toBeVisible();

    // Vote buttons should NOT be visible
    await expect(page.getByRole('button', { name: 'yes' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'no' })).not.toBeVisible();
  });

  test('proposal past deliberation shows voting phase', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');

    // Deliberation already ended (1 hour ago)
    const deliberationEnd = new Date(Date.now() - 3600000).toISOString();
    const proposal = await createProposalWithDeliberation(page.request, topic.id, 'Past deliberation proposal', deliberationEnd);

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    // Timeline shows voting phase active
    await expect(page.getByText('Voting', { exact: true })).toBeVisible({ timeout: 10000 });

    // Deliberation banner should not be shown
    await expect(page.getByText('Deliberation phase — voting is not yet open.')).not.toBeVisible();

    // Vote buttons should be present
    await expect(page.getByRole('button', { name: 'yes' })).toBeVisible();
  });

  test('deliberating badge shown on proposals list', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');

    const deliberationEnd = new Date(Date.now() + 3600000).toISOString();
    await createProposalWithDeliberation(page.request, topic.id, 'List deliberation proposal', deliberationEnd);

    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await expect(page.getByText('Deliberating')).toBeVisible({ timeout: 10000 });
  });

  test('API rejects vote during deliberation phase', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');

    const deliberationEnd = new Date(Date.now() + 3600000).toISOString();
    const proposal = await createProposalWithDeliberation(page.request, topic.id, 'Vote blocked proposal', deliberationEnd);

    const res = await page.request.post(`${API}/api/votes`, {
      data: { id: crypto.randomUUID(), proposal_id: proposal.id, user_id: asAlice.id, choice: 'yes' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('deliberation phase');
  });

  test('proposal can be created with deliberation window via form', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');

    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await page.getByRole('button', { name: '+ New proposal' }).click();

    // Fill title
    await page.getByLabel('Title').fill('Form deliberation proposal');

    // Select topic
    await page.getByLabel('Topic').selectOption({ label: 'Policy' });

    // Set deliberation end date (1 day from now)
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    await page.locator('#new-proposal-deliberation-ends-at').fill(tomorrowLocal);

    await page.getByRole('button', { name: 'Create proposal' }).click();

    await expect(page.getByText('Form deliberation proposal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Deliberating')).toBeVisible();
  });
});
