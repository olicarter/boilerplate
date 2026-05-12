# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/navigation.spec.ts >> delegations nav link is active on /delegations
- Location: e2e/tests/navigation.spec.ts:20:5

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  getByRole('link', { name: 'Delegations' })
Expected: "600"
Received: "500"
Timeout:  15000ms

Call log:
  - Expect "toHaveCSS" with timeout 15000ms
  - waiting for getByRole('link', { name: 'Delegations' })
    16 × locator resolved to <a aria-current="page" data-status="active" href="/orgs/ripple-test/delegations" class="_navLink_kezc3_37 _navLink_kezc3_37 _navLinkActive_kezc3_54">Delegations</a>
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
          - /url: /orgs/ripple-test/users/ee8039cd-3dfb-4e31-98b7-6c6f5d3c5fbb
        - button "Notifications" [ref=e17] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - heading "Delegations" [level=2] [ref=e22]
        - link "View network graph →" [ref=e23] [cursor=pointer]:
          - /url: /orgs/ripple-test/delegations/network
      - generic [ref=e24]:
        - heading "You are delegating to" [level=3] [ref=e25]
        - generic [ref=e26]:
          - img [ref=e28]
          - paragraph [ref=e33]: No delegations set
          - paragraph [ref=e34]: Delegate your vote to someone you trust on all topics or a specific one.
      - generic [ref=e35]:
        - heading "Add delegation" [level=3] [ref=e36]
        - generic [ref=e37]:
          - generic [ref=e38]:
            - generic [ref=e39]: Delegate to
            - textbox "Search by name or email…" [ref=e41]
          - generic [ref=e42]:
            - generic [ref=e43]:
              - generic [ref=e44]: Scope
              - combobox "Scope" [ref=e45]:
                - option "Global (all topics)" [selected]
            - generic [ref=e46]:
              - generic [ref=e47]: Expires (optional)
              - textbox "Expires (optional)" [ref=e48]
            - generic [ref=e49]:
              - generic [ref=e50]: Weight %
              - spinbutton "Weight %" [ref=e51]: "100"
          - generic [ref=e52]:
            - generic [ref=e53]: Conditional (optional — void if delegate hasn't voted within N hours of deadline)
            - generic [ref=e54]:
              - spinbutton "Conditional (optional — void if delegate hasn't voted within N hours of deadline)" [ref=e55]
              - generic [ref=e56]: hours before deadline
          - button "Add delegation" [disabled] [ref=e57]
      - generic [ref=e58]:
        - heading "Delegated to you" [level=3] [ref=e59]
        - generic [ref=e60]:
          - img [ref=e62]
          - paragraph [ref=e67]: Nobody has delegated to you yet
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
  11 |   await expect(link).toHaveCSS('font-weight', '600');
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
> 23 |   await expect(link).toHaveCSS('font-weight', '600');
     |                      ^ Error: expect(locator).toHaveCSS(expected) failed
  24 | });
  25 | 
  26 | test('proposals nav link is not active on /delegations', async ({ page, asAlice }) => {
  27 |   await page.goto('/orgs/ripple-test/delegations');
  28 |   const link = page.getByRole('link', { name: 'Proposals' });
  29 |   await expect(link).not.toHaveCSS('font-weight', '600');
  30 | });
  31 | 
```