# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/comment-edit.spec.ts >> edited comment shows "(edited)" label
- Location: e2e/tests/comment-edit.spec.ts:31:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.clear: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('comment-edit-textarea')

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
          - /url: /orgs/ripple-test/users/573a19a3-11ab-4849-9651-028843e09f92
        - button "Notifications" [ref=e17] [cursor=pointer]: 🔔
      - button "Sign out" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - link "← Proposals" [ref=e21] [cursor=pointer]:
        - /url: /orgs/ripple-test/proposals
      - generic [ref=e22]:
        - generic [ref=e23]: Policy
        - generic [ref=e24]: open
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e28]: Title
          - textbox "Title" [ref=e29]: Edited label test
        - generic [ref=e30]:
          - generic [ref=e32]: Description
          - textbox "Description" [ref=e33]
        - generic [ref=e34]:
          - generic [ref=e35]: Tags
          - generic [ref=e36]:
            - textbox "Add tag…" [ref=e37]
            - button "Add" [disabled] [ref=e38]
        - generic [ref=e39]:
          - button "Save changes" [ref=e40] [cursor=pointer]
          - button "Cancel" [ref=e41] [cursor=pointer]
      - paragraph [ref=e42]:
        - text: by
        - link "Alice" [ref=e43] [cursor=pointer]:
          - /url: /orgs/ripple-test/users/573a19a3-11ab-4849-9651-028843e09f92
        - text: · May 12, 2026
      - generic [ref=e44]:
        - button "👍" [ref=e45] [cursor=pointer]:
          - generic [ref=e46]: 👍
        - button "👎" [ref=e47] [cursor=pointer]:
          - generic [ref=e48]: 👎
        - button "💬" [ref=e49] [cursor=pointer]:
          - generic [ref=e50]: 💬
        - button "🎉" [ref=e51] [cursor=pointer]:
          - generic [ref=e52]: 🎉
        - button "🤔" [ref=e53] [cursor=pointer]:
          - generic [ref=e54]: 🤔
      - button "Cast veto" [ref=e56] [cursor=pointer]
      - generic [ref=e57]:
        - heading "Results" [level=3] [ref=e58]
        - generic [ref=e59]:
          - paragraph [ref=e60]: No yes/no votes yet.
          - generic [ref=e62]: 0 votes total (delegation-resolved)
      - generic [ref=e63]:
        - heading "Your vote" [level=3] [ref=e64]
        - generic [ref=e66]:
          - textbox "Add a reason (optional)" [ref=e67]
          - generic [ref=e68]:
            - button "yes" [ref=e69] [cursor=pointer]
            - button "no" [ref=e70] [cursor=pointer]
            - button "abstain" [ref=e71] [cursor=pointer]
      - generic [ref=e72]:
        - paragraph [ref=e73]: Manage
        - generic [ref=e74]:
          - link "Export CSV" [ref=e75] [cursor=pointer]:
            - /url: /api/proposals/3c9e7e7b-9b4e-428d-bcb1-53f1cf91bbad/tally/csv
          - button "Send vote reminder" [ref=e76] [cursor=pointer]
          - button "Pin to top" [ref=e77] [cursor=pointer]
          - button "Close voting" [ref=e78] [cursor=pointer]
          - button "Withdraw" [ref=e79] [cursor=pointer]
      - generic [ref=e80]:
        - heading "Arguments (0)" [level=3] [ref=e81]
        - generic [ref=e82]:
          - generic [ref=e83]:
            - paragraph [ref=e84]: For
            - paragraph [ref=e86]: No for arguments yet.
          - generic [ref=e87]:
            - paragraph [ref=e88]: Against
            - paragraph [ref=e90]: No against arguments yet.
        - generic [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93] [cursor=pointer]:
              - radio "For" [checked] [ref=e94]
              - generic [ref=e95]: For
            - generic [ref=e96] [cursor=pointer]:
              - radio "Against" [ref=e97]
              - generic [ref=e98]: Against
          - textbox "Add a for argument…" [ref=e99]
          - button "Add argument" [disabled] [ref=e101] [cursor=pointer]
      - generic [ref=e103]:
        - heading "Related" [level=3] [ref=e104]
        - button "+ Add link" [ref=e105] [cursor=pointer]
      - generic [ref=e107]:
        - heading "Amendments" [level=3] [ref=e108]
        - button "Propose amendment" [ref=e109] [cursor=pointer]
      - generic [ref=e110]:
        - heading "Discussion (1)" [level=3] [ref=e111]
        - generic [ref=e113]:
          - generic [ref=e114]: A
          - generic [ref=e115]:
            - generic [ref=e116]:
              - generic [ref=e117]: Alice
              - generic [ref=e118]: May 12, 2026
              - generic [ref=e119]:
                - button "Edit" [ref=e120] [cursor=pointer]
                - button "Pin" [ref=e121] [cursor=pointer]
                - button "Hide" [ref=e122] [cursor=pointer]
                - button "Delete" [ref=e123] [cursor=pointer]
            - paragraph [ref=e126]: First version
            - generic [ref=e127]:
              - button "Reply" [ref=e128] [cursor=pointer]
              - button "👍" [ref=e129] [cursor=pointer]
              - button "👎" [ref=e130] [cursor=pointer]
              - button "❤️" [ref=e131] [cursor=pointer]
              - button "🤔" [ref=e132] [cursor=pointer]
        - generic [ref=e133]:
          - generic [ref=e134]:
            - generic [ref=e136]: Add a comment
            - textbox "Add a comment" [ref=e138]:
              - /placeholder: Share your thoughts… Use @Name to mention members
          - button "Post comment" [disabled] [ref=e139]
```

# Test source

```ts
  1  | import { test, expect, API } from '../fixtures';
  2  | import { createTopic, createProposal, createComment } from '../helpers';
  3  | 
  4  | test('own comment shows Edit button', async ({ page, asAlice }) => {
  5  |   const topic = await createTopic(page.request, 'Policy');
  6  |   const proposal = await createProposal(page.request, topic.id, 'Editable comments');
  7  |   await createComment(page.request, proposal.id, 'My original comment');
  8  | 
  9  |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  10 |   await expect(page.getByRole('button', { name: 'Edit', exact: true }).first()).toBeVisible();
  11 | });
  12 | 
  13 | test('can edit own comment', async ({ page, asAlice }) => {
  14 |   const topic = await createTopic(page.request, 'Policy');
  15 |   const proposal = await createProposal(page.request, topic.id, 'Edit comment test');
  16 |   await createComment(page.request, proposal.id, 'Original comment text');
  17 | 
  18 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  19 |   await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  20 | 
  21 |   const textarea = page.getByTestId('comment-edit-textarea');
  22 |   await textarea.clear();
  23 |   await textarea.fill('Updated comment text');
  24 |   await page.getByRole('button', { name: 'Save', exact: true }).click();
  25 | 
  26 |   await expect(page.getByText('Comment updated')).toBeVisible();
  27 |   await expect(page.getByText('Updated comment text')).toBeVisible();
  28 |   await expect(page.getByText('Original comment text')).not.toBeVisible();
  29 | });
  30 | 
  31 | test('edited comment shows "(edited)" label', async ({ page, asAlice }) => {
  32 |   const topic = await createTopic(page.request, 'Policy');
  33 |   const proposal = await createProposal(page.request, topic.id, 'Edited label test');
  34 |   await createComment(page.request, proposal.id, 'First version');
  35 | 
  36 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  37 |   await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  38 |   const textarea = page.getByTestId('comment-edit-textarea');
> 39 |   await textarea.clear();
     |                  ^ Error: locator.clear: Test timeout of 30000ms exceeded.
  40 |   await textarea.fill('Second version');
  41 |   await page.getByRole('button', { name: 'Save', exact: true }).click();
  42 | 
  43 |   await expect(page.getByText('(edited)')).toBeVisible();
  44 | });
  45 | 
  46 | test('cancel edit restores original comment', async ({ page, asAlice }) => {
  47 |   const topic = await createTopic(page.request, 'Policy');
  48 |   const proposal = await createProposal(page.request, topic.id, 'Cancel edit test');
  49 |   await createComment(page.request, proposal.id, 'Keep this comment');
  50 | 
  51 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  52 |   await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  53 |   const textarea = page.getByTestId('comment-edit-textarea');
  54 |   await textarea.clear();
  55 |   await textarea.fill('Discarded change');
  56 |   await page.getByRole('button', { name: 'Cancel', exact: true }).last().click();
  57 | 
  58 |   await expect(page.getByText('Keep this comment')).toBeVisible();
  59 |   await expect(page.getByText('Discarded change')).not.toBeVisible();
  60 | });
  61 | 
  62 | test('API rejects editing another user comment', async ({ page, asAlice, bob, request }) => {
  63 |   const topic = await createTopic(page.request, 'Policy');
  64 |   const proposal = await createProposal(page.request, topic.id, 'Ownership test');
  65 |   // Bob posts a comment
  66 |   const comment = await createComment(request, proposal.id, "Bob's comment");
  67 | 
  68 |   // Alice tries to edit Bob's comment
  69 |   const res = await page.request.patch(`${API}/api/comments/${comment.id}`, {
  70 |     data: { body: 'Hacked body' },
  71 |   });
  72 |   expect(res.status()).toBe(403);
  73 | });
  74 | 
  75 | test('comments render markdown', async ({ page, asAlice }) => {
  76 |   const topic = await createTopic(page.request, 'Policy');
  77 |   const proposal = await createProposal(page.request, topic.id, 'Markdown comments');
  78 |   await createComment(page.request, proposal.id, '**Bold text**');
  79 | 
  80 |   await page.goto(`/orgs/ripple-test/proposals/${proposal.id}`);
  81 |   await expect(page.locator('strong').filter({ hasText: 'Bold text' })).toBeVisible();
  82 | });
  83 | 
```