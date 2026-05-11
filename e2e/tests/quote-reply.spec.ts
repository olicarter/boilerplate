import { test, expect, API, ORG_SLUG } from '../fixtures';
import { createTopic, createProposal, createComment } from '../helpers';

test.describe('quote reply', () => {
  test('Reply button appears on comments for logged-in users', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Quote reply test');
    await createComment(page.request, proposal.id, 'This is the original comment');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await expect(page.getByTestId('quote-reply-btn').first()).toBeVisible({ timeout: 8000 });
  });

  test('clicking Reply inserts a blockquote into the textarea', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Quote reply insert test');
    await createComment(page.request, proposal.id, 'Hello world');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('quote-reply-btn').first().click();

    const ta = page.getByTestId('comment-body');
    await expect(ta).toHaveValue(/^> Hello world/);
  });

  test('textarea is focused after clicking Reply', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Quote reply focus test');
    await createComment(page.request, proposal.id, 'Focus me');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('quote-reply-btn').first().click();

    const ta = page.getByTestId('comment-body');
    await expect(ta).toBeFocused({ timeout: 3000 });
  });

  test('multiline comment body is quoted line by line', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Quote multiline test');
    await createComment(page.request, proposal.id, 'Line one\nLine two');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('quote-reply-btn').first().click();

    const ta = page.getByTestId('comment-body');
    await expect(ta).toHaveValue(/> Line one\n> Line two/);
  });

  test('quoted reply can be submitted as a new comment', async ({ page, asAlice }) => {
    const topic = await createTopic(page.request, 'Policy');
    const proposal = await createProposal(page.request, topic.id, 'Quote submit test');
    await createComment(page.request, proposal.id, 'The original');

    await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
    await page.getByTestId('quote-reply-btn').first().click();

    const ta = page.getByTestId('comment-body');
    await ta.type('My reply');
    await page.getByRole('button', { name: 'Post comment' }).click();

    // After posting, the comment list should show the blockquote + reply text
    await expect(page.locator('blockquote').filter({ hasText: 'The original' })).toBeVisible({ timeout: 8000 });
  });
});
