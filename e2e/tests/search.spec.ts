import { test, expect } from '../fixtures';
import { createTopic, createProposal } from '../helpers';

test('search filters proposals by title', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  await createProposal(page.request, topic.id, 'Build a library');
  await createProposal(page.request, topic.id, 'Fix the roads');

  await page.goto('/proposals');
  await page.getByPlaceholder('Search proposals…').fill('library');

  await expect(page.getByText('Build a library')).toBeVisible();
  await expect(page.getByText('Fix the roads')).not.toBeVisible();
});

test('search is case-insensitive', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  await createProposal(page.request, topic.id, 'Build a Library');

  await page.goto('/proposals');
  await page.getByPlaceholder('Search proposals…').fill('LIBRARY');

  await expect(page.getByText('Build a Library')).toBeVisible();
});

test('clearing search restores full list', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  await createProposal(page.request, topic.id, 'Build a library');
  await createProposal(page.request, topic.id, 'Fix the roads');

  await page.goto('/proposals');
  await page.getByPlaceholder('Search proposals…').fill('library');
  await expect(page.getByText('Fix the roads')).not.toBeVisible();

  await page.getByPlaceholder('Search proposals…').clear();
  await expect(page.getByText('Fix the roads')).toBeVisible();
  await expect(page.getByText('Build a library')).toBeVisible();
});

test('search with no matches shows empty state', async ({ page, asAlice }) => {
  const topic = await createTopic(page.request, 'Policy');
  await createProposal(page.request, topic.id, 'Build a library');

  await page.goto('/proposals');
  await page.getByPlaceholder('Search proposals…').fill('zzz-no-match');

  await expect(page.getByText('No proposals match these filters')).toBeVisible();
  await expect(page.getByText('Build a library')).not.toBeVisible();
});
