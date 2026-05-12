# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/delegations.spec.ts >> shows error on duplicate scope
- Location: e2e/tests/delegations.spec.ts:51:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('You already have a global delegation.')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('You already have a global delegation.')

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
          - /url: /orgs/ripple-test/users/2ca57c13-2379-47fc-9dc4-1e96ffcd22d3
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
        - generic [ref=e27]:
          - generic [ref=e28]:
            - generic [ref=e29]: Bob
            - generic [ref=e30]: bob@test.ripple
            - generic [ref=e31]: Global
          - button "Remove" [ref=e32] [cursor=pointer]
      - generic [ref=e33]:
        - heading "Add delegation" [level=3] [ref=e34]
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Delegate to
            - generic [ref=e38]:
              - generic [ref=e39]: Bobbob@test.ripple
              - button "✕" [ref=e40] [cursor=pointer]
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e43]: Scope
              - combobox "Scope" [ref=e44]:
                - option "Global (all topics)" [selected]
            - generic [ref=e45]:
              - generic [ref=e46]: Expires (optional)
              - textbox "Expires (optional)" [ref=e47]
            - generic [ref=e48]:
              - generic [ref=e49]: Weight %
              - spinbutton "Weight %" [ref=e50]: "100"
          - generic [ref=e51]:
            - generic [ref=e52]: Conditional (optional — void if delegate hasn't voted within N hours of deadline)
            - generic [ref=e53]:
              - spinbutton "Conditional (optional — void if delegate hasn't voted within N hours of deadline)" [ref=e54]
              - generic [ref=e55]: hours before deadline
          - paragraph [ref=e56]: You already have a delegation to this person for that scope.
          - button "Add delegation" [active] [ref=e57] [cursor=pointer]
      - generic [ref=e58]:
        - heading "Delegated to you" [level=3] [ref=e59]
        - generic [ref=e60]:
          - img [ref=e62]
          - paragraph [ref=e67]: Nobody has delegated to you yet
```

# Test source

```ts
  1   | import { test, expect } from '../fixtures';
  2   | import { createTopic, createDelegation } from '../helpers';
  3   | 
  4   | test('shows sign-in panel when logged out', async ({ page }) => {
  5   |   await page.goto('/orgs/ripple-test/delegations');
  6   |   await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  7   | });
  8   | 
  9   | test('shows empty outgoing delegations state', async ({ page, asAlice }) => {
  10  |   await page.goto('/orgs/ripple-test/delegations');
  11  |   await expect(page.getByText('No delegations set')).toBeVisible();
  12  | });
  13  | 
  14  | test('shows empty incoming delegations state', async ({ page, asAlice }) => {
  15  |   await page.goto('/orgs/ripple-test/delegations');
  16  |   await expect(page.getByText('Nobody has delegated to you yet')).toBeVisible();
  17  | });
  18  | 
  19  | test('can add a global delegation', async ({ page, asAlice, bob }) => {
  20  |   await page.goto('/orgs/ripple-test/delegations');
  21  | 
  22  |   await page.getByPlaceholder('Search by name or email…').fill('Bob');
  23  |   await page.getByText('Bob', { exact: true }).click();
  24  | 
  25  |   await page.getByRole('button', { name: 'Add delegation' }).click();
  26  | 
  27  |   await expect(page.getByText('Bob').first()).toBeVisible();
  28  |   await expect(page.getByText('Global', { exact: true })).toBeVisible();
  29  | });
  30  | 
  31  | test('can add a topic-scoped delegation', async ({ page, asAlice, bob }) => {
  32  |   const topic = await createTopic(page.request, 'Environment');
  33  | 
  34  |   await page.goto('/orgs/ripple-test/delegations');
  35  | 
  36  |   await page.getByPlaceholder('Search by name or email…').fill('Bob');
  37  |   await page.getByText('Bob', { exact: true }).click();
  38  | 
  39  |   await page.getByLabel('Scope').selectOption({ label: 'Environment' });
  40  |   await page.getByRole('button', { name: 'Add delegation' }).click();
  41  | 
  42  |   await expect(page.getByText('Bob').first()).toBeVisible();
  43  |   await expect(page.getByText('Environment').first()).toBeVisible();
  44  | });
  45  | 
  46  | test('add delegation button is disabled when no delegate selected', async ({ page, asAlice }) => {
  47  |   await page.goto('/orgs/ripple-test/delegations');
  48  |   await expect(page.getByRole('button', { name: 'Add delegation' })).toBeDisabled();
  49  | });
  50  | 
  51  | test('shows error on duplicate scope', async ({ page, asAlice, bob }) => {
  52  |   // Add first global delegation via API
  53  |   await createDelegation(page.request, asAlice.id, bob.id, null);
  54  | 
  55  |   await page.goto('/orgs/ripple-test/delegations');
  56  |   await expect(page.getByText('Global', { exact: true })).toBeVisible();
  57  | 
  58  |   // Try to add another global delegation
  59  |   await page.getByPlaceholder('Search by name or email…').fill('Bob');
  60  |   // Scope click to the search dropdown (Bob also appears in the existing delegation row)
  61  |   await page.getByPlaceholder('Search by name or email…').locator('..').getByText('Bob', { exact: true }).click();
  62  | 
  63  |   await page.getByRole('button', { name: 'Add delegation' }).click();
> 64  |   await expect(page.getByText('You already have a global delegation.')).toBeVisible();
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  65  | });
  66  | 
  67  | test('can remove a delegation', async ({ page, asAlice, bob }) => {
  68  |   await createDelegation(page.request, asAlice.id, bob.id, null);
  69  | 
  70  |   await page.goto('/orgs/ripple-test/delegations');
  71  |   await expect(page.getByText('Global', { exact: true })).toBeVisible();
  72  | 
  73  |   await page.getByRole('button', { name: 'Remove' }).click();
  74  |   await page.getByRole('button', { name: 'Yes, remove' }).click();
  75  |   await expect(page.getByText('No delegations set')).toBeVisible();
  76  | });
  77  | 
  78  | test('shows incoming delegations', async ({ page, asAlice, bob, request }) => {
  79  |   // Bob delegates to Alice — using Bob's session (standalone `request` fixture)
  80  |   await createDelegation(request, bob.id, asAlice.id, null);
  81  | 
  82  |   await page.goto('/orgs/ripple-test/delegations');
  83  |   await expect(page.getByText('Bob').first()).toBeVisible();
  84  | });
  85  | 
  86  | test('user search filters by name', async ({ page, asAlice, bob }) => {
  87  |   await page.goto('/orgs/ripple-test/delegations');
  88  | 
  89  |   await page.getByPlaceholder('Search by name or email…').fill('Bo');
  90  |   await expect(page.getByText('Bob', { exact: true })).toBeVisible();
  91  |   // Alice's email won't appear in results (she doesn't match 'Bo')
  92  |   await expect(page.getByText('alice@test.ripple')).not.toBeVisible();
  93  | });
  94  | 
  95  | test('user search filters by email', async ({ page, asAlice, bob }) => {
  96  |   await page.goto('/orgs/ripple-test/delegations');
  97  | 
  98  |   await page.getByPlaceholder('Search by name or email…').fill('bob@test');
  99  |   await expect(page.getByText('Bob', { exact: true })).toBeVisible();
  100 | });
  101 | 
  102 | test('user search excludes self', async ({ page, asAlice, bob }) => {
  103 |   await page.goto('/orgs/ripple-test/delegations');
  104 | 
  105 |   await page.getByPlaceholder('Search by name or email…').fill('alice@test');
  106 |   // Alice's email won't appear in search results since she's excluded
  107 |   await expect(page.getByText('alice@test.ripple')).not.toBeVisible();
  108 | });
  109 | 
```