# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/leave-org.spec.ts >> member can leave an org and is redirected to org list
- Location: e2e/tests/leave-org.spec.ts:10:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "https://localhost:5174/"
Received: "https://localhost:5174/orgs/ripple-test"
Timeout:  15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    2 × unexpected value "https://localhost:5174/orgs/ripple-test/members"
    17 × unexpected value "https://localhost:5174/orgs/ripple-test"

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
        - link "Alice" [ref=e14] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/de6af36f-d220-4021-bc26-599a5045fdfb
        - button "Notifications" [ref=e16] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e17] [cursor=pointer]
  - main [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - heading "Ripple Test" [level=2] [ref=e21]
        - paragraph [ref=e22]: /ripple-test
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]: "1"
          - generic [ref=e26]: member
        - generic [ref=e27]:
          - generic [ref=e28]: "0"
          - generic [ref=e29]: open
        - generic [ref=e30]:
          - generic [ref=e31]: "0"
          - generic [ref=e32]: proposals
      - generic [ref=e33]:
        - link "🗳 Proposals" [ref=e34] [cursor=pointer]:
          - /url: /orgs/ripple-test/proposals
          - generic [ref=e35]:
            - generic [ref=e36]: 🗳
            - generic [ref=e37]: Proposals
        - link "↔ Delegations" [ref=e38] [cursor=pointer]:
          - /url: /orgs/ripple-test/delegations
          - generic [ref=e39]:
            - generic [ref=e40]: ↔
            - generic [ref=e41]: Delegations
        - link "👥 Members" [ref=e42] [cursor=pointer]:
          - /url: /orgs/ripple-test/members
          - generic [ref=e43]:
            - generic [ref=e44]: 👥
            - generic [ref=e45]: Members
      - generic [ref=e46]:
        - generic [ref=e47]:
          - heading "Recent proposals" [level=3] [ref=e48]
          - link "View all →" [ref=e49] [cursor=pointer]:
            - /url: /orgs/ripple-test/proposals
        - paragraph [ref=e50]: No proposals yet.
```

# Test source

```ts
  1  | import { test, expect, API } from '../fixtures';
  2  | import { TEST_ORG_ID } from '../helpers';
  3  | 
  4  | test('Leave button is visible on own member row', async ({ page, asAlice }) => {
  5  |   await page.goto('/orgs/ripple-test/members');
  6  |   const aliceRow = page.getByText('Alice').locator('..').locator('..');
  7  |   await expect(aliceRow.getByRole('button', { name: 'Leave' })).toBeVisible();
  8  | });
  9  | 
  10 | test('member can leave an org and is redirected to org list', async ({ page, asAlice, bob }) => {
  11 |   // Add Bob as admin so Alice is not the last admin
  12 |   await page.request.post(`${API}/api/orgs/ripple-test/members`, {
  13 |     data: { user_id: bob.id, role: 'admin' },
  14 |   });
  15 | 
  16 |   await page.goto('/orgs/ripple-test/members');
  17 |   await page.getByRole('button', { name: 'Leave' }).click();
  18 |   await page.getByRole('button', { name: 'Yes, leave' }).click();
  19 | 
> 20 |   await expect(page).toHaveURL('/');
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  21 | });
  22 | 
  23 | test('last admin cannot leave via API', async ({ page, asAlice }) => {
  24 |   const res = await page.request.delete(`${API}/api/orgs/ripple-test/members/${asAlice.id}`);
  25 |   expect(res.status()).toBe(403);
  26 |   const body = await res.json();
  27 |   expect(body.message).toMatch(/last admin/i);
  28 | });
  29 | 
  30 | test('non-admin member can leave via API', async ({ page, asAlice, bob }) => {
  31 |   // Add Bob as a regular member
  32 |   await page.request.post(`${API}/api/orgs/ripple-test/members`, {
  33 |     data: { user_id: bob.id, role: 'member' },
  34 |   });
  35 | 
  36 |   // Bob removes himself (using Alice's page session to call on Bob's behalf isn't possible,
  37 |   // so we verify the API allows a member to remove themselves via the server rule)
  38 |   // The service allows self-removal without admin check, so verify the endpoint logic via Alice removing Bob
  39 |   const res = await page.request.delete(`${API}/api/orgs/ripple-test/members/${bob.id}`);
  40 |   expect(res.status()).toBe(200);
  41 | });
  42 | 
```