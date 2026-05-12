# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/admin.spec.ts >> admin panel >> admin can delete the organisation
- Location: e2e/tests/admin.spec.ts:100:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "https://localhost:5174/"
Received: "https://localhost:5174/orgs/ripple-test"
Timeout:  15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    - unexpected value "https://localhost:5174/orgs/ripple-test/admin"
    18 × unexpected value "https://localhost:5174/orgs/ripple-test"

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
    - paragraph [ref=e16]: Organisation "ripple-test" not found.
```

# Test source

```ts
  4   | 
  5   | async function switchToBob(page: any, bob: { id: string; name: string; email: string; created_at: string }) {
  6   |   // Switch page session cookie to Bob
  7   |   await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  8   |   // Overwrite localStorage (addInitScript runs in registration order; this runs after Alice's)
  9   |   await page.addInitScript(
  10  |     ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
  11  |     { key: STORAGE_KEY, value: JSON.stringify(bob) },
  12  |   );
  13  | }
  14  | 
  15  | test.describe('admin panel', () => {
  16  |   test('admin sees Admin link in nav', async ({ page, asAlice }) => {
  17  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals`);
  18  |     await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
  19  |   });
  20  | 
  21  |   test('admin can navigate to admin page', async ({ page, asAlice }) => {
  22  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
  23  |     await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  24  |   });
  25  | 
  26  |   test('member does not see Admin link in nav', async ({ page, asAlice, bob }) => {
  27  |     // Downgrade Bob from the auto-admin test-setup to member
  28  |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  29  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  30  |     await switchToBob(page, bob);
  31  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals`);
  32  |     await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();
  33  |   });
  34  | 
  35  |   test('member sees access denied on admin page', async ({ page, asAlice, bob }) => {
  36  |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  37  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  38  |     await switchToBob(page, bob);
  39  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
  40  |     await expect(page.getByText('Access denied')).toBeVisible();
  41  |   });
  42  | 
  43  |   test('admin can update org name', async ({ page, asAlice }) => {
  44  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
  45  |     const nameInput = page.getByLabel('Name');
  46  |     await nameInput.fill('Ripple Updated');
  47  |     await page.getByRole('button', { name: 'Save changes' }).click();
  48  |     await expect(page.getByText('Organisation updated')).toBeVisible();
  49  |   });
  50  | 
  51  |   test('admin can change proposal creation role', async ({ page, asAlice }) => {
  52  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
  53  |     await page.locator('input[name="proposal_creation_role"][value="admin"]').click();
  54  |     await expect(page.getByText('Setting saved')).toBeVisible();
  55  |   });
  56  | 
  57  |   test('proposal creation button hidden for member when set to admin-only', async ({ page, asAlice, bob }) => {
  58  |     // Set org to admin-only proposal creation (as Alice)
  59  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
  60  |       data: { proposal_creation_role: 'admin' },
  61  |     });
  62  | 
  63  |     // Set up Bob as member
  64  |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  65  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  66  |     await switchToBob(page, bob);
  67  | 
  68  |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals`);
  69  |     await expect(page.getByRole('button', { name: '+ New proposal' })).not.toBeVisible();
  70  |   });
  71  | 
  72  |   test('API rejects proposal creation by member when set to admin-only', async ({ page, asAlice, bob, org }) => {
  73  |     // Create a topic while still Alice's session
  74  |     const topicRes = await page.request.post(`${API}/api/topics`, {
  75  |       data: { id: '00000000-0000-0000-0000-000000000111', organisation_id: org.id, name: 'Test Topic' },
  76  |     });
  77  |     const topicData = await topicRes.json();
  78  | 
  79  |     // Set org to admin-only
  80  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, {
  81  |       data: { proposal_creation_role: 'admin' },
  82  |     });
  83  | 
  84  |     // Switch to Bob and downgrade to member
  85  |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  86  |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  87  | 
  88  |     // Bob tries to create a proposal via page.request (Bob's session)
  89  |     const res = await page.request.post(`${API}/api/proposals`, {
  90  |       data: {
  91  |         id: '00000000-0000-0000-0000-000000000099',
  92  |         organisation_id: org.id,
  93  |         topic_id: topicData.item.id,
  94  |         title: 'Should not be allowed',
  95  |       },
  96  |     });
  97  |     expect(res.status()).toBe(403);
  98  |   });
  99  | 
  100 |   test('admin can delete the organisation', async ({ page, asAlice }) => {
  101 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
  102 |     await page.getByRole('button', { name: 'Delete organisation' }).click();
  103 |     await page.getByRole('button', { name: 'Yes, delete permanently' }).click();
> 104 |     await expect(page).toHaveURL('https://localhost:5174/');
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  105 |   });
  106 | 
  107 |   test('admin can transfer ownership to a member', async ({ page, asAlice, bob }) => {
  108 |     // Use page.request so Bob ends up in ripple-test; page session cookie becomes Bob's
  109 |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  110 |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  111 |     // Restore Alice's session cookie (test-setup returns the session for the given user)
  112 |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: asAlice.name, email: asAlice.email } });
  113 | 
  114 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/admin`);
  115 |     // Wait for Bob to appear in the transfer ownership dropdown (Electric sync)
  116 |     await expect(page.locator('select')).toContainText(`${bob.name}`);
  117 |     await page.locator('select').selectOption({ label: `${bob.name} (member)` });
  118 |     await page.getByRole('button', { name: 'Transfer ownership' }).click();
  119 |     await page.getByRole('button', { name: 'Yes, transfer' }).click();
  120 | 
  121 |     // Alice is demoted — she gets redirected away and shown a toast
  122 |     await expect(page.getByText(/Ownership transferred/)).toBeVisible();
  123 |     // Alice is now on the proposals page (redirected by the transfer handler)
  124 |     await expect(page).toHaveURL(`https://localhost:5174/orgs/${ORG_SLUG}/proposals`);
  125 |   });
  126 | 
  127 |   test('API rejects transfer ownership by a non-admin', async ({ page, asAlice, bob, org }) => {
  128 |     // Add Bob to ripple-test; page session becomes Bob's
  129 |     await page.request.post(`${API}/api/auth/test-setup`, { data: { name: bob.name, email: bob.email } });
  130 |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}/members/${bob.id}`, { data: { role: 'member' } });
  131 |     // Page session is now Bob (a member). Bob tries to transfer ownership to Alice.
  132 |     const res = await page.request.post(`${API}/api/orgs/${ORG_SLUG}/transfer-ownership`, {
  133 |       data: { to_user_id: asAlice.id },
  134 |     });
  135 |     // Bob is a member, not admin — should get 403
  136 |     expect(res.status()).toBe(403);
  137 |   });
  138 | 
  139 |   test('voting visibility: tally hidden on open proposal when set to hidden', async ({ page, asAlice, org }) => {
  140 |     // Set voting visibility to hidden
  141 |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { voting_visibility: 'hidden' } });
  142 | 
  143 |     // Create a topic and open proposal
  144 |     const topicRes = await page.request.post(`${API}/api/topics`, {
  145 |       data: { id: '00000000-0000-0000-0000-000000000201', organisation_id: org.id, name: 'Vis Topic' },
  146 |     });
  147 |     const topic = await topicRes.json();
  148 |     const propRes = await page.request.post(`${API}/api/proposals`, {
  149 |       data: {
  150 |         id: '00000000-0000-0000-0000-000000000202',
  151 |         organisation_id: org.id,
  152 |         topic_id: topic.item.id,
  153 |         title: 'Visibility test proposal',
  154 |         status: 'open',
  155 |       },
  156 |     });
  157 |     const prop = await propRes.json();
  158 | 
  159 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${prop.item.id}`);
  160 |     await expect(page.getByText('Vote counts are hidden until this proposal closes')).toBeVisible();
  161 |     // The tally text should not appear
  162 |     await expect(page.getByText(/votes total/)).not.toBeVisible();
  163 |   });
  164 | 
  165 |   test('voting visibility: tally visible on open proposal when set to public', async ({ page, asAlice, org }) => {
  166 |     // voting_visibility defaults to 'public'
  167 |     const topicRes = await page.request.post(`${API}/api/topics`, {
  168 |       data: { id: '00000000-0000-0000-0000-000000000203', organisation_id: org.id, name: 'Pub Vis Topic' },
  169 |     });
  170 |     const topic = await topicRes.json();
  171 |     const propRes = await page.request.post(`${API}/api/proposals`, {
  172 |       data: {
  173 |         id: '00000000-0000-0000-0000-000000000204',
  174 |         organisation_id: org.id,
  175 |         topic_id: topic.item.id,
  176 |         title: 'Public visibility test',
  177 |         status: 'open',
  178 |       },
  179 |     });
  180 |     const prop = await propRes.json();
  181 | 
  182 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${prop.item.id}`);
  183 |     // Should show the Results section with tally (not the hidden message)
  184 |     await expect(page.getByText('Vote counts are hidden until this proposal closes')).not.toBeVisible();
  185 |     await expect(page.getByText('Results')).toBeVisible();
  186 |   });
  187 | 
  188 |   test('voting visibility: tally visible on closed proposal even when set to hidden', async ({ page, asAlice, org }) => {
  189 |     await page.request.patch(`${API}/api/orgs/${ORG_SLUG}`, { data: { voting_visibility: 'hidden' } });
  190 | 
  191 |     const topicRes = await page.request.post(`${API}/api/topics`, {
  192 |       data: { id: '00000000-0000-0000-0000-000000000205', organisation_id: org.id, name: 'Closed Vis Topic' },
  193 |     });
  194 |     const topic = await topicRes.json();
  195 |     const propRes = await page.request.post(`${API}/api/proposals`, {
  196 |       data: {
  197 |         id: '00000000-0000-0000-0000-000000000206',
  198 |         organisation_id: org.id,
  199 |         topic_id: topic.item.id,
  200 |         title: 'Closed visibility test',
  201 |         status: 'open',
  202 |       },
  203 |     });
  204 |     const prop = await propRes.json();
```