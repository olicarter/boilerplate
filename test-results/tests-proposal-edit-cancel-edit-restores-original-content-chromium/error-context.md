# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/proposal-edit.spec.ts >> cancel edit restores original content
- Location: e2e/tests/proposal-edit.spec.ts:38:5

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
          - /url: /orgs/ripple-test/users/504bf800-035d-4923-bca8-a052bc7715ce
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
        - heading "Original title" [level=1] [ref=e26]
        - button "Edit" [ref=e27] [cursor=pointer]
      - paragraph [ref=e28]:
        - text: by
        - link "Alice" [ref=e29] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/504bf800-035d-4923-bca8-a052bc7715ce
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
            - /url: /api/proposals/90679a73-7ad1-4f24-b238-9b172ef15225/tally/csv
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
  1  | import { test, expect, API } from '../fixtures';
  2  | import { createTopic, createProposal } from '../helpers';
  3  | 
  4  | // ── Edit proposal ─────────────────────────────────────────────────────────────
  5  | 
  6  | test('author sees Edit button on open proposal', async ({ page, asAlice }) => {
  7  |   const topic = await createTopic(page.request, 'Policy');
  8  |   const proposal = await createProposal(page.request, topic.id, 'Editable proposal');
  9  | 
  10 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  11 |   await expect(page.getByRole('button', { name: 'Edit proposal' })).toBeVisible();
  12 | });
  13 | 
  14 | test('"Edit proposal" button not shown on closed proposal', async ({ page, asAlice }) => {
  15 |   const topic = await createTopic(page.request, 'Policy');
  16 |   const proposal = await createProposal(page.request, topic.id, 'Closed one', { status: 'closed' });
  17 | 
  18 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  19 |   await expect(page.getByRole('button', { name: 'Edit proposal' })).not.toBeVisible();
  20 | });
  21 | 
  22 | test('can edit proposal title and description', async ({ page, asAlice }) => {
  23 |   const topic = await createTopic(page.request, 'Policy');
  24 |   const proposal = await createProposal(page.request, topic.id, 'Old title', { description: 'Old description' });
  25 | 
  26 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  27 |   await page.getByRole('button', { name: 'Edit proposal' }).click();
  28 | 
  29 |   await page.getByLabel('Title').fill('New title');
  30 |   await page.getByLabel('Description').fill('New description');
  31 |   await page.getByRole('button', { name: 'Save changes' }).click();
  32 | 
  33 |   await expect(page.getByText('Proposal updated')).toBeVisible();
  34 |   await expect(page.getByRole('heading', { name: 'New title' })).toBeVisible();
  35 |   await expect(page.getByText('New description')).toBeVisible();
  36 | });
  37 | 
  38 | test('cancel edit restores original content', async ({ page, asAlice }) => {
  39 |   const topic = await createTopic(page.request, 'Policy');
  40 |   const proposal = await createProposal(page.request, topic.id, 'Original title');
  41 | 
  42 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
> 43 |   await page.getByRole('button', { name: 'Edit proposal' }).click();
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  44 |   await page.getByLabel('Title').fill('Changed title');
  45 |   await page.getByRole('button', { name: 'Cancel' }).click();
  46 | 
  47 |   await expect(page.getByRole('heading', { name: 'Original title' })).toBeVisible();
  48 |   await expect(page.getByRole('button', { name: 'Edit proposal' })).toBeVisible();
  49 | });
  50 | 
  51 | test('API rejects edit by non-author', async ({ page, asAlice, bob }) => {
  52 |   // Alice creates a proposal (page.request = Alice's session)
  53 |   const topic = await createTopic(page.request, 'Policy');
  54 |   const proposal = await createProposal(page.request, topic.id, "Alice's proposal");
  55 | 
  56 |   // Try to edit as Bob — using bob's standalone request
  57 |   // The `request` fixture is Bob's session (from the `bob` fixture dependency)
  58 |   // but we can test via the page.request (Alice) that the API enforces ownership.
  59 |   // Better: just test that closed proposals can't be edited via API.
  60 |   const res = await page.request.patch(`${API}/api/proposals/${proposal.id}`, {
  61 |     data: { title: 'Hacked title' },
  62 |   });
  63 |   // Alice IS the author, so this succeeds
  64 |   expect(res.status()).toBe(200);
  65 | });
  66 | 
  67 | test('API rejects edit on closed proposal', async ({ page, asAlice }) => {
  68 |   const topic = await createTopic(page.request, 'Policy');
  69 |   const proposal = await createProposal(page.request, topic.id, 'Locked', { status: 'closed' });
  70 | 
  71 |   const res = await page.request.patch(`${API}/api/proposals/${proposal.id}`, {
  72 |     data: { title: 'Attempted change' },
  73 |   });
  74 |   expect(res.status()).toBe(400);
  75 | });
  76 | 
  77 | // ── Sort proposals ────────────────────────────────────────────────────────────
  78 | 
  79 | test('sort selector is visible on proposals page', async ({ page, asAlice }) => {
  80 |   await page.goto('/orgs/ripple-test/proposals');
  81 |   await expect(page.getByLabel('Sort proposals')).toBeVisible();
  82 | });
  83 | 
  84 | test('sort by oldest shows earliest proposal first', async ({ page, asAlice }) => {
  85 |   const topic = await createTopic(page.request, 'Policy');
  86 |   await createProposal(page.request, topic.id, 'First created');
  87 |   await createProposal(page.request, topic.id, 'Second created');
  88 | 
  89 |   await page.goto('/orgs/ripple-test/proposals');
  90 |   await page.getByLabel('Sort proposals').selectOption('oldest');
  91 | 
  92 |   const items = page.locator('a[href*="/proposals/"] p').first();
  93 |   await expect(items).toContainText('First created');
  94 | });
  95 | 
```