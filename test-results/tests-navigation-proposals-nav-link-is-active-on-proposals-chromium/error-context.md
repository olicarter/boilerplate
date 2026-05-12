# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/navigation.spec.ts >> proposals nav link is active on /proposals
- Location: e2e/tests/navigation.spec.ts:8:5

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  getByRole('link', { name: 'Proposals' })
Expected: "600"
Received: "500"
Timeout:  15000ms

Call log:
  - Expect "toHaveCSS" with timeout 15000ms
  - waiting for getByRole('link', { name: 'Proposals' })
    17 × locator resolved to <a aria-current="page" data-status="active" href="/orgs/ripple-test/proposals" class="_navLink_kezc3_37 _navLink_kezc3_37 _navLinkActive_kezc3_54">Proposals</a>
       - unexpected value "500"

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
          - /url: /orgs/ripple-test/users/97bedec5-2b64-464c-b11c-6a96f3fb92e0
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
      - button "All topics" [ref=e28] [cursor=pointer]
      - generic [ref=e29]:
        - button "All" [ref=e30] [cursor=pointer]
        - button "Open" [ref=e31] [cursor=pointer]
        - button "Closed" [ref=e32] [cursor=pointer]
        - button "Withdrawn" [ref=e33] [cursor=pointer]
        - button "Mine" [ref=e34] [cursor=pointer]
        - button "Voted" [ref=e35] [cursor=pointer]
      - generic [ref=e36]:
        - img [ref=e38]
        - paragraph [ref=e45]: No proposals yet
        - paragraph [ref=e46]: Be the first to start a discussion.
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures';
  2  | 
  3  | test('/ shows organisations list', async ({ page, asAlice }) => {
  4  |   await page.goto('/');
  5  |   await expect(page.getByRole('heading', { name: 'Organisations' })).toBeVisible();
  6  | });
  7  | 
  8  | test('proposals nav link is active on /proposals', async ({ page, asAlice }) => {
  9  |   await page.goto('/orgs/ripple-test/proposals');
  10 |   const link = page.getByRole('link', { name: 'Proposals' });
> 11 |   await expect(link).toHaveCSS('font-weight', '600');
     |                      ^ Error: expect(locator).toHaveCSS(expected) failed
  12 | });
  13 | 
  14 | test('delegations nav link navigates to /delegations', async ({ page, asAlice }) => {
  15 |   await page.goto('/orgs/ripple-test/proposals');
  16 |   await page.getByRole('link', { name: 'Delegations' }).click();
  17 |   await expect(page).toHaveURL('/orgs/ripple-test/delegations');
  18 | });
  19 | 
  20 | test('delegations nav link is active on /delegations', async ({ page, asAlice }) => {
  21 |   await page.goto('/orgs/ripple-test/delegations');
  22 |   const link = page.getByRole('link', { name: 'Delegations' });
  23 |   await expect(link).toHaveCSS('font-weight', '600');
  24 | });
  25 | 
  26 | test('proposals nav link is not active on /delegations', async ({ page, asAlice }) => {
  27 |   await page.goto('/orgs/ripple-test/delegations');
  28 |   const link = page.getByRole('link', { name: 'Proposals' });
  29 |   await expect(link).not.toHaveCSS('font-weight', '600');
  30 | });
  31 | 
```