import { test, expect, ORG_SLUG, API } from '../fixtures';
import { createTopic, createProposal, createOrg } from '../helpers';

test.describe('org feature flags — creation form', () => {
  test('org type buttons are shown in the create org form', async ({ page, asAlice }) => {
    await createOrg(page.request, 'Extra Org');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();

    await expect(page.getByRole('button', { name: 'Company' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Co-operative' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'DAO' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Non-profit' })).toBeVisible();
  });

  test('feature checkboxes are shown in the create org form', async ({ page, asAlice }) => {
    await createOrg(page.request, 'Extra Org');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();

    await expect(page.getByRole('checkbox', { name: /Delegation/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Advanced voting/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Argumentation/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Sentiment poll/ })).toBeVisible();
  });

  test('selecting Company type unchecks Delegation', async ({ page, asAlice }) => {
    await createOrg(page.request, 'Extra Org');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();

    await page.getByRole('button', { name: 'Company' }).click();

    await expect(page.getByRole('checkbox', { name: /Delegation/ })).not.toBeChecked();
  });

  test('selecting DAO type checks all features', async ({ page, asAlice }) => {
    await createOrg(page.request, 'Extra Org');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();

    await page.getByRole('button', { name: 'DAO' }).click();

    await expect(page.getByRole('checkbox', { name: /Delegation/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Advanced voting/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Argumentation/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Sentiment poll/ })).toBeChecked();
  });

  test('selecting Community group type unchecks most features', async ({ page, asAlice }) => {
    await createOrg(page.request, 'Extra Org');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();

    await page.getByRole('button', { name: 'Community group' }).click();

    await expect(page.getByRole('checkbox', { name: /Delegation/ })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Advanced voting/ })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Sentiment poll/ })).not.toBeChecked();
  });

  test('feature checkboxes can be manually toggled after selecting a type', async ({ page, asAlice }) => {
    await createOrg(page.request, 'Extra Org');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New organisation' }).click();

    await page.getByRole('button', { name: 'Company' }).click();
    await expect(page.getByRole('checkbox', { name: /Delegation/ })).not.toBeChecked();

    // Manually re-enable delegation
    await page.getByRole('checkbox', { name: /Delegation/ }).check();
    await expect(page.getByRole('checkbox', { name: /Delegation/ })).toBeChecked();
  });
});

test.describe('org feature flags — admin page', () => {
  test('Features section is visible in the admin page', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible({ timeout: 8000 });
  });

  test('all five feature toggles are shown in admin', async ({ page, asAlice }) => {
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    await expect(page.getByRole('checkbox', { name: /Delegation/ })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('checkbox', { name: /Advanced voting/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Argumentation/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Proposal queue/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Sentiment poll/ })).toBeVisible();
  });

  test('disabling Delegation in admin hides the delegations nav link', async ({ page, asAlice }) => {
    // Confirm delegation link is visible by default
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await expect(page.getByRole('link', { name: /Delegations/i })).toBeVisible();

    // Disable delegation
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    const delegationCheckbox = page.getByRole('checkbox', { name: /Delegation/ });
    await delegationCheckbox.waitFor({ timeout: 8000 });
    if (await delegationCheckbox.isChecked()) {
      await delegationCheckbox.uncheck();
    }

    // Navigate back and check the nav link is gone
    await page.goto(`/orgs/${ORG_SLUG}/proposals`);
    await expect(page.getByRole('link', { name: /Delegations/i })).not.toBeVisible({ timeout: 8000 });

    // Re-enable for subsequent tests
    await page.goto(`/orgs/${ORG_SLUG}/admin`);
    const cb = page.getByRole('checkbox', { name: /Delegation/ });
    await cb.waitFor({ timeout: 8000 });
    if (!await cb.isChecked()) {
      await cb.check();
    }
  });

  test('disabling Argumentation in admin hides argument section on proposals', async ({ page, asAlice }) => {
    // Disable argumentation
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { features: { delegation: true, advanced_voting: true, argumentation: false, proposal_queue: true, sentiment: true } },
    });

    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'No args proposal', { status: 'open' });
    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);

    await expect(page.getByText(/Arguments for/i)).not.toBeVisible({ timeout: 8000 });

    // Re-enable
    await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
      data: { features: { delegation: true, advanced_voting: true, argumentation: true, proposal_queue: true, sentiment: true } },
    });
  });
});
