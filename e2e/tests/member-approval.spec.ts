import { test, expect, API, ORG_SLUG } from '../fixtures';

test.describe('member approval queue', () => {
  test('admin can enable require_member_approval', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    const checkbox = page.getByLabel('Require admin approval before new members can participate');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await expect(checkbox).not.toBeChecked();

    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('joining a public org with approval required creates a pending membership', async ({
    page,
    asAlice,
    bob,
    request,
  }) => {
    // Enable public org + approval requirement as Alice (admin via page.request)
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { is_public: true, require_member_approval: true },
    });

    // Remove Bob's existing admin membership so he can rejoin as pending
    await page.request.delete(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`);

    // Bob joins the public org — request context is Bob's session
    const joinRes = await request.post(`${API}/api/orgs/${ORG_SLUG}/join`, { data: {} });
    expect(joinRes.ok()).toBeTruthy();
    const { item } = await joinRes.json();
    expect(item.status).toBe('pending');
  });

  test('pending member appears in admin approval queue', async ({
    page,
    asAlice,
    bob,
    request,
  }) => {
    // Set up public org with approval
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { is_public: true, require_member_approval: true },
    });
    await page.request.delete(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`);
    await request.post(`${API}/api/orgs/${ORG_SLUG}/join`, { data: {} });

    // Alice (admin) views admin page
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByText('Pending approval', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('pending-member-row')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
  });

  test('admin can approve a pending member', async ({
    page,
    asAlice,
    bob,
    request,
  }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { is_public: true, require_member_approval: true },
    });
    await page.request.delete(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`);
    await request.post(`${API}/api/orgs/${ORG_SLUG}/join`, { data: {} });

    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByTestId('pending-member-row')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('approve-member-btn').click();
    await expect(page.getByTestId('pending-member-row')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Member approved')).toBeVisible({ timeout: 5000 });
  });

  test('admin can reject a pending member', async ({
    page,
    asAlice,
    bob,
    request,
  }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { is_public: true, require_member_approval: true },
    });
    await page.request.delete(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`);
    await request.post(`${API}/api/orgs/${ORG_SLUG}/join`, { data: {} });

    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByTestId('pending-member-row')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    await page.getByRole('button', { name: 'Yes, reject', exact: true }).click();
    await expect(page.getByTestId('pending-member-row')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('request rejected', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('approve/reject via API updates membership status correctly', async ({
    page,
    asAlice,
    bob,
    request,
  }) => {
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { is_public: true, require_member_approval: true },
    });
    await page.request.delete(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`);

    // Bob joins → pending
    await request.post(`${API}/api/orgs/${ORG_SLUG}/join`, { data: {} });

    // Verify pending status
    const membersRes = await page.request.get(`${API}/api/orgs/${ORG_SLUG}/members`);
    const members = await membersRes.json();
    const bobMembership = members.find((m: { user_id: string; status: string }) => m.user_id === bob.id);
    expect(bobMembership?.status).toBe('pending');

    // Alice approves Bob
    const approveRes = await page.request.post(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}/approve`);
    expect(approveRes.ok()).toBeTruthy();

    // Verify approved status
    const membersRes2 = await page.request.get(`${API}/api/orgs/${ORG_SLUG}/members`);
    const members2 = await membersRes2.json();
    const bobApproved = members2.find((m: { user_id: string; status: string }) => m.user_id === bob.id);
    expect(bobApproved?.status).toBe('approved');
  });
});
