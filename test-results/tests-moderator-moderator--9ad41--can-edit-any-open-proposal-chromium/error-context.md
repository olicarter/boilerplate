# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/moderator.spec.ts >> moderator tools >> moderator can edit any open proposal
- Location: e2e/tests/moderator.spec.ts:15:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Edit proposal' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
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
      - link "Settings" [ref=e11] [cursor=pointer]:
        - /url: /settings
    - generic [ref=e12]:
      - generic [ref=e13]:
        - link "Bob" [ref=e14] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/73258857-9ea7-47ab-a23a-07e219526d5d
        - button "Notifications" [ref=e16] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e17] [cursor=pointer]
  - main [ref=e18]:
    - generic [ref=e19]:
      - link "← Proposals" [ref=e20] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals
      - generic [ref=e21]:
        - generic [ref=e22]: Mod Topic
        - generic [ref=e23]: open
      - generic [ref=e24]:
        - heading "Original title" [level=1] [ref=e25]
        - button "Edit" [ref=e26] [cursor=pointer]
      - paragraph [ref=e27]:
        - text: by
        - link "Alice" [ref=e28] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/0043cef8-2a3e-4f94-ba5e-84170d517b99
        - text: · May 12, 2026
      - generic [ref=e29]:
        - button "👍" [ref=e30] [cursor=pointer]:
          - generic [ref=e31]: 👍
        - button "👎" [ref=e32] [cursor=pointer]:
          - generic [ref=e33]: 👎
        - button "💬" [ref=e34] [cursor=pointer]:
          - generic [ref=e35]: 💬
        - button "🎉" [ref=e36] [cursor=pointer]:
          - generic [ref=e37]: 🎉
        - button "🤔" [ref=e38] [cursor=pointer]:
          - generic [ref=e39]: 🤔
      - generic [ref=e40]:
        - heading "Results" [level=3] [ref=e41]
        - generic [ref=e42]:
          - paragraph [ref=e43]: No yes/no votes yet.
          - generic [ref=e45]: 0 votes total (delegation-resolved)
      - generic [ref=e46]:
        - heading "Your vote" [level=3] [ref=e47]
        - generic [ref=e49]:
          - textbox "Add a reason (optional)" [ref=e50]
          - generic [ref=e51]:
            - button "yes" [ref=e52] [cursor=pointer]
            - button "no" [ref=e53] [cursor=pointer]
            - button "abstain" [ref=e54] [cursor=pointer]
      - generic [ref=e55]:
        - paragraph [ref=e56]: Manage
        - generic [ref=e57]:
          - link "Export CSV" [ref=e58] [cursor=pointer]:
            - /url: /api/proposals/00000000-0000-0000-0000-000000000302/tally/csv
          - button "Send vote reminder" [ref=e59] [cursor=pointer]
          - button "Pin to top" [ref=e60] [cursor=pointer]
          - button "Close voting" [ref=e61] [cursor=pointer]
          - button "Withdraw" [ref=e62] [cursor=pointer]
      - generic [ref=e63]:
        - heading "Arguments (0)" [level=3] [ref=e64]
        - generic [ref=e65]:
          - generic [ref=e66]:
            - paragraph [ref=e67]: For
            - paragraph [ref=e69]: No for arguments yet.
          - generic [ref=e70]:
            - paragraph [ref=e71]: Against
            - paragraph [ref=e73]: No against arguments yet.
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76] [cursor=pointer]:
              - radio "For" [checked] [ref=e77]
              - generic [ref=e78]: For
            - generic [ref=e79] [cursor=pointer]:
              - radio "Against" [ref=e80]
              - generic [ref=e81]: Against
          - textbox "Add a for argument…" [ref=e82]
          - button "Add argument" [disabled] [ref=e84] [cursor=pointer]
      - generic [ref=e86]:
        - heading "Related" [level=3] [ref=e87]
        - button "+ Add link" [ref=e88] [cursor=pointer]
      - generic [ref=e90]:
        - heading "Amendments" [level=3] [ref=e91]
        - button "Propose amendment" [ref=e92] [cursor=pointer]
      - generic [ref=e93]:
        - heading "Discussion (0)" [level=3] [ref=e94]
        - generic [ref=e95]:
          - img [ref=e97]
          - paragraph [ref=e103]: No comments yet
          - paragraph [ref=e104]: Be the first to share your thoughts.
        - generic [ref=e105]:
          - generic [ref=e106]:
            - generic [ref=e108]: Add a comment
            - textbox "Add a comment" [ref=e110]:
              - /placeholder: Share your thoughts… Use @Name to mention members
          - button "Post comment" [disabled] [ref=e111]
```

# Test source

```ts
  1   | import { test, expect, API, ORG_SLUG } from '../fixtures';
  2   | 
  3   | const STORAGE_KEY = 'ripple_user';
  4   | 
  5   | async function switchToModerator(page: any, mod: { id: string; name: string; email: string; created_at: string }) {
  6   |   await page.request.post(`${API}/api/auth/test-setup`, { data: { name: mod.name, email: mod.email } });
  7   |   await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${mod.id}`, { data: { role: 'moderator' } });
  8   |   await page.addInitScript(
  9   |     ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
  10  |     { key: STORAGE_KEY, value: JSON.stringify(mod) },
  11  |   );
  12  | }
  13  | 
  14  | test.describe('moderator tools', () => {
  15  |   test('moderator can edit any open proposal', async ({ page, asAlice, bob, org }) => {
  16  |     // Alice creates a proposal
  17  |     const topicRes = await page.request.post(`${API}/api/topics`, {
  18  |       data: { id: '00000000-0000-0000-0000-000000000301', organisation_id: org.id, name: 'Mod Topic' },
  19  |     });
  20  |     const topic = await topicRes.json();
  21  |     const propRes = await page.request.post(`${API}/api/proposals`, {
  22  |       data: { id: '00000000-0000-0000-0000-000000000302', organisation_id: org.id, topic_id: topic.item.id, title: 'Original title', status: 'open' },
  23  |     });
  24  |     const prop = await propRes.json();
  25  | 
  26  |     // Switch to Bob as moderator
  27  |     await switchToModerator(page, bob);
  28  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${prop.item.id}`);
  29  | 
> 30  |     await expect(page.getByRole('button', { name: 'Edit proposal' })).toBeVisible();
      |                                                                       ^ Error: expect(locator).toBeVisible() failed
  31  |   });
  32  | 
  33  |   test('moderator can close any open proposal', async ({ page, asAlice, bob, org }) => {
  34  |     const topicRes = await page.request.post(`${API}/api/topics`, {
  35  |       data: { id: '00000000-0000-0000-0000-000000000303', organisation_id: org.id, name: 'Close Topic' },
  36  |     });
  37  |     const topic = await topicRes.json();
  38  |     const propRes = await page.request.post(`${API}/api/proposals`, {
  39  |       data: { id: '00000000-0000-0000-0000-000000000304', organisation_id: org.id, topic_id: topic.item.id, title: 'Close me', status: 'open' },
  40  |     });
  41  |     const prop = await propRes.json();
  42  | 
  43  |     await switchToModerator(page, bob);
  44  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${prop.item.id}`);
  45  | 
  46  |     await expect(page.getByRole('button', { name: 'Close voting' })).toBeVisible();
  47  |     await page.getByRole('button', { name: 'Close voting' }).click();
  48  |     await page.getByRole('button', { name: 'Yes, close' }).click();
  49  |     await expect(page.getByText('Voting closed')).toBeVisible();
  50  |   });
  51  | 
  52  |   test('API rejects proposal edit by plain member on another member\'s proposal', async ({ page, asAlice, bob, org }) => {
  53  |     const topicRes = await page.request.post(`${API}/api/topics`, {
  54  |       data: { id: '00000000-0000-0000-0000-000000000305', organisation_id: org.id, name: 'Member Topic' },
  55  |     });
  56  |     const topic = await topicRes.json();
  57  |     const propRes = await page.request.post(`${API}/api/proposals`, {
  58  |       data: { id: '00000000-0000-0000-0000-000000000306', organisation_id: org.id, topic_id: topic.item.id, title: 'Original', status: 'open' },
  59  |     });
  60  |     const prop = await propRes.json();
  61  | 
  62  |     // Switch to Bob as plain member
  63  |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  64  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  65  | 
  66  |     const res = await page.request.patch(`${API}/api/proposals/${prop.item.id}`, {
  67  |       data: { title: 'Hijacked title' },
  68  |     });
  69  |     expect(res.status()).toBe(403);
  70  |   });
  71  | 
  72  |   test('API allows proposal edit by moderator on another member\'s proposal', async ({ page, asAlice, bob, org }) => {
  73  |     const topicRes = await page.request.post(`${API}/api/topics`, {
  74  |       data: { id: '00000000-0000-0000-0000-000000000307', organisation_id: org.id, name: 'Edit Topic' },
  75  |     });
  76  |     const topic = await topicRes.json();
  77  |     const propRes = await page.request.post(`${API}/api/proposals`, {
  78  |       data: { id: '00000000-0000-0000-0000-000000000308', organisation_id: org.id, topic_id: topic.item.id, title: 'Original', status: 'open' },
  79  |     });
  80  |     const prop = await propRes.json();
  81  | 
  82  |     // Switch page session to Bob as moderator
  83  |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  84  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'moderator' } });
  85  | 
  86  |     const res = await page.request.patch(`${API}/api/proposals/${prop.item.id}`, {
  87  |       data: { title: 'Moderator edit' },
  88  |     });
  89  |     expect(res.status()).toBe(200);
  90  |   });
  91  | 
  92  |   test('moderator can delete any comment', async ({ page, asAlice, bob, org }) => {
  93  |     const topicRes = await page.request.post(`${API}/api/topics`, {
  94  |       data: { id: '00000000-0000-0000-0000-000000000309', organisation_id: org.id, name: 'Comment Topic' },
  95  |     });
  96  |     const topic = await topicRes.json();
  97  |     const propRes = await page.request.post(`${API}/api/proposals`, {
  98  |       data: { id: '00000000-0000-0000-0000-000000000310', organisation_id: org.id, topic_id: topic.item.id, title: 'Comment proposal', status: 'open' },
  99  |     });
  100 |     const prop = await propRes.json();
  101 | 
  102 |     // Alice posts a comment (page session is Alice)
  103 |     const commentRes = await page.request.post(`${API}/api/proposals/${prop.item.id}/comments`, {
  104 |       data: { id: '00000000-0000-0000-0000-000000000311', body: 'Alice\'s comment' },
  105 |     });
  106 |     const comment = await commentRes.json();
  107 | 
  108 |     // Switch to Bob as moderator
  109 |     await switchToModerator(page, bob);
  110 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${prop.item.id}`);
  111 | 
  112 |     // Moderator should see Delete button on Alice's comment
  113 |     await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible();
  114 |   });
  115 | 
  116 |   test('API rejects comment delete by plain member on another member\'s comment', async ({ page, asAlice, bob, org }) => {
  117 |     const topicRes = await page.request.post(`${API}/api/topics`, {
  118 |       data: { id: '00000000-0000-0000-0000-000000000312', organisation_id: org.id, name: 'Del Comment Topic' },
  119 |     });
  120 |     const topic = await topicRes.json();
  121 |     const propRes = await page.request.post(`${API}/api/proposals`, {
  122 |       data: { id: '00000000-0000-0000-0000-000000000313', organisation_id: org.id, topic_id: topic.item.id, title: 'Del comment proposal', status: 'open' },
  123 |     });
  124 |     const prop = await propRes.json();
  125 | 
  126 |     const commentRes = await page.request.post(`${API}/api/proposals/${prop.item.id}/comments`, {
  127 |       data: { id: '00000000-0000-0000-0000-000000000314', body: 'Alice comment' },
  128 |     });
  129 |     const comment = await commentRes.json();
  130 | 
```