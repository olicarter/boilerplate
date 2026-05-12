# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/comment-pin.spec.ts >> comment pinning >> proposal author sees Pin button on comments
- Location: e2e/tests/comment-pin.spec.ts:5:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Pin' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'Pin' }) resolved to 2 elements:
    1) <button data-testid="pin-proposal">Pin to top</button> aka getByTestId('pin-proposal')
    2) <button type="button">Pin</button> aka getByRole('button', { name: 'Pin', exact: true })

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Pin' })

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
          - /url: /orgs/ripple-test/users/b661bf95-1951-4423-ad3e-4c94606db2ef
        - button "Notifications" [ref=e17] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - link "← Proposals" [ref=e21] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals
      - generic [ref=e22]:
        - generic [ref=e23]: Pin Topic
        - generic [ref=e24]: open
      - generic [ref=e25]:
        - heading "Pin proposal" [level=1] [ref=e26]
        - button "Edit" [ref=e27] [cursor=pointer]
      - paragraph [ref=e28]:
        - text: by
        - link "Alice" [ref=e29] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/b661bf95-1951-4423-ad3e-4c94606db2ef
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
            - /url: /api/proposals/75aa087a-3337-46ba-9ccb-7c4757fe1a50/tally/csv
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
        - heading "Discussion (1)" [level=3] [ref=e97]
        - generic [ref=e99]:
          - generic [ref=e100]: A
          - generic [ref=e101]:
            - generic [ref=e102]:
              - generic [ref=e103]: Alice
              - generic [ref=e104]: May 12, 2026
              - generic [ref=e105]:
                - button "Edit" [ref=e106] [cursor=pointer]
                - button "Pin" [ref=e107] [cursor=pointer]
                - button "Hide" [ref=e108] [cursor=pointer]
                - button "Delete" [ref=e109] [cursor=pointer]
            - paragraph [ref=e112]: Pinnable comment
            - generic [ref=e113]:
              - button "Reply" [ref=e114] [cursor=pointer]
              - button "👍" [ref=e115] [cursor=pointer]
              - button "👎" [ref=e116] [cursor=pointer]
              - button "❤️" [ref=e117] [cursor=pointer]
              - button "🤔" [ref=e118] [cursor=pointer]
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic [ref=e122]: Add a comment
            - textbox "Add a comment" [ref=e124]:
              - /placeholder: Share your thoughts… Use @Name to mention members
          - button "Post comment" [disabled] [ref=e125]
```

# Test source

```ts
  1  | import { test, expect, API, ORG_SLUG } from '../fixtures';
  2  | import { createTopic, createProposal, createComment } from '../helpers';
  3  | 
  4  | test.describe('comment pinning', () => {
  5  |   test('proposal author sees Pin button on comments', async ({ page, asAlice }) => {
  6  |     const topic = await createTopic(page.request, 'Pin Topic');
  7  |     const proposal = await createProposal(page.request, topic.id, 'Pin proposal');
  8  |     await createComment(page.request, proposal.id, 'Pinnable comment');
  9  | 
  10 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  11 |     await expect(page.getByText('Pinnable comment')).toBeVisible({ timeout: 10000 });
> 12 |     await expect(page.getByRole('button', { name: 'Pin' })).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  13 |   });
  14 | 
  15 |   test('author can pin a comment and it shows pinned indicator', async ({ page, asAlice }) => {
  16 |     const topic = await createTopic(page.request, 'Pin2 Topic');
  17 |     const proposal = await createProposal(page.request, topic.id, 'Pin2 proposal');
  18 |     await createComment(page.request, proposal.id, 'Key context comment');
  19 | 
  20 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  21 |     await expect(page.getByText('Key context comment')).toBeVisible({ timeout: 10000 });
  22 |     await page.getByRole('button', { name: 'Pin' }).click();
  23 | 
  24 |     await expect(page.getByText('Comment pinned')).toBeVisible({ timeout: 10000 });
  25 |     await expect(page.getByText('📌 Pinned')).toBeVisible();
  26 |     await expect(page.getByRole('button', { name: 'Unpin' })).toBeVisible();
  27 |   });
  28 | 
  29 |   test('pinned comment appears at top of discussion', async ({ page, asAlice, bob }) => {
  30 |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  31 |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  32 |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: asAlice.name, email: asAlice.email } });
  33 | 
  34 |     const topic = await createTopic(page.request, 'Order Topic');
  35 |     const proposal = await createProposal(page.request, topic.id, 'Order proposal');
  36 |     const first = await createComment(page.request, proposal.id, 'First comment');
  37 |     await createComment(page.request, proposal.id, 'Second comment — will be pinned');
  38 | 
  39 |     // Pin the second comment via API
  40 |     await page.request.post(`${API}/api/comments/${first.id}/pin`);
  41 | 
  42 |     // Wait a moment then reload to get Electric sync
  43 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  44 |     await expect(page.getByText('First comment')).toBeVisible({ timeout: 10000 });
  45 | 
  46 |     // Pinned comment should appear before non-pinned
  47 |     const commentTexts = await page.locator('[data-testid="comment-body"]').allTextContents().catch(() => null);
  48 |     // Just check both are visible; order verified by Electric sync
  49 |     await expect(page.getByText('Second comment — will be pinned')).toBeVisible();
  50 |   });
  51 | 
  52 |   test('max 2 comments can be pinned per proposal', async ({ page, asAlice }) => {
  53 |     const topic = await createTopic(page.request, 'Max Pin Topic');
  54 |     const proposal = await createProposal(page.request, topic.id, 'Max pin proposal');
  55 |     const c1 = await createComment(page.request, proposal.id, 'Pin 1');
  56 |     const c2 = await createComment(page.request, proposal.id, 'Pin 2');
  57 |     const c3 = await createComment(page.request, proposal.id, 'Pin 3 — should fail');
  58 | 
  59 |     await page.request.post(`${API}/api/comments/${c1.id}/pin`);
  60 |     await page.request.post(`${API}/api/comments/${c2.id}/pin`);
  61 |     const res = await page.request.post(`${API}/api/comments/${c3.id}/pin`);
  62 |     expect(res.status()).toBe(400);
  63 |   });
  64 | 
  65 |   test('author can unpin a pinned comment', async ({ page, asAlice }) => {
  66 |     const topic = await createTopic(page.request, 'Unpin Topic');
  67 |     const proposal = await createProposal(page.request, topic.id, 'Unpin proposal');
  68 |     const comment = await createComment(page.request, proposal.id, 'Will be unpinned');
  69 |     await page.request.post(`${API}/api/comments/${comment.id}/pin`);
  70 | 
  71 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${proposal.id}`);
  72 |     await expect(page.getByText('📌 Pinned')).toBeVisible({ timeout: 10000 });
  73 |     await page.getByRole('button', { name: 'Unpin' }).click();
  74 | 
  75 |     await expect(page.getByText('Comment unpinned')).toBeVisible({ timeout: 10000 });
  76 |     await expect(page.getByText('📌 Pinned')).not.toBeVisible();
  77 |   });
  78 | });
  79 | 
```