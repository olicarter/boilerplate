# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/filters.spec.ts >> "All statuses" restores full list
- Location: e2e/tests/filters.spec.ts:73:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'All statuses' })

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
          - /url: /orgs/ripple-test/users/7b65746f-4057-452b-8466-ad587883107b
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
        - button "Open" [active] [ref=e32] [cursor=pointer]
        - button "Closed" [ref=e33] [cursor=pointer]
        - button "Withdrawn" [ref=e34] [cursor=pointer]
        - button "Mine" [ref=e35] [cursor=pointer]
        - button "Voted" [ref=e36] [cursor=pointer]
      - link "Open one Policy Open by Alice ↑ 0 ↓ 0" [ref=e38] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals/e7f5dc6c-2b7e-4b97-a13d-c4add347f871
        - generic [ref=e40]:
          - generic [ref=e41]:
            - paragraph [ref=e42]: Open one
            - generic [ref=e43]:
              - generic [ref=e44]: Policy
              - generic [ref=e45]: Open
            - paragraph [ref=e46]: by Alice
          - generic [ref=e47]:
            - generic [ref=e48]: ↑ 0
            - generic [ref=e49]: ↓ 0
```

# Test source

```ts
  1   | import { test, expect, API } from '../fixtures';
  2   | import { createTopic, createProposal } from '../helpers';
  3   | 
  4   | // ── Topic filter ──────────────────────────────────────────────────────────────
  5   | 
  6   | test('topic filter shows only proposals in that topic', async ({ page, asAlice }) => {
  7   |   const env = await createTopic(page.request, 'Environment');
  8   |   const pol = await createTopic(page.request, 'Policy');
  9   |   await createProposal(page.request, env.id, 'Solar panels');
  10  |   await createProposal(page.request, pol.id, 'New tax');
  11  | 
  12  |   await page.goto('/orgs/ripple-test/proposals');
  13  |   await page.getByRole('button', { name: 'Environment' }).click();
  14  | 
  15  |   await expect(page.getByText('Solar panels')).toBeVisible();
  16  |   await expect(page.getByText('New tax')).not.toBeVisible();
  17  | });
  18  | 
  19  | test('clicking "All topics" restores full list', async ({ page, asAlice }) => {
  20  |   const env = await createTopic(page.request, 'Environment');
  21  |   const pol = await createTopic(page.request, 'Policy');
  22  |   await createProposal(page.request, env.id, 'Solar panels');
  23  |   await createProposal(page.request, pol.id, 'New tax');
  24  | 
  25  |   await page.goto('/orgs/ripple-test/proposals');
  26  |   await page.getByRole('button', { name: 'Environment' }).click();
  27  |   await expect(page.getByText('New tax')).not.toBeVisible();
  28  | 
  29  |   await page.getByRole('button', { name: 'All topics' }).click();
  30  |   await expect(page.getByText('New tax')).toBeVisible();
  31  |   await expect(page.getByText('Solar panels')).toBeVisible();
  32  | });
  33  | 
  34  | // ── Status filter ─────────────────────────────────────────────────────────────
  35  | 
  36  | test('Open filter shows only open proposals', async ({ page, asAlice }) => {
  37  |   const topic = await createTopic(page.request, 'Policy');
  38  |   await createProposal(page.request, topic.id, 'Still open');
  39  |   await createProposal(page.request, topic.id, 'Already closed', { status: 'closed' });
  40  | 
  41  |   await page.goto('/orgs/ripple-test/proposals');
  42  |   await page.getByRole('button', { name: 'Open' }).click();
  43  | 
  44  |   await expect(page.getByText('Still open')).toBeVisible();
  45  |   await expect(page.getByText('Already closed')).not.toBeVisible();
  46  | });
  47  | 
  48  | test('Closed filter shows only closed proposals', async ({ page, asAlice }) => {
  49  |   const topic = await createTopic(page.request, 'Policy');
  50  |   await createProposal(page.request, topic.id, 'Still open');
  51  |   await createProposal(page.request, topic.id, 'Already closed', { status: 'closed' });
  52  | 
  53  |   await page.goto('/orgs/ripple-test/proposals');
  54  |   await page.getByRole('button', { name: 'Closed' }).click();
  55  | 
  56  |   await expect(page.getByText('Already closed')).toBeVisible();
  57  |   await expect(page.getByText('Still open')).not.toBeVisible();
  58  | });
  59  | 
  60  | test('Withdrawn filter shows only withdrawn proposals', async ({ page, asAlice }) => {
  61  |   const topic = await createTopic(page.request, 'Policy');
  62  |   await createProposal(page.request, topic.id, 'Still open');
  63  |   const withdrawn = await createProposal(page.request, topic.id, 'Pulled proposal');
  64  |   await page.request.post(`${API}/api/proposals/${withdrawn.id}/withdraw`);
  65  | 
  66  |   await page.goto('/orgs/ripple-test/proposals');
  67  |   await page.getByRole('button', { name: 'Withdrawn' }).click();
  68  | 
  69  |   await expect(page.getByText('Pulled proposal')).toBeVisible();
  70  |   await expect(page.getByText('Still open')).not.toBeVisible();
  71  | });
  72  | 
  73  | test('"All statuses" restores full list', async ({ page, asAlice }) => {
  74  |   const topic = await createTopic(page.request, 'Policy');
  75  |   await createProposal(page.request, topic.id, 'Open one');
  76  |   await createProposal(page.request, topic.id, 'Closed one', { status: 'closed' });
  77  | 
  78  |   await page.goto('/orgs/ripple-test/proposals');
  79  |   await page.getByRole('button', { name: 'Open' }).click();
  80  |   await expect(page.getByText('Closed one')).not.toBeVisible();
  81  | 
> 82  |   await page.getByRole('button', { name: 'All statuses' }).click();
      |                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  83  |   await expect(page.getByText('Open one')).toBeVisible();
  84  |   await expect(page.getByText('Closed one')).toBeVisible();
  85  | });
  86  | 
  87  | // ── Validation: user display name ────────────────────────────────────────────
  88  | 
  89  | test('API rejects empty display name', async ({ page, asAlice }) => {
  90  |   const res = await page.request.patch(`${API}/api/users/${asAlice.id}`, {
  91  |     data: { name: '' },
  92  |   });
  93  |   expect(res.status()).toBe(400);
  94  | });
  95  | 
  96  | test('API rejects display name exceeding 100 chars', async ({ page, asAlice }) => {
  97  |   const res = await page.request.patch(`${API}/api/users/${asAlice.id}`, {
  98  |     data: { name: 'A'.repeat(101) },
  99  |   });
  100 |   expect(res.status()).toBe(400);
  101 |   const body = await res.json();
  102 |   expect(body.message).toMatch(/100/);
  103 | });
  104 | 
```