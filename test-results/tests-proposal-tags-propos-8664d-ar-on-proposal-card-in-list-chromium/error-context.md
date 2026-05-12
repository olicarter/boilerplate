# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/proposal-tags.spec.ts >> proposal tags >> tags appear on proposal card in list
- Location: e2e/tests/proposal-tags.spec.ts:22:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Edit proposal' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]: Ripple
    - navigation [ref=e6]:
      - link "Proposals" [ref=e7] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals
      - link "Delegations" [ref=e8] [cursor=pointer]:
        - /url: /orgs/ripple-test/delegations
      - link "Members" [ref=e9] [cursor=pointer]:
        - /url: /orgs/ripple-test/members
      - link "Activity" [ref=e10] [cursor=pointer]:
        - /url: /orgs/ripple-test/activity
      - link "Admin" [ref=e11] [cursor=pointer]:
        - /url: /orgs/ripple-test/admin
      - link "Settings" [ref=e12] [cursor=pointer]:
        - /url: /settings
    - generic [ref=e13]:
      - generic [ref=e14]:
        - link "Alice" [ref=e15] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/09603ccc-443b-4a6c-93f4-1788644affc3
        - button "Notifications" [ref=e17] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - link "← Proposals" [ref=e21] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals
      - generic [ref=e22]:
        - generic [ref=e23]: Policy
        - generic [ref=e24]: open
      - generic [ref=e25]:
        - heading "Tagged proposal" [level=1] [ref=e26]
        - button "Edit" [ref=e27] [cursor=pointer]
      - paragraph [ref=e28]:
        - text: by
        - link "Alice" [ref=e29] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/09603ccc-443b-4a6c-93f4-1788644affc3
        - text: · May 12, 2026
      - generic [ref=e30]:
        - button "👍" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]: 👍
        - button "👎" [ref=e33] [cursor=pointer]:
          - generic [ref=e34]: 👎
        - button "💬" [ref=e35] [cursor=pointer]:
          - generic [ref=e36]: 💬
        - button "🎉" [ref=e37] [cursor=pointer]:
          - generic [ref=e38]: 🎉
        - button "🤔" [ref=e39] [cursor=pointer]:
          - generic [ref=e40]: 🤔
      - button "Cast veto" [ref=e42] [cursor=pointer]
      - generic [ref=e43]:
        - heading "Results" [level=3] [ref=e44]
        - generic [ref=e45]:
          - paragraph [ref=e46]: No yes/no votes yet.
          - generic [ref=e48]: 0 votes total (delegation-resolved)
      - generic [ref=e49]:
        - heading "Your vote" [level=3] [ref=e50]
        - generic [ref=e52]:
          - textbox "Add a reason (optional)" [ref=e53]
          - generic [ref=e54]:
            - button "yes" [ref=e55] [cursor=pointer]
            - button "no" [ref=e56] [cursor=pointer]
            - button "abstain" [ref=e57] [cursor=pointer]
      - generic [ref=e58]:
        - paragraph [ref=e59]: Manage
        - generic [ref=e60]:
          - link "Export CSV" [ref=e61] [cursor=pointer]:
            - /url: /api/proposals/92c1bdb7-0743-458a-a46a-9afb0fae2281/tally/csv
          - button "Send vote reminder" [ref=e62] [cursor=pointer]
          - button "Pin to top" [ref=e63] [cursor=pointer]
          - button "Close voting" [ref=e64] [cursor=pointer]
          - button "Withdraw" [ref=e65] [cursor=pointer]
      - generic [ref=e66]:
        - heading "Arguments (0)" [level=3] [ref=e67]
        - generic [ref=e68]:
          - generic [ref=e69]:
            - paragraph [ref=e70]: For
            - paragraph [ref=e72]: No for arguments yet.
          - generic [ref=e73]:
            - paragraph [ref=e74]: Against
            - paragraph [ref=e76]: No against arguments yet.
        - generic [ref=e77]:
          - generic [ref=e78]:
            - generic [ref=e79] [cursor=pointer]:
              - radio "For" [checked] [ref=e80]
              - generic [ref=e81]: For
            - generic [ref=e82] [cursor=pointer]:
              - radio "Against" [ref=e83]
              - generic [ref=e84]: Against
          - textbox "Add a for argument…" [ref=e85]
          - button "Add argument" [disabled] [ref=e87] [cursor=pointer]
      - generic [ref=e89]:
        - heading "Related" [level=3] [ref=e90]
        - button "+ Add link" [ref=e91] [cursor=pointer]
      - generic [ref=e93]:
        - heading "Amendments" [level=3] [ref=e94]
        - button "Propose amendment" [ref=e95] [cursor=pointer]
      - generic [ref=e96]:
        - heading "Discussion (0)" [level=3] [ref=e97]
        - generic [ref=e98]:
          - img [ref=e100]
          - paragraph [ref=e106]: No comments yet
          - paragraph [ref=e107]: Be the first to share your thoughts.
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e111]: Add a comment
            - textbox "Add a comment" [ref=e113]:
              - /placeholder: Share your thoughts… Use @Name to mention members
          - button "Post comment" [disabled] [ref=e114]
```

# Test source

```ts
  1  | import { test, expect, ORG_SLUG } from '../fixtures';
  2  | import { createTopic, createProposal } from '../helpers';
  3  | 
  4  | test.describe('proposal tags', () => {
  5  |   test('author can add tags when editing a proposal', async ({ page, asAlice }) => {
  6  |     const topic = await createTopic(page.request, 'Policy');
  7  |     const proposal = await createProposal(page.request, topic.id, 'Tag me');
  8  | 
  9  |     await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  10 |     await page.getByRole('button', { name: 'Edit proposal' }).click();
  11 |     await page.getByTestId('tag-input').fill('urgent');
  12 |     await page.getByTestId('add-tag-btn').click();
  13 |     await page.getByTestId('tag-input').fill('budget');
  14 |     await page.getByTestId('add-tag-btn').click();
  15 |     await page.getByRole('button', { name: 'Save changes' }).click();
  16 | 
  17 |     await expect(page.getByTestId('proposal-tag').first()).toBeVisible({ timeout: 6000 });
  18 |     await expect(page.getByText('urgent')).toBeVisible();
  19 |     await expect(page.getByText('budget')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('tags appear on proposal card in list', async ({ page, asAlice }) => {
  23 |     const topic = await createTopic(page.request, 'Policy');
  24 |     const proposal = await createProposal(page.request, topic.id, 'Tagged proposal');
  25 | 
  26 |     // Add a tag via edit
  27 |     await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
> 28 |     await page.getByRole('button', { name: 'Edit proposal' }).click();
     |                                                               ^ Error: locator.click: Test timeout of 30000ms exceeded.
  29 |     await page.getByTestId('tag-input').fill('environment');
  30 |     await page.getByTestId('add-tag-btn').click();
  31 |     await page.getByRole('button', { name: 'Save changes' }).click();
  32 |     await expect(page.getByTestId('proposal-tag').first()).toBeVisible({ timeout: 6000 });
  33 | 
  34 |     await page.goto(`/orgs/${ORG_SLUG}/proposals`);
  35 |     await expect(page.getByTestId('proposal-card-tag-environment')).toBeVisible({ timeout: 6000 });
  36 |   });
  37 | 
  38 |   test('tag filter button appears when proposals have tags', async ({ page, asAlice }) => {
  39 |     const topic = await createTopic(page.request, 'Policy');
  40 |     const proposal = await createProposal(page.request, topic.id, 'Tagged for filter');
  41 | 
  42 |     await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  43 |     await page.getByRole('button', { name: 'Edit proposal' }).click();
  44 |     await page.getByTestId('tag-input').fill('finance');
  45 |     await page.getByTestId('add-tag-btn').click();
  46 |     await page.getByRole('button', { name: 'Save changes' }).click();
  47 |     await expect(page.getByTestId('proposal-tag').first()).toBeVisible({ timeout: 6000 });
  48 | 
  49 |     await page.goto(`/orgs/${ORG_SLUG}/proposals`);
  50 |     await expect(page.getByTestId('tag-filter-finance')).toBeVisible({ timeout: 6000 });
  51 |   });
  52 | 
  53 |   test('clicking tag filter shows only matching proposals', async ({ page, asAlice }) => {
  54 |     const topic = await createTopic(page.request, 'Policy');
  55 |     const p1 = await createProposal(page.request, topic.id, 'Tagged with foo');
  56 |     await createProposal(page.request, topic.id, 'No tags here');
  57 | 
  58 |     await page.goto(`/orgs/${ORG_SLUG}/proposals/${p1.id}`);
  59 |     await page.getByRole('button', { name: 'Edit proposal' }).click();
  60 |     await page.getByTestId('tag-input').fill('foo');
  61 |     await page.getByTestId('add-tag-btn').click();
  62 |     await page.getByRole('button', { name: 'Save changes' }).click();
  63 |     await expect(page.getByTestId('proposal-tag').first()).toBeVisible({ timeout: 6000 });
  64 | 
  65 |     await page.goto(`/orgs/${ORG_SLUG}/proposals`);
  66 |     await page.getByTestId('tag-filter-foo').click();
  67 | 
  68 |     await expect(page.getByText('Tagged with foo')).toBeVisible({ timeout: 5000 });
  69 |     await expect(page.getByText('No tags here')).not.toBeVisible();
  70 |   });
  71 | 
  72 |   test('can remove a tag when editing', async ({ page, asAlice }) => {
  73 |     const topic = await createTopic(page.request, 'Policy');
  74 |     const proposal = await createProposal(page.request, topic.id, 'Remove tag test');
  75 | 
  76 |     await page.goto(`/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  77 |     await page.getByRole('button', { name: 'Edit proposal' }).click();
  78 |     await page.getByTestId('tag-input').fill('removable');
  79 |     await page.getByTestId('add-tag-btn').click();
  80 |     // Remove the tag
  81 |     await page.locator('button', { hasText: '×' }).first().click();
  82 |     await page.getByRole('button', { name: 'Save changes' }).click();
  83 | 
  84 |     await expect(page.getByTestId('proposal-tag')).not.toBeVisible({ timeout: 5000 });
  85 |   });
  86 | });
  87 | 
```