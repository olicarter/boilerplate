# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/personal-filters.spec.ts >> comment count is shown on proposal card
- Location: e2e/tests/personal-filters.spec.ts:44:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('2 comments')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('2 comments')

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
          - /url: /orgs/ripple-test/users/f6896682-ec9f-4694-96c7-07cfdb2abd1c
        - button "Notifications" [ref=e17] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - heading "Proposals" [level=1] [ref=e22]
        - button "+ New proposal" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - searchbox "Search proposals…" [ref=e25]
        - combobox "Sort proposals" [ref=e26] [cursor=pointer]:
          - option "Newest" [selected]
          - option "Oldest"
          - option "Most votes"
      - generic [ref=e27]:
        - button "All topics" [ref=e28] [cursor=pointer]
        - button "Policy" [ref=e29] [cursor=pointer]
      - generic [ref=e30]:
        - button "All" [ref=e31] [cursor=pointer]
        - button "Open" [ref=e32] [cursor=pointer]
        - button "Closed" [ref=e33] [cursor=pointer]
        - button "Withdrawn" [ref=e34] [cursor=pointer]
        - button "Mine" [ref=e35] [cursor=pointer]
        - button "Voted" [ref=e36] [cursor=pointer]
      - link "Commented proposal Policy Open by Alice ↑ 0 ↓ 0 2c" [ref=e38] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals/350bac3b-9e36-44a5-85c9-b3f25d16e6f8
        - generic [ref=e40]:
          - generic [ref=e41]:
            - paragraph [ref=e42]: Commented proposal
            - generic [ref=e43]:
              - generic [ref=e44]: Policy
              - generic [ref=e45]: Open
            - paragraph [ref=e46]: by Alice
          - generic [ref=e47]:
            - generic [ref=e48]: ↑ 0
            - generic [ref=e49]: ↓ 0
            - generic [ref=e50]: 2c
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures';
  2  | import { createTopic, createProposal, createVote, createComment } from '../helpers';
  3  | 
  4  | // ── "My proposals" filter ─────────────────────────────────────────────────────
  5  | 
  6  | test('"My proposals" filter is visible when logged in', async ({ page, asAlice }) => {
  7  |   await page.goto('/orgs/ripple-test/proposals');
  8  |   await expect(page.getByRole('button', { name: 'My proposals' })).toBeVisible();
  9  | });
  10 | 
  11 | test('"My proposals" shows only proposals authored by current user', async ({ page, asAlice, bob, request }) => {
  12 |   const topic = await createTopic(page.request, 'Policy');
  13 |   await createProposal(page.request, topic.id, "Alice's proposal");
  14 |   await createProposal(request, topic.id, "Bob's proposal");
  15 | 
  16 |   await page.goto('/orgs/ripple-test/proposals');
  17 |   await page.getByRole('button', { name: 'My proposals' }).click();
  18 | 
  19 |   await expect(page.getByText("Alice's proposal")).toBeVisible();
  20 |   await expect(page.getByText("Bob's proposal")).not.toBeVisible();
  21 | });
  22 | 
  23 | test('"My votes" filter is visible when logged in', async ({ page, asAlice }) => {
  24 |   await page.goto('/orgs/ripple-test/proposals');
  25 |   await expect(page.getByRole('button', { name: 'My votes' })).toBeVisible();
  26 | });
  27 | 
  28 | test('"My votes" shows only proposals Alice voted on', async ({ page, asAlice, bob }) => {
  29 |   const topic = await createTopic(page.request, 'Policy');
  30 |   const voted = await createProposal(page.request, topic.id, 'Voted proposal');
  31 |   const unvoted = await createProposal(page.request, topic.id, 'Unvoted proposal');
  32 | 
  33 |   await createVote(page.request, voted.id, asAlice.id, 'yes');
  34 | 
  35 |   await page.goto('/orgs/ripple-test/proposals');
  36 |   await page.getByRole('button', { name: 'My votes' }).click();
  37 | 
  38 |   await expect(page.getByText('Voted proposal')).toBeVisible();
  39 |   await expect(page.getByText('Unvoted proposal')).not.toBeVisible();
  40 | });
  41 | 
  42 | // ── Comment count on proposal cards ──────────────────────────────────────────
  43 | 
  44 | test('comment count is shown on proposal card', async ({ page, asAlice }) => {
  45 |   const topic = await createTopic(page.request, 'Policy');
  46 |   const proposal = await createProposal(page.request, topic.id, 'Commented proposal');
  47 |   await createComment(page.request, proposal.id, 'First comment');
  48 |   await createComment(page.request, proposal.id, 'Second comment');
  49 | 
  50 |   await page.goto('/orgs/ripple-test/proposals');
> 51 |   await expect(page.getByText('2 comments')).toBeVisible();
     |                                              ^ Error: expect(locator).toBeVisible() failed
  52 | });
  53 | 
  54 | test('singular "comment" for one comment', async ({ page, asAlice }) => {
  55 |   const topic = await createTopic(page.request, 'Policy');
  56 |   const proposal = await createProposal(page.request, topic.id, 'One comment proposal');
  57 |   await createComment(page.request, proposal.id, 'Only comment');
  58 | 
  59 |   await page.goto('/orgs/ripple-test/proposals');
  60 |   await expect(page.getByText('1 comment')).toBeVisible();
  61 | });
  62 | 
  63 | test('no comment count shown when proposal has no comments', async ({ page, asAlice }) => {
  64 |   const topic = await createTopic(page.request, 'Policy');
  65 |   await createProposal(page.request, topic.id, 'Silent proposal');
  66 | 
  67 |   await page.goto('/orgs/ripple-test/proposals');
  68 |   await expect(page.getByText(/\d+ comment/)).not.toBeVisible();
  69 | });
  70 | 
```