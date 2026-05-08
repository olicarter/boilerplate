import { test, expect, API, ORG_SLUG } from '../fixtures';

test.describe('public organisation', () => {
  test('admin can enable public org toggle', async ({ page, asAlice }) => {
    await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
    const checkbox = page.getByLabel('Allow anyone to discover and join this organisation');
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(page.getByText('Setting saved')).toBeVisible();
  });

  test('non-member sees public org in discover section', async ({ page, asAlice, bob, org }) => {
    // Make the test org public as Alice
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { is_public: true } });

    // Switch to Bob's session (Bob is a member from the fixture, so use a different approach)
    // Create a second org as Alice, make it public, then test Bob discovering it
    const orgRes = await page.request.post(`${API}/api/orgs`, {
      data: { name: 'Public Org', slug: 'public-org-test' },
    });
    const newOrg = await orgRes.json();
    await page.request.patch(`${API}/api/orgs/${newOrg.item.slug}`, { data: { is_public: true } });

    // Switch to Bob
    await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: 'ripple_user', value: JSON.stringify({ id: bob.id, name: bob.name, email: bob.email, created_at: bob.created_at }) },
    );

    await page.goto('https://localhost:5174/');
    // Bob should see the "Discover" section with the public org he's not a member of
    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Public Org')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join' })).toBeVisible();
  });

  test('non-member can join a public org', async ({ page, asAlice, bob, org }) => {
    // Create a public org as Alice
    const orgRes = await page.request.post(`${API}/api/orgs`, {
      data: { name: 'Joinable Org', slug: 'joinable-org-test' },
    });
    const newOrg = await orgRes.json();
    await page.request.patch(`${API}/api/orgs/${newOrg.item.slug}`, { data: { is_public: true } });

    // Switch to Bob
    await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: 'ripple_user', value: JSON.stringify({ id: bob.id, name: bob.name, email: bob.email, created_at: bob.created_at }) },
    );

    await page.goto('https://localhost:5174/');
    await expect(page.getByText('Joinable Org')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Join' }).click();
    // Should navigate into the org after joining
    await expect(page).toHaveURL(/joinable-org-test/, { timeout: 8000 });
  });

  test('joining a private org without token is rejected', async ({ page, asAlice, org }) => {
    const res = await page.request.post(`${API}/api/orgs/${ORG_SLUG}/join`, { data: {} });
    expect(res.status()).toBe(403);
  });
});
