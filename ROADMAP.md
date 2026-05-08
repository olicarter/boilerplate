# Ripple Roadmap

Liquid democracy for any organisation. The goal is a platform that a community group, a cooperative, a DAO, a company, or a political movement can pick up and use without needing lawyers, complex governance tooling, or technical expertise.

Current state: users can register with passkeys, create proposals under topics, vote yes/no/abstain, and delegate their vote globally or per-topic. The tally respects delegation chains.

---

## Phase 1 — Usable Core

> The minimum needed before a real organisation can run a real vote without it feeling like a prototype.

### Proposal lifecycle
- [x] **Voting deadlines** — proposals have an optional `closes_at` timestamp; the UI shows a countdown and the API auto-closes the proposal when the deadline passes (cron or on-read check). Voters must cast before the deadline.
- [x] **Proposal status: draft** — authors can save a proposal as a draft before publishing it. Drafts are only visible to the author. Adds a `draft` value to the `status` enum.
- [x] **Proposal withdrawal** — the author (or an admin) can withdraw an open proposal, setting status to `withdrawn`. Withdrawn proposals are shown in the list but marked as inactive.
- [x] **Close/reopen proposals** — admins can manually close any open proposal and reopen any closed one. The API enforces that only admins or the author can do this.
- [x] **Proposal author** — store `author_id` on proposals; show the author's name on the proposal card and detail page with a link to their profile.
- [x] **Passing threshold** — proposals have a configurable `threshold` (default 50%); the result card on the detail page shows whether the proposal passed, failed, or is still open.

### Voting
- [x] **Vote lock on close** — once a proposal closes, the vote buttons disappear and a clear "voting closed" message is shown. API also enforces no new votes on closed proposals.
- [x] **Delegation override** — on the proposal detail page, if your vote is currently cast by your delegate, show a banner "Your delegate Bob voted yes on your behalf" with a button to cast your own vote directly, which overrides the delegation for that proposal.
- [x] **Abstain excluded from tally percentage** — the pass/fail calculation only counts yes+no in the denominator (abstentions are neutral); abstentions shown separately.

### Delegation
- [x] **Transitive delegation server-side** — chain resolution is in the API; `/proposals/:id/tally` returns pre-resolved counts.
- [x] **Circular delegation detection** — when creating a delegation, the API checks whether it would create a cycle (A→B→C→A) and rejects it with a clear error.
- [x] **Delegation chain depth limit** — chains capped at depth 10.
- [x] **Delegation expiry** — optional `expires_at` on delegations; expired delegations are ignored in tally resolution. Show expiry date in the delegation list.

### Auth & identity
- [ ] **Email magic-link fallback** — not every device supports passkeys. Add an email-based sign-in flow (send a one-time link) as a fallback. The user can then add a passkey from their profile settings.
- [ ] **Display name / avatar** — display name change is in Settings; avatar upload (profile photo as URL or base64 thumbnail) is not yet implemented.
- [x] **Account settings page** — `/settings` page for changing display name and managing registered passkeys (list, add, remove).

### UI / UX
- [x] **Responsive layout** — hamburger menu with slide-in overlay sidebar for screens under 768px.
- [x] **Empty state illustrations** — `EmptyState` component with SVG illustrations used on proposals, delegations, comments, and votes.
- [x] **Confirmation dialogs** — `ConfirmButton` component used for delegation removal, proposal close/withdraw.
- [x] **Toast notifications** — `Toast` / `useToast` used throughout for create, update, delete, and error feedback.
- [x] **Loading skeletons** — skeleton placeholders on the proposals list while Electric sync initialises.
- [x] **Markdown in proposal descriptions** — `MarkdownContent` component renders markdown with DOMPurify sanitisation.
- [x] **Character/word limits** — title max 200, description max 10 000, comment max 5 000; enforced server-side and in the UI with a remaining-characters counter that appears near the limit.

---

## Phase 2 — Organisations

> Everything needed to support multiple distinct groups each running their own governance, isolated from each other.

### Multi-tenancy
- [x] **Organisation model** — new `organisations` table with `id`, `name`, `slug` (URL-safe), `description`, `logo_url`, `created_at`. All other entities (`topics`, `proposals`, `votes`, `delegations`) gain an `organisation_id` foreign key.
- [x] **Organisation subdomains / slugs** — routes become `/orgs/:slug/proposals` etc. A single Ripple instance can host many orgs. The active org is resolved from the URL slug and stored in React context.
- [x] **Organisation creation flow** — any authenticated user can create an organisation and becomes its first admin. Setup wizard: name → slug → invite members → done.
- [x] **Organisation home page** — landing page at `/orgs/:slug` showing name, description, recent activity (latest proposals, vote counts), member count.
- [x] **Electric sync scoping** — Electric shape subscriptions are filtered by `organisation_id` so members only sync data for their org.

### Membership
- [x] **Membership model** — `memberships` table: `id`, `organisation_id`, `user_id`, `role` (admin | moderator | member | observer), `joined_at`, `invited_by`.
- [ ] **Invite by email** — admins can invite people by email; a signed token is emailed with a link to join. Pending invites are listed in org settings.
- [x] **Invite link** — generate a shareable invite link with a token; anyone with the link can join (can be disabled or made single-use).
- [ ] **Email domain restriction** — optional: restrict membership to users whose email matches one or more domains (e.g. `@acme.com`).
- [ ] **Member approval** — optional: new members must be approved by an admin before they can vote. Shows a pending queue in org settings.
- [x] **Member directory** — `/orgs/:slug/members` page listing all members with their role, join date, and a link to their profile. Sortable by name / join date / participation.
- [x] **Leave organisation** — members can leave; the final admin cannot leave until they transfer ownership.
- [x] **Remove member** — admins can remove a member, which also removes their delegations (incoming and outgoing) within the org.

### Roles & permissions
- [x] **Role-based proposal creation** — org setting: who can create proposals? Options: any member / moderator and above / admin only.
- [x] **Role-based topic creation** — similar setting for who can create topics.
- [x] **Moderator tools** — moderators can edit/close any proposal, delete comments, and manage topics. Cannot manage membership or org settings.
- [x] **Admin panel** — `/orgs/:slug/admin` dashboard: org info editing, proposal creation role setting, danger zone (delete org). Visible to admins only.
- [x] **Ownership transfer** — the org owner can transfer ownership to another admin.

### Organisation settings
- [x] **Default voting duration** — org-level setting for the default `closes_at` offset when creating a proposal (e.g. 7 days). Authors can override per-proposal.
- [x] **Default passing threshold** — org-level default (e.g. 50%). Can be overridden per-proposal.
- [x] **Default quorum** — minimum percentage of eligible voters (or weight) that must participate for a result to be binding. Can be overridden per-proposal.
- [x] **Voting visibility** — org setting: are live vote counts visible during the voting period, or hidden until close? Hidden-until-close prevents bandwagon effects.
- [x] **Public organisation** — toggle: anyone can discover and join without an invite token; org appears in the discover section on the home page.

---

## Phase 3 — Richer Democracy

> More nuanced voting mechanics and delegation features for organisations with complex needs.

### Proposal types & voting modes
- [ ] **Multiple choice proposals** — instead of yes/no/abstain, a proposal can have N custom options (e.g. "Option A / Option B / Option C / None of the above"). Votes are stored with an `option_id` foreign key.
- [ ] **Ranked choice / instant runoff** — voters rank options in order of preference; the API computes the IRV winner across rounds. Show each elimination round in the results.
- [ ] **Approval voting** — voters select all options they find acceptable; the option with the most approvals wins. Simple and strategy-proof for multi-option decisions.
- [ ] **Score voting (range voting)** — voters rate each option 0–5; highest mean score wins. Good for prioritisation and resource allocation decisions.
- [ ] **Consent-based (sociocracy)** — instead of majority yes, the question is "does anyone have a paramount objection?" A single "block" vote triggers mandatory discussion. Good for cooperatives and consensus-oriented groups.
- [ ] **Temperature check** — lightweight, non-binding straw poll attached to a proposal in draft stage. Helps authors gauge support before formally opening a vote.

### Quorum & thresholds
- [x] **Hard quorum** — if participation (direct votes + delegated weight) does not reach the quorum threshold by deadline, the proposal fails automatically regardless of the yes/no split.
- [x] **Soft quorum** — proposal result is advisory only if quorum isn't met; clearly labelled as "not binding".
- [ ] **Dynamic quorum** — quorum requirement scales with the proposal's estimated impact level (low / medium / high / constitutional), set by the author or a moderator.
- [x] **Supermajority threshold** — set a threshold above 50% (e.g. 66%, 75%) for high-impact decisions like constitutional changes or large expenditures.
- [x] **Veto rights** — certain roles (e.g. a board member or founder) can cast a veto vote that blocks a proposal regardless of the vote count. Vetoes must include a written reason. Veto role is configurable per org (admin-only by default, can be lowered to moderator).

### Weighted voting
- [ ] **Share-based weight** — admins can assign a numeric `weight` to each member (e.g. representing equity shares, stake, or seniority). Votes and delegations carry this weight. The tally shows weighted counts alongside raw counts.
- [ ] **Equal weight per seat** — alternative: weight by role (e.g. admin = 2, member = 1, observer = 0). Simple way to give a board a stronger voice.
- [ ] **Weight display** — show each voter's weight on their profile (within the org) and in the delegation chain visualisation.

### Advanced delegation
- [ ] **Transitive delegation UI** — visualise the delegation chain: "Your vote flows Alice → Bob → Carol who voted yes". Show the full chain on the proposal detail page for your own vote.
- [ ] **Delegation network graph** — org-level page showing the delegation graph as an interactive force-directed diagram (D3.js or similar). Members can see who trusts whom.
- [ ] **Delegation weight display** — show how many votes each member is currently carrying across the org (their own + all delegated to them).
- [ ] **Conditional delegation** — delegate to X, but only if X hasn't voted within 48 hours of the deadline; otherwise your vote defaults to abstain. Encourages responsive delegates.
- [ ] **Split delegation** — delegate different percentages of your voting weight to multiple delegates per topic. E.g. 60% to Alice, 40% to Bob on Environment.
- [ ] **Delegation suggestions** — when a user hasn't voted and has no delegation set, suggest members with high participation rates in that topic as potential delegates.

### Proposal endorsements
- [ ] **Endorsement / co-sponsorship** — a proposal in draft requires N endorsements from other members before it can be formally opened. Prevents spam and low-quality proposals. Config: minimum endorsements required.
- [ ] **Signatures / petition mode** — a proposal can be opened in "petition" mode, collecting expressions of support before a formal vote. Once a signature threshold is met, it automatically transitions to voting.

### Amendments
- [ ] **Amendment proposals** — a member can propose an amendment to an open proposal. If the amendment passes (simple majority), the parent proposal description is updated and the vote resets. Creates a clear history.
- [x] **Proposal versions** — every edit to a proposal title/description creates a version in `proposal_versions`; users can see the edit history on the proposal detail page.
- [ ] **Proposal linking** — proposals can be linked as: supersedes / related to / blocks / depends on. Displayed as a relationship section on the detail page.

---

## Phase 4 — Discussion & Deliberation

> Good decisions need good deliberation. This phase adds the structured conversation layer that sits between "proposal created" and "vote cast".

### Comments
- [x] **Proposal comments** — comments on proposals with `comments` table (id, proposal_id, author_id, body, created_at, edited_at). Hard-delete.
- [x] **Rich text comments** — Markdown rendering with DOMPurify sanitisation.
- [x] **Comment reactions** — emoji reactions (👍 👎 ❤️ 🤔) on comments via `comment_reactions` table; toggle behaviour.
- [x] **Edit / delete own comments** — authors can edit or delete their own comments; "edited" label shown.
- [x] **Moderator comment management** — moderators can hide (soft-delete) any comment with a reason. Hidden comments are replaced with a "removed by moderator" placeholder visible to admins.
- [x] **Comment pinning** — proposal authors and moderators can pin up to 2 comments (e.g. "Key context" or "Author's response") to the top.
- [x] **For / Against arguments** — structured argument section separate from general comments: members can post a "For" or "Against" argument, each displayed in its own column. Encourages considered deliberation over reactive commenting.

### Deliberation periods
- [x] **Deliberation window** — a proposal can have a `deliberation_ends_at` before `closes_at`. Voting is disabled during this window; only discussion is permitted. Visual timeline on the proposal page: Deliberation → Voting → Closed.
- [ ] **Discussion-only proposals** — a proposal type with no formal vote. Used for announcements or open-ended discussions that may lead to future formal proposals.

### Mentions & notifications (within discussions)
- [ ] **@mention autocomplete** — typing `@` in a comment box triggers an autocomplete of org members. Mentions create a notification for the mentioned user.
- [ ] **Quote reply** — select text in a comment and click "reply" to quote it in a new comment.

---

## Phase 5 — Notifications & Communication

> People won't participate if they don't know something needs their attention.

### In-app notifications
- [ ] **Notification centre** — bell icon in the nav showing unread count. Dropdown or `/notifications` page listing all notifications with mark-as-read and mark-all-read.
- [ ] **Notification types**: new proposal in your org, proposal deadline approaching (24h warning), vote result published, comment on a proposal you voted on, @mention in a comment, your delegate voted on your behalf, new member joined (admins only), delegation added/removed.
- [ ] **Notification preferences** — per-user, per-org settings for which events trigger in-app vs. email notifications. Granular: "only for proposals I'm watching" / "all proposals" / "off".

### Email notifications
- [ ] **Transactional emails** — integrate a mail provider (Resend or Postmark). Templates for: welcome, invite, magic-link, proposal opened, deadline reminder, result announced.
- [ ] **Digest emails** — weekly or daily digest summarising open proposals, upcoming deadlines, and recent results. Users opt in/out per org.
- [ ] **Proposal watching** — users can "watch" a proposal to receive notifications even if they haven't voted. Watch is auto-set when you comment or vote.
- [ ] **Unsubscribe handling** — one-click unsubscribe in every email, per the CAN-SPAM/GDPR requirements.

### External integrations
- [ ] **Slack integration** — connect an org to a Slack workspace. Post new proposals and results to a configured channel. Optional: create a Slack command `/ripple vote [proposal]` to cast votes from Slack.
- [ ] **Discord integration** — similar to Slack: post to a channel, optionally react with emoji to vote on simple proposals.
- [ ] **Webhooks** — org admins can register HTTP webhook URLs for events (proposal.opened, proposal.closed, vote.cast, member.joined). Payload is JSON. Used to connect Ripple to Zapier, Make, or custom tooling.
- [ ] **Calendar export** — proposal voting deadlines exported as an `.ics` feed (or Google Calendar link) so members see deadlines in their calendar.

---

## Phase 6 — Analytics & Transparency

> Trust in a governance system comes from being able to verify what happened and why.

### Participation analytics
- [ ] **Org dashboard** — graphs showing: proposals over time, participation rate per proposal, average turnout, most active topics. Filterable by date range.
- [x] **Member engagement score** — per-member score based on: proposals voted on / total open proposals × 100. Shown on member directory and their profile. Not competitive, just for self-awareness.
- [x] **Proposal outcome tracking** — tag closed proposals with whether the resulting decision was implemented. Lets the org track follow-through on their own decisions.
- [ ] **Topic-level stats** — for each topic: number of proposals, average participation, pass rate, most active members.

### Audit & transparency
- [x] **Audit log** — immutable append-only log of all significant actions: proposal created/edited/closed/withdrawn, vote cast/changed, delegation added/removed, member invited/removed, role changed, org setting changed. Stored in `audit_log` (id, org_id, actor_id, action, target_type, target_id, metadata jsonb, created_at).
- [x] **Public results page** — for public organisations, a read-only page at `/orgs/:slug/results` showing all closed proposals and their outcomes. No login required. Good for community groups publishing governance decisions.
- [ ] **Vote receipt** — after voting, users can download a signed receipt (JSON + signature) proving their vote was recorded correctly. Useful for high-stakes decisions.
- [ ] **Export** — admins can export proposal results and vote tallies as CSV or PDF. Individual users can export their own voting history.

### Delegation transparency
- [ ] **Who carries my vote** — on any open proposal, show members exactly how many votes a person is currently carrying and on whose behalf, visible to all org members.
- [ ] **Delegation history** — full history of delegation changes (added, removed, expired) visible to the member on their profile.

---

## Phase 7 — Polish & Performance

> The difference between a tool people tolerate and one they enjoy.

### Design system
- [ ] **Design tokens** — replace inline `style` objects with CSS custom properties (colour, spacing, radius, shadow tokens). This is the prerequisite for all visual work below.
- [ ] **Component library** — extract Button, Badge, Card, Input, Select, Modal, Toast, Skeleton into reusable components with consistent props. Stop copy-pasting inline styles.
- [ ] **Dark mode** — use `prefers-color-scheme` media query + a manual toggle stored in `localStorage`. All tokens have dark variants.
- [ ] **Typography system** — consistent type scale (rem-based), line heights, and weight usage. Replace ad hoc `fontSize: 13` everywhere.
- [ ] **Illustration set** — a small set of consistent SVG illustrations for empty states, error pages, onboarding steps.

### Accessibility
- [ ] **WCAG 2.1 AA audit** — run axe-core against all pages, fix all critical issues: colour contrast, focus ring visibility, skip-to-content link, landmark roles.
- [ ] **Keyboard navigation** — all interactive elements reachable and operable by keyboard. Dropdown menus, modals, and the UserSearch component need special attention.
- [ ] **Screen reader labels** — all icon-only buttons have `aria-label`. Dynamic content changes (vote counts, notification badge) use `aria-live`.
- [ ] **Focus management** — when a modal opens, focus moves into it; when it closes, focus returns to the trigger.

### Performance
- [ ] **Virtualised proposal list** — use a virtual list (e.g. TanStack Virtual) for the proposals page when there are hundreds of proposals, avoiding DOM bloat.
- [ ] **Optimistic updates** — votes and delegations should feel instant. TanStack DB optimistic mutations are already partially there; audit and fix any cases where the UI waits for server confirmation before updating.
- [ ] **Image optimisation** — avatar images served via a CDN with responsive sizes. Lazy-loaded.
- [ ] **Bundle analysis** — run `vite-bundle-visualizer`, identify and eliminate large unused dependencies.

### Internationalisation
- [ ] **i18n infrastructure** — integrate `react-i18next`. Extract all UI strings into locale files. This is a large cross-cutting change — do it once and do it properly.
- [ ] **English (default) + Spanish** — ship two locales to prove the system works before adding more.
- [ ] **RTL layout support** — use logical CSS properties (`margin-inline-start` etc.) so RTL languages (Arabic, Hebrew) don't break the layout.
- [ ] **Date/number localisation** — use `Intl.DateTimeFormat` and `Intl.NumberFormat` everywhere instead of hardcoded format strings.

### Error handling
- [ ] **Global error boundary** — React error boundary at the root that catches JS errors and shows a friendly "something went wrong" page with a reload button, rather than a blank screen.
- [ ] **API error messages** — standardise API error response shape (`{ statusCode, message, code }`). Display user-readable messages in the UI instead of generic "Failed to create proposal."
- [ ] **Offline detection** — detect when the Electric sync connection drops and show a banner "You're offline — changes may not be saved" rather than silently failing.
- [ ] **Form validation** — client-side validation with clear inline error messages before any API call. Currently most forms rely on `required` HTML5 validation which is inconsistent across browsers.

---

## Phase 8 — API & Integrations

> Make Ripple the governance layer that can be wired into any existing toolchain.

### Public API
- [ ] **API keys** — admins can generate long-lived API keys scoped to an org. Keys are stored hashed. Used to authenticate server-to-server API calls.
- [ ] **REST API documentation** — generate OpenAPI 3.0 spec from the NestJS controllers (using `@nestjs/swagger`). Host interactive docs at `/api/docs`.
- [ ] **API rate limiting** — per-IP and per-key rate limiting using `@nestjs/throttler`. Return `429` with `Retry-After` header.
- [ ] **Pagination** — all list endpoints return paginated responses (`{ items, total, page, pageSize }`). Currently they return unbounded arrays.
- [ ] **Filtering & sorting** — proposals endpoint accepts query params: `status`, `topic_id`, `author_id`, `sort` (created_at, closes_at, votes). Votes endpoint accepts `proposal_id`, `user_id`.

### Embeds
- [ ] **Embeddable vote widget** — a tiny `<iframe>` embed (or Web Component) that shows a proposal's current tally and lets a logged-in user cast a vote. Designed to be dropped into Notion, Confluence, or a company intranet.
- [ ] **OG / social preview images** — dynamically generated Open Graph images for proposals (title, tally bars, deadline) so links shared on Slack/Twitter look informative.

### Import / export
- [ ] **Bulk import proposals** — admins can import proposals from a CSV or JSON file. Useful when migrating from another tool or seeding a new org.
- [ ] **Export org data** — full export of org data as JSON (proposals, votes, delegations, members). For data portability and backups.
- [ ] **Snapshot voting compatibility** — export proposals and results in Snapshot.org-compatible JSON format. Lets DAOs move decisions between Ripple and Snapshot.

---

## Phase 9 — Advanced Governance Primitives

> Experimental features for power users and cutting-edge governance researchers.

### Conviction voting
- [ ] **Conviction accumulation** — instead of a binary open/close window, votes accumulate "conviction" over time. The longer a vote is held without changing, the more weight it carries. A proposal passes when total conviction crosses a threshold. Ideal for resource allocation in DAOs.
- [ ] **Conviction decay** — if a member changes their vote repeatedly, conviction resets. Rewards commitment.

### Futarchy
- [ ] **Prediction market integration** — attach a yes/no prediction market to a proposal. Members bet on whether the proposal will have a positive outcome. The market result is shown alongside the vote tally as a signal. (Integrates with a market provider API rather than implementing from scratch.)

### Sortition (democratic lottery)
- [ ] **Random jury selection** — for a given proposal, randomly select N members (optionally weighted by delegation weight) as a "jury" who must participate. Non-jury members can still vote but jury participation is expected. Good for reducing voter fatigue on low-salience decisions.
- [ ] **Jury quorum** — quorum is met when all N jury members have voted, regardless of total turnout.

### Holographic consensus
- [ ] **Proposal queue with boosting** — a limited number of proposals can be in "active" voting at once. Members stake tokens (or reputation points) to "boost" a proposal into the active queue. Boosted proposals that pass reward boosters; those that fail penalise them. Based on DAOstack's model.

### Quadratic voting
- [ ] **Credit allocation** — each member gets a budget of credits per voting period. Casting K votes on a proposal costs K² credits. Encourages expressing preference intensity, not just direction. Schema needs a `credits_balance` per member per period.
- [ ] **Credit decay** — unspent credits expire at the end of the period, preventing hoarding.

### Constitutional proposals
- [ ] **Protected topics** — some topics (e.g. "Constitution", "Membership rules") are marked as constitutional. Proposals in these topics require supermajority + extended deliberation period + admin co-sponsorship.
- [ ] **Immutable audit trail for constitutional changes** — constitutional proposal outcomes are cryptographically signed and stored append-only. Cannot be deleted even by admins.

---

## Phase 10 — Enterprise & Scale

> For larger organisations with stricter requirements.

### Single sign-on
- [ ] **SAML 2.0 / OIDC** — allow enterprise customers to connect their Identity Provider (Okta, Azure AD, Google Workspace). Users sign in via SSO and are automatically provisioned to the correct org.
- [ ] **SCIM provisioning** — automatically sync membership from the IdP: when an employee is offboarded from Okta, they're removed from Ripple.
- [ ] **Enforce SSO** — org setting to require SSO (disable passkey/magic-link login for that org's members).

### Compliance
- [ ] **GDPR data export** — one-click export of all personal data for a user (profile, votes, delegations, comments, audit log entries). Returns a JSON archive.
- [ ] **Right to erasure** — anonymise a deleted user's data: replace their name/email with "Deleted User" in all records, keeping the structural data (votes, comments) intact for audit purposes.
- [ ] **Data retention policies** — org setting: auto-delete closed proposals and associated votes after N months.
- [ ] **SOC 2 audit log** — structured, tamper-evident audit log exportable to a SIEM (Splunk, Datadog). Includes IP addresses, user agents, and action context.

### Scalability
- [ ] **Horizontal API scaling** — move in-memory challenge store (WebAuthn) to Redis. Move session store to Redis. Both are needed before running more than one API instance.
- [ ] **Background job queue** — use BullMQ (backed by Redis) for: sending emails, auto-closing expired proposals, computing complex tallies, sending webhooks. Currently these happen synchronously or not at all.
- [ ] **Database connection pooling** — add PgBouncer in front of Postgres. Required at scale.
- [ ] **Read replicas** — point Electric SQL at a read replica so the sync load doesn't compete with write throughput on the primary.

### White-label
- [ ] **Custom domains** — organisations can map their own domain (e.g. `vote.acme.com`) to their Ripple org, with automatic TLS via Let's Encrypt.
- [ ] **Custom branding** — org-level: primary colour, logo, font choice. Applied via CSS custom properties so all components pick it up.
- [ ] **Email white-labelling** — emails sent from the org's own domain using a verified sending address.

---

## Ongoing / Cross-cutting

These items apply across all phases and should be maintained continuously.

- [ ] **Test coverage** — maintain Playwright e2e tests for every new user-facing feature. Target: no feature ships without at least a happy-path e2e test.
- [ ] **Migration discipline** — every DB schema change ships with a TypeORM migration. No exceptions.
- [ ] **Changelog** — maintain a `CHANGELOG.md` updated with every release. Use conventional commit format.
- [ ] **Dependency updates** — monthly Dependabot PR reviews. Keep `@simplewebauthn`, ElectricSQL, and TanStack packages current — they move fast.
- [ ] **Security headers** — add `helmet` to the NestJS app for CSP, HSTS, X-Frame-Options etc. Review and tighten the CSP allowlist regularly.
- [ ] **Load testing** — before any public launch, run k6 load tests against the API simulating concurrent voting on a high-traffic proposal.
