import { test, expect, API } from '../fixtures';

test.describe('setup wizard', () => {
  test('setup page renders with four step indicators', async ({ page, asAlice }) => {
    // Create a fresh org to navigate to setup
    const name = `Setup Test ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const body = await res.json();
    const slug = body.item.slug;

    await page.goto(`/orgs/${slug}/setup`);
    await expect(page.getByText('Invite your members')).toBeVisible({ timeout: 8000 });
    // Four numbered step circles (1, 2, 3, 4)
    await expect(page.getByText('1')).toBeVisible();
    await expect(page.getByText('2')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
    await expect(page.getByText('4')).toBeVisible();
  });

  test('step 1 shows invite form with email textarea', async ({ page, asAlice }) => {
    const name = `Invite Step ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    await expect(page.getByPlaceholder(/alice@example.com/)).toBeVisible({ timeout: 8000 });
  });

  test('Skip button on step 1 advances to step 2', async ({ page, asAlice }) => {
    const name = `Skip Invite ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByText('Create a topic')).toBeVisible({ timeout: 8000 });
  });

  test('step 2 shows topic creation form', async ({ page, asAlice }) => {
    const name = `Topic Step ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByPlaceholder(/e.g. General, Budget, Policies/)).toBeVisible({ timeout: 8000 });
  });

  test('creating a topic on step 2 advances to step 3', async ({ page, asAlice }) => {
    const name = `Create Topic ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    await page.getByRole('button', { name: 'Skip' }).click(); // skip invites

    await page.getByPlaceholder(/e.g. General, Budget, Policies/).fill('General');
    await page.getByRole('button', { name: 'Create topic' }).click();

    await expect(page.getByText('Create your first proposal')).toBeVisible({ timeout: 8000 });
  });

  test('step 3 shows proposal form when a topic was created', async ({ page, asAlice }) => {
    const name = `Proposal Step ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByPlaceholder(/e.g. General, Budget, Policies/).fill('Policy');
    await page.getByRole('button', { name: 'Create topic' }).click();

    await expect(page.getByPlaceholder('Proposal title')).toBeVisible({ timeout: 8000 });
  });

  test('skipping all steps reaches the done screen', async ({ page, asAlice }) => {
    const name = `Skip All ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    await page.getByRole('button', { name: 'Skip' }).click(); // step 1
    await page.getByRole('button', { name: 'Skip' }).click(); // step 2
    await page.getByRole('button', { name: 'Skip' }).click(); // step 3

    await expect(page.getByText("You're all set")).toBeVisible({ timeout: 8000 });
  });

  test('"Go to proposals" on done screen navigates to proposals page', async ({ page, asAlice }) => {
    const name = `Go Proposals ${Date.now()}`;
    const res = await page.request.post(`${API}/api/orgs`, { data: { name } });
    const { item } = await res.json();

    await page.goto(`/orgs/${item.slug}/setup`);
    // Skip through all steps
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();

    await page.getByRole('button', { name: 'Go to proposals' }).click();
    await expect(page).toHaveURL(`/orgs/${item.slug}/proposals`, { timeout: 8000 });
  });

  test('creating an org redirects to the setup wizard', async ({ page, asAlice }) => {
    // Create an extra org so the org list page doesn't auto-redirect (it only redirects when user has exactly 1 org)
    const res = await page.request.post(`${API}/api/orgs`, { data: { name: 'Extra Org' } });
    await res.json();
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();
    await page.getByLabel('Name').fill(`New Org ${Date.now()}`);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Invite your members')).toBeVisible({ timeout: 10000 });
  });
});
