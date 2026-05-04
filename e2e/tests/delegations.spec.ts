import { test, expect } from '../fixtures';
import { createTopic, createDelegation } from '../helpers';

test('shows sign-in message when logged out', async ({ page }) => {
  await page.goto('/delegations');
  await expect(page.getByText('Please sign in to manage your delegations.')).toBeVisible();
});

test('shows empty outgoing delegations state', async ({ page, asAlice }) => {
  await page.goto('/delegations');
  await expect(page.getByText('No delegations set.')).toBeVisible();
});

test('shows empty incoming delegations state', async ({ page, asAlice }) => {
  await page.goto('/delegations');
  await expect(page.getByText('Nobody has delegated to you yet.')).toBeVisible();
});

test('can add a global delegation', async ({ page, asAlice, bob }) => {
  await page.goto('/delegations');

  await page.getByPlaceholder('Search by name or email…').fill('Bob');
  await page.getByText('Bob').click();

  await page.getByRole('button', { name: 'Add delegation' }).click();

  await expect(page.getByText('Bob').first()).toBeVisible();
  await expect(page.getByText('Global')).toBeVisible();
});

test('can add a topic-scoped delegation', async ({ page, asAlice, bob }) => {
  const topic = await createTopic(page.request, 'Environment');

  await page.goto('/delegations');

  await page.getByPlaceholder('Search by name or email…').fill('Bob');
  await page.getByText('Bob').click();

  await page.getByLabel('Scope').selectOption({ label: 'Environment' });
  await page.getByRole('button', { name: 'Add delegation' }).click();

  await expect(page.getByText('Bob').first()).toBeVisible();
  await expect(page.getByText('Environment').first()).toBeVisible();
});

test('shows error when delegating to self', async ({ page, asAlice }) => {
  await page.goto('/delegations');

  await page.getByPlaceholder('Search by name or email…').fill('Alice');
  await page.getByText('Alice').click();

  await page.getByRole('button', { name: 'Add delegation' }).click();
  await expect(page.getByText('You cannot delegate to yourself.')).toBeVisible();
});

test('shows error on duplicate scope', async ({ page, asAlice, bob }) => {
  // Add first global delegation via API
  await createDelegation(page.request, asAlice.id, bob.id, null);

  await page.goto('/delegations');
  await expect(page.getByText('Global')).toBeVisible();

  // Try to add another global delegation
  await page.getByPlaceholder('Search by name or email…').fill('Bob');
  await page.getByText('Bob').click();

  await page.getByRole('button', { name: 'Add delegation' }).click();
  await expect(page.getByText('You already have a global delegation.')).toBeVisible();
});

test('can remove a delegation', async ({ page, asAlice, bob }) => {
  await createDelegation(page.request, asAlice.id, bob.id, null);

  await page.goto('/delegations');
  await expect(page.getByText('Global')).toBeVisible();

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('No delegations set.')).toBeVisible();
});

test('shows incoming delegations', async ({ page, asAlice, bob, request }) => {
  // Bob delegates to Alice — using Bob's session (standalone `request` fixture)
  await createDelegation(request, bob.id, asAlice.id, null);

  await page.goto('/delegations');
  await expect(page.getByText('Bob').first()).toBeVisible();
});

test('user search filters by name', async ({ page, asAlice, bob }) => {
  await page.goto('/delegations');

  await page.getByPlaceholder('Search by name or email…').fill('Bo');
  await expect(page.getByText('Bob')).toBeVisible();
  await expect(page.getByText('Alice')).not.toBeVisible();
});

test('user search filters by email', async ({ page, asAlice, bob }) => {
  await page.goto('/delegations');

  await page.getByPlaceholder('Search by name or email…').fill('bob@test');
  await expect(page.getByText('Bob')).toBeVisible();
});

test('user search excludes self', async ({ page, asAlice, bob }) => {
  await page.goto('/delegations');

  await page.getByPlaceholder('Search by name or email…').fill('alice@test');
  await expect(page.getByText('Alice')).not.toBeVisible();
});
