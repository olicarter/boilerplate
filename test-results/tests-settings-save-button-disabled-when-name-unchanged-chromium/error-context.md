# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/settings.spec.ts >> save button disabled when name unchanged
- Location: e2e/tests/settings.spec.ts:17:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('button', { name: 'Save' })
Expected: disabled
Error: strict mode violation: getByRole('button', { name: 'Save' }) resolved to 2 elements:
    1) <button disabled type="submit" class="_button_kvwgt_1 _primary_kvwgt_34 _sm_kvwgt_29">Save</button> aka getByRole('button', { name: 'Save', exact: true })
    2) <button disabled type="submit" data-testid="save-bio-btn" class="_button_kvwgt_1 _primary_kvwgt_34 _sm_kvwgt_29">Save bio</button> aka getByTestId('save-bio-btn')

Call log:
  - Expect "toBeDisabled" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Save' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]: Ripple
    - navigation [ref=e6]:
      - link "Organisations" [ref=e7] [cursor=pointer]:
        - /url: /
      - link "Settings" [ref=e8] [cursor=pointer]:
        - /url: /settings
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Alice
        - button "Notifications" [ref=e13] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e14] [cursor=pointer]
  - main [ref=e15]:
    - generic [ref=e16]:
      - heading "Settings" [level=2] [ref=e17]
      - generic [ref=e18]:
        - heading "Display name" [level=3] [ref=e19]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Name
            - textbox "Name" [ref=e23]: Alice
          - button "Save" [disabled] [ref=e24]
        - paragraph [ref=e25]: alice@test.ripple
        - generic [ref=e26]:
          - generic [ref=e27]: Bio (optional)
          - textbox "Bio (optional)" [ref=e28]:
            - /placeholder: Tell other members a bit about yourself…
          - generic [ref=e29]:
            - generic [ref=e30]: 0/300
            - button "Save bio" [disabled] [ref=e31]
      - generic [ref=e32]:
        - heading "Notification preferences" [level=3] [ref=e34]
        - generic [ref=e35]:
          - generic [ref=e36] [cursor=pointer]:
            - checkbox "A new proposal is opened" [checked] [ref=e37]
            - generic [ref=e38]: A new proposal is opened
          - generic [ref=e39] [cursor=pointer]:
            - checkbox "A proposal closes" [checked] [ref=e40]
            - generic [ref=e41]: A proposal closes
          - generic [ref=e42] [cursor=pointer]:
            - checkbox "Your delegate casts a vote" [checked] [ref=e43]
            - generic [ref=e44]: Your delegate casts a vote
          - generic [ref=e45] [cursor=pointer]:
            - checkbox "A new member joins" [checked] [ref=e46]
            - generic [ref=e47]: A new member joins
          - generic [ref=e48] [cursor=pointer]:
            - checkbox "Someone mentions you in a comment" [checked] [ref=e49]
            - generic [ref=e50]: Someone mentions you in a comment
          - generic [ref=e51] [cursor=pointer]:
            - checkbox "Someone comments on a proposal you voted on" [checked] [ref=e52]
            - generic [ref=e53]: Someone comments on a proposal you voted on
          - generic [ref=e54] [cursor=pointer]:
            - checkbox "Someone delegates to you" [checked] [ref=e55]
            - generic [ref=e56]: Someone delegates to you
          - generic [ref=e57] [cursor=pointer]:
            - checkbox "Someone removes their delegation from you" [checked] [ref=e58]
            - generic [ref=e59]: Someone removes their delegation from you
          - generic [ref=e60] [cursor=pointer]:
            - checkbox "A moderator sends a vote reminder" [checked] [ref=e61]
            - generic [ref=e62]: A moderator sends a vote reminder
      - generic [ref=e63]:
        - generic [ref=e64]:
          - heading "Passkeys" [level=3] [ref=e65]
          - button "+ Add passkey" [ref=e66] [cursor=pointer]
        - paragraph [ref=e67]: No passkeys found.
```

# Test source

```ts
  1  | import { test, expect, API, ORG_SLUG } from '../fixtures';
  2  | 
  3  | test('settings page loads and shows current name', async ({ page, asAlice }) => {
  4  |   await page.goto('/settings');
  5  |   await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  6  |   await expect(page.getByLabel('Name')).toHaveValue('Alice');
  7  |   await expect(page.getByText('alice@test.ripple')).toBeVisible();
  8  | });
  9  | 
  10 | test('can update display name', async ({ page, asAlice }) => {
  11 |   await page.goto('/settings');
  12 |   await page.getByLabel('Name').fill('Alice Updated');
  13 |   await page.getByRole('button', { name: 'Save' }).click();
  14 |   await expect(page.getByText('Name updated')).toBeVisible();
  15 | });
  16 | 
  17 | test('save button disabled when name unchanged', async ({ page, asAlice }) => {
  18 |   await page.goto('/settings');
> 19 |   await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
     |                                                            ^ Error: expect(locator).toBeDisabled() failed
  20 | });
  21 | 
  22 | test('settings page shows passkeys section', async ({ page, asAlice }) => {
  23 |   await page.goto('/settings');
  24 |   await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  25 |   await expect(page.getByRole('button', { name: '+ Add passkey' })).toBeVisible();
  26 | });
  27 | 
  28 | test('passkey list loads (test user has no real passkeys)', async ({ page, asAlice }) => {
  29 |   await page.goto('/settings');
  30 |   // test-setup users have no credentials, so the list will be empty
  31 |   await expect(page.getByText('No passkeys found.')).toBeVisible();
  32 | });
  33 | 
  34 | test('settings nav link is visible when signed in', async ({ page, asAlice }) => {
  35 |   await page.goto('/orgs/ripple-test/proposals');
  36 |   await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  37 | });
  38 | 
  39 | test('cannot delete last passkey via API', async ({ page, asAlice }) => {
  40 |   // test-setup users have no credentials, but we can verify the API rejects
  41 |   // deleting a non-existent/last key by attempting with a fake id
  42 |   const res = await page.request.delete(`${API}/api/auth/passkeys/nonexistent-id`);
  43 |   // 404 (not found) or 400 (last key) — either is a refusal
  44 |   expect(res.status()).toBeGreaterThanOrEqual(400);
  45 | });
  46 | 
  47 | test('profile page links to account settings', async ({ page, asAlice }) => {
  48 |   await page.goto(`/orgs/${ORG_SLUG}/users/${asAlice.id}`);
  49 |   await expect(page.getByRole('link', { name: 'Account settings →' })).toBeVisible();
  50 | });
  51 | 
```