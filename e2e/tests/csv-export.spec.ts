import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal, TEST_ORG_ID } from '../helpers';
import { randomUUID } from 'crypto';

test.describe('CSV vote export', () => {
  test('export CSV button is visible for moderator on proposal detail', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Exportable proposal');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${id}`);
    await expect(page.getByTestId('export-csv')).toBeVisible({ timeout: 8000 });
  });

  test('CSV API returns valid CSV headers', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'CSV headers test');

    const res = await page.request.get(`${API}/api/proposals/${id}/tally/csv`);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('text/csv');
    const text = await res.text();
    expect(text).toContain('user_id');
    expect(text).toContain('name');
    expect(text).toContain('choice');
  });

  test('CSV includes vote data', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const { id } = await createProposal(page.request, topic.id, 'Vote CSV test');

    await page.request.post(`${API}/api/votes`, {
      data: { id: randomUUID(), proposal_id: id, user_id: asAlice.id, choice: 'yes' },
    });

    const res = await page.request.get(`${API}/api/proposals/${id}/tally/csv`);
    const text = await res.text();
    expect(text).toContain('yes');
    expect(text).toContain('Alice');
  });

  test('CSV for multiple choice includes option columns', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposalId = randomUUID();
    await page.request.post(`${API}/api/proposals`, {
      data: { id: proposalId, organisation_id: TEST_ORG_ID, topic_id: topic.id, title: 'MC CSV', proposal_type: 'multiple_choice' },
    });
    const optId = randomUUID();
    await page.request.post(`${API}/api/proposals/${proposalId}/options`, {
      data: { id: optId, text: 'Option A', position: 0 },
    });
    await page.request.post(`${API}/api/votes`, {
      data: { id: randomUUID(), proposal_id: proposalId, user_id: asAlice.id, option_id: optId },
    });

    const res = await page.request.get(`${API}/api/proposals/${proposalId}/tally/csv`);
    const text = await res.text();
    expect(text).toContain('option_text');
    expect(text).toContain('Option A');
  });
});
