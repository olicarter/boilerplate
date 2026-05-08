import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test.describe('Veto rights', () => {
  test('admin can cast a veto on an open proposal', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Veto test proposal', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('cast-veto-btn')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('cast-veto-btn').click();
    await page.getByPlaceholder('Reason for veto (required)').fill('This conflicts with policy 5.3');
    await page.getByRole('button', { name: 'Cast veto' }).click();

    await expect(page.getByTestId('veto-item')).toBeVisible();
    await expect(page.getByTestId('veto-item')).toContainText('This conflicts with policy 5.3');
    await expect(page.getByTestId('veto-item')).toContainText('Alice');
  });

  test('veto blocks proposal from passing in result banner', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Blocked proposal', { status: 'open' });

    await page.request.post(`${API}/api/proposals/${proposal.id}/vetoes`, {
      data: { reason: 'Blocked by admin' },
    });

    await page.request.post(`${API}/api/proposals/${proposal.id}/close`);

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    await expect(page.getByText(/1 veto in effect/)).toBeVisible({ timeout: 10000 });
  });

  test('admin can retract their own veto', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Retract veto proposal', { status: 'open' });

    await page.request.post(`${API}/api/proposals/${proposal.id}/vetoes`, {
      data: { reason: 'Temporary block' },
    });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('veto-item')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('veto-item').getByRole('button', { name: 'Retract' }).click();
    await page.getByTestId('veto-item').getByRole('button', { name: 'Yes' }).click();

    await expect(page.getByTestId('veto-item')).not.toBeVisible();
  });

  test('veto requires a non-empty reason', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Empty reason proposal', { status: 'open' });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('cast-veto-btn')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('cast-veto-btn').click();

    await expect(page.getByRole('button', { name: 'Cast veto' })).toBeDisabled();
  });

  test('admin can configure veto role in admin settings', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByText('Who can cast a veto?')).toBeVisible({ timeout: 10000 });

    await page.locator('input[name="veto_role"][value="moderator"]').click();
    await expect(page.getByText('Setting saved').first()).toBeVisible();

    await page.getByTestId('veto-role-admin').click();
    await expect(page.getByText('Setting saved').first()).toBeVisible();
  });

  test('veto count shows correctly on proposal detail', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Count veto test', { status: 'open' });

    await page.request.post(`${API}/api/proposals/${proposal.id}/vetoes`, {
      data: { reason: 'First veto reason' },
    });

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByText(/1 veto in effect/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('veto-item')).toContainText('First veto reason');
  });
});
