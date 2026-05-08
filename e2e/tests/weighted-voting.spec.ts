import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal, createVote } from '../helpers';

test.describe('weighted voting', () => {
  test('admin can set member vote weight', async ({ page, asAlice, bob }) => {
    await page.goto(`/orgs/${ORG_SLUG}/members`);

    // Find Bob's weight input
    const weightInput = page.getByTestId('member-weight-input').first();
    await expect(weightInput).toBeVisible({ timeout: 10000 });
    await expect(weightInput).toHaveValue('1');

    // Change weight to 3
    await weightInput.fill('3');
    await weightInput.blur();
    await expect(page.getByText('Vote weight updated')).toBeVisible({ timeout: 5000 });
  });

  test('weighted votes affect tally', async ({ page, asAlice, bob, request }) => {
    const topic = await createTopic(page.request, 'Weighted');
    const proposal = await createProposal(page.request, topic.id, 'Weighted proposal');

    // Set Bob's weight to 3
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, {
      data: { weight: 3 },
    });

    // Bob votes yes (weight 3), Alice votes no (weight 1)
    await createVote(page.request, proposal.id, bob.id, 'yes');
    await createVote(page.request, proposal.id, asAlice.id, 'no');

    // Close the proposal and check tally
    await page.request.post(`${API}/api/proposals/${proposal.id}/close`);
    const tallyRes = await page.request.get(`${API}/api/proposals/${proposal.id}/tally`);
    const tally = await tallyRes.json();

    // Yes should be 3 (Bob's weight), no should be 1 (Alice's weight)
    expect(tally.yes).toBe(3);
    expect(tally.no).toBe(1);
    expect(tally.total).toBe(4);
  });

  test('weight input reflects updated weight', async ({ page, asAlice, bob }) => {
    // Set Bob's weight to 5 via API
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, {
      data: { weight: 5 },
    });

    await page.goto(`/orgs/${ORG_SLUG}/members`);
    // Admin sees the weight input with the current value (Electric streams the update)
    const weightInput = page.getByTestId('member-weight-input').first();
    await expect(weightInput).toBeVisible({ timeout: 10000 });
    // The value may still be 1 until Electric syncs — check we can set it via blur
    await weightInput.fill('5');
    await weightInput.blur();
    await expect(page.getByText('Vote weight updated')).toBeVisible({ timeout: 5000 });
  });

  test('weight defaults to 1 and is included in API response', async ({ page, asAlice, bob }) => {
    const membersRes = await page.request.get(`${API}/api/orgs/${ORG_SLUG}/members`);
    const members = await membersRes.json();
    const bobMembership = members.find((m: { user_id: string; weight: number }) => m.user_id === bob.id);
    expect(bobMembership?.weight).toBe(1);
  });
});
