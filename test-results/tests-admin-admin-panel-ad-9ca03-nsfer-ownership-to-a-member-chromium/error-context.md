# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/admin.spec.ts >> admin panel >> admin can transfer ownership to a member
- Location: e2e/tests/admin.spec.ts:107:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('select')
Expected substring: "Bob"
Error: strict mode violation: locator('select') resolved to 2 elements:
    1) <select class="_formSelect_1tdiz_64">…</select> aka locator('section').filter({ hasText: 'Transfer ownershipPromote' }).getByRole('combobox')
    2) <select class="_formSelect_1tdiz_64">…</select> aka locator('section').filter({ hasText: 'Proposal templatesTemplates' }).getByRole('combobox')

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('select')

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
          - /url: /orgs/ripple-test/users/efe98240-9285-4ea9-b1e9-4ad3f73fccb8
        - button "Notifications" [ref=e17] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - heading "Admin" [level=2] [ref=e21]
      - generic [ref=e22]:
        - heading "Organisation info" [level=3] [ref=e23]
        - generic [ref=e24]:
          - generic [ref=e25]:
            - generic [ref=e26]: Name
            - textbox "Name" [ref=e27]: Ripple Test
          - generic [ref=e28]:
            - generic [ref=e29]: Description
            - textbox "Description" [ref=e30]
          - button "Save changes" [ref=e32] [cursor=pointer]
      - generic [ref=e33]:
        - heading "Proposal defaults" [level=3] [ref=e34]
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Default voting duration (days)
            - paragraph [ref=e38]: Leave blank for no deadline by default.
            - spinbutton "Default voting duration (days)" [ref=e39]
          - generic [ref=e40]:
            - generic [ref=e41]: Default passing threshold (%)
            - spinbutton "Default passing threshold (%)" [ref=e42]: "50"
          - generic [ref=e43]:
            - generic [ref=e44]: Default quorum (% of members who must participate)
            - paragraph [ref=e45]: Leave blank for no quorum requirement by default.
            - spinbutton "Default quorum (% of members who must participate)" [ref=e46]
          - button "Save defaults" [ref=e48] [cursor=pointer]
      - generic [ref=e49]:
        - heading "Permissions" [level=3] [ref=e50]
        - generic [ref=e51]:
          - generic [ref=e52]:
            - paragraph [ref=e53]: Who can create proposals?
            - generic [ref=e54]:
              - generic [ref=e55] [cursor=pointer]:
                - radio "Any member" [checked] [ref=e56]
                - text: Any member
              - generic [ref=e57] [cursor=pointer]:
                - radio "Moderator and above" [ref=e58]
                - text: Moderator and above
              - generic [ref=e59] [cursor=pointer]:
                - radio "Admin only" [ref=e60]
                - text: Admin only
          - generic [ref=e61]:
            - paragraph [ref=e62]: Who can create topics?
            - generic [ref=e63]:
              - generic [ref=e64] [cursor=pointer]:
                - radio "Any member" [checked] [ref=e65]
                - text: Any member
              - generic [ref=e66] [cursor=pointer]:
                - radio "Moderator and above" [ref=e67]
                - text: Moderator and above
              - generic [ref=e68] [cursor=pointer]:
                - radio "Admin only" [ref=e69]
                - text: Admin only
          - generic [ref=e70]:
            - paragraph [ref=e71]: Voting visibility during open proposals
            - generic [ref=e72]:
              - generic [ref=e73] [cursor=pointer]:
                - radio "Show live vote counts" [checked] [ref=e74]
                - text: Show live vote counts
              - generic [ref=e75] [cursor=pointer]:
                - radio "Hide vote counts until proposal closes" [ref=e76]
                - text: Hide vote counts until proposal closes
          - generic [ref=e77]:
            - paragraph [ref=e78]: Endorsements required to publish a draft
            - paragraph [ref=e79]: Set to 0 to disable — authors can publish drafts immediately. Set to 1 or more to require that many other members endorse the proposal first.
            - generic [ref=e80]:
              - spinbutton [ref=e81]: "0"
              - button "Save" [ref=e82] [cursor=pointer]
          - generic [ref=e83]:
            - paragraph [ref=e84]: Who can cast a veto?
            - paragraph [ref=e85]: A veto blocks a proposal from passing regardless of vote counts.
            - generic [ref=e86]:
              - generic [ref=e87] [cursor=pointer]:
                - radio "Moderator and above" [ref=e88]
                - text: Moderator and above
              - generic [ref=e89] [cursor=pointer]:
                - radio "Admin only" [checked] [ref=e90]
                - text: Admin only
          - generic [ref=e91]:
            - paragraph [ref=e92]: Public organisation
            - paragraph [ref=e93]: Public organisations are listed on the discovery page and anyone can join without an invitation.
            - generic [ref=e94] [cursor=pointer]:
              - checkbox "Allow anyone to discover and join this organisation" [ref=e95]
              - text: Allow anyone to discover and join this organisation
          - generic [ref=e96]:
            - paragraph [ref=e97]: Require approval for new members
            - paragraph [ref=e98]: When enabled, users who join publicly will be placed in a pending queue until an admin approves them.
            - generic [ref=e99] [cursor=pointer]:
              - checkbox "Require admin approval before new members can participate" [ref=e100]
              - text: Require admin approval before new members can participate
          - generic [ref=e101]:
            - paragraph [ref=e102]: Vote weight mode
            - paragraph [ref=e103]: "Manual: admins assign a numeric weight to each member. By role: admin=3, moderator=2, member=1, observer=0."
            - generic [ref=e104]:
              - generic [ref=e105] [cursor=pointer]:
                - radio "Manual (per-member weight)" [checked] [ref=e106]
                - text: Manual (per-member weight)
              - generic [ref=e107] [cursor=pointer]:
                - radio "By role (admin=3, moderator=2, member=1, observer=0)" [ref=e108]
                - text: By role (admin=3, moderator=2, member=1, observer=0)
      - generic [ref=e109]:
        - heading "Transfer ownership" [level=3] [ref=e110]
        - paragraph [ref=e111]: Promote another member to admin and step down to member yourself.
        - generic [ref=e112]:
          - combobox [ref=e113]:
            - option "Select a member…" [selected]
            - option "Bob (member)"
          - button "Transfer ownership" [disabled] [ref=e114] [cursor=pointer]
      - generic [ref=e115]:
        - heading "Proposal templates" [level=3] [ref=e116]
        - paragraph [ref=e117]: Templates pre-fill the new proposal form. Members see a "Use template" button when templates exist.
        - generic [ref=e118]:
          - textbox "Template name" [ref=e119]
          - textbox "Description (optional)" [ref=e120]
          - generic [ref=e121]:
            - combobox [ref=e122]:
              - option "Vote" [selected]
              - option "Discussion"
              - option "Multiple choice"
            - generic [ref=e123]:
              - generic [ref=e124]: Threshold
              - spinbutton [ref=e125]: "50"
              - generic [ref=e126]: "%"
          - button "+ Add template" [disabled] [ref=e127]
      - generic [ref=e128]:
        - heading "Recent activity" [level=3] [ref=e129]
        - list [ref=e130]:
          - listitem [ref=e131]:
            - text: Bob · member.role_changed
            - generic [ref=e132]: "· {\"to\":\"member\",\"from\":\"admin\"}"
            - generic [ref=e133]: 5/12/2026, 12:26:05 AM
      - generic [ref=e134]:
        - heading "Danger zone" [level=3] [ref=e135]
        - paragraph [ref=e136]: Permanently delete this organisation and all its proposals, votes, and delegations. This cannot be undone.
        - button "Delete organisation" [ref=e137] [cursor=pointer]
```

# Test source

```ts
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
  104 |     await expect(page).toHaveURL('https://localhost:5174/');
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
> 116 |     await expect(page.locator('select')).toContainText(`${bob.name}`);
      |                                          ^ Error: expect(locator).toContainText(expected) failed
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
  205 | 
  206 |     // Close the proposal
  207 |     await page.request.post(`${API}/api/proposals/${prop.item.id}/close`);
  208 | 
  209 |     await page.goto(`https://localhost:5174/orgs/${ORG_SLUG}/proposals/${prop.item.id}`);
  210 |     // Closed proposal should always show tally
  211 |     await expect(page.getByText('Vote counts are hidden until this proposal closes')).not.toBeVisible();
  212 |     await expect(page.getByText('Results')).toBeVisible();
  213 |   });
  214 | });
  215 | 
```