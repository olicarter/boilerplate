import { test, expect, API, ORG_SLUG } from '../fixtures';

test.describe('blind voting (voting_visibility = hidden)', () => {
  test('tally returns zeros while proposal is open', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { voting_visibility: 'hidden' } });

    const propRes = await page.request.post(`${API}/api/proposals`, {
      data: {
        id: crypto.randomUUID(),
        organisation_id: (await page.request.get(`${API}/api/orgs/${ORG_SLUG}`).then(r => r.json())).id,
        topic_id: null,
        title: 'Blind voting test',
        status: 'open',
      },
    });
    const { item: proposal } = await propRes.json();

    await page.request.post(`${API}/api/votes`, {
      data: { id: crypto.randomUUID(), proposal_id: proposal.id, user_id: asAlice.id, choice: 'yes' },
    });

    const tally = await page.request.get(`${API}/api/proposals/${proposal.id}/tally`).then(r => r.json());
    expect(tally.yes).toBe(0);
    expect(tally.no).toBe(0);
    expect(tally.total).toBe(0);
  });

  test('votes list returns empty while proposal is open', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { voting_visibility: 'hidden' } });

    const propRes = await page.request.post(`${API}/api/proposals`, {
      data: {
        id: crypto.randomUUID(),
        organisation_id: (await page.request.get(`${API}/api/orgs/${ORG_SLUG}`).then(r => r.json())).id,
        topic_id: null,
        title: 'Blind votes list test',
        status: 'open',
      },
    });
    const { item: proposal } = await propRes.json();

    await page.request.post(`${API}/api/votes`, {
      data: { id: crypto.randomUUID(), proposal_id: proposal.id, user_id: asAlice.id, choice: 'yes' },
    });

    const votes = await page.request.get(`${API}/api/votes/proposal/${proposal.id}`).then(r => r.json());
    expect(votes).toHaveLength(0);
  });

  test('tally is visible after proposal closes', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { voting_visibility: 'hidden' } });

    const propRes = await page.request.post(`${API}/api/proposals`, {
      data: {
        id: crypto.randomUUID(),
        organisation_id: (await page.request.get(`${API}/api/orgs/${ORG_SLUG}`).then(r => r.json())).id,
        topic_id: null,
        title: 'Blind voting closed test',
        status: 'open',
      },
    });
    const { item: proposal } = await propRes.json();

    await page.request.post(`${API}/api/votes`, {
      data: { id: crypto.randomUUID(), proposal_id: proposal.id, user_id: asAlice.id, choice: 'yes' },
    });

    await page.request.patch(`${API}/api/proposals/${proposal.id}`, { data: { status: 'closed' } });

    const tally = await page.request.get(`${API}/api/proposals/${proposal.id}/tally`).then(r => r.json());
    expect(tally.yes).toBeGreaterThan(0);
  });

  test('UI hides vote counts on proposal page when visibility is hidden', async ({ page, asAlice }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { voting_visibility: 'hidden' } });

    const orgRes = await page.request.get(`${API}/api/orgs/${ORG_SLUG}`).then(r => r.json());
    const propRes = await page.request.post(`${API}/api/proposals`, {
      data: {
        id: crypto.randomUUID(),
        organisation_id: orgRes.id,
        topic_id: null,
        title: 'Hidden tally UI test',
        status: 'open',
      },
    });
    const { item: proposal } = await propRes.json();

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText('Results hidden until voting closes')).toBeVisible({ timeout: 10000 });
  });
});
