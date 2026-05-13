# Ripple Roadmap

Liquid democracy for any organisation. The goal is a platform that a community group, a cooperative, a DAO, a company, or a political movement can pick up and use without needing lawyers, complex governance tooling, or technical expertise.

---

## Commercial Viability — Current Focus

> First paying customers: progressive companies (50–300 people) democratising internal decisions — product direction, promotions, salary reviews, budget allocation.
>
> **Pricing**: Free (1 org, 15 members) · Pro $29/mo (unlimited orgs/members + Slack + analytics + domain restriction)

| # | Item | Status |
|---|------|--------|
| 1 | Enforce blind voting (`voting_visibility`) | ✅ Done |
| 2 | Anonymous voting per proposal | ✅ Done |
| 3 | Resend email infrastructure | ✅ Done |
| 4 | Email verification at registration | ✅ Done |
| 5 | Email notifications (proposal events) | ✅ Done |
| 6 | Proposal scheduling (`opens_at`) | ✅ Done |
| 7 | Per-org email domain allowlist | ✅ Done |
| 8 | Onboarding flow for new users | ✅ Done |
| 9 | Admin participation analytics | ✅ Done |
| 10 | Stripe billing + pricing page | ✅ Done |
| 11 | Decision record UI + export | ✅ Done |
| 12 | Delegation UX redesign | ✅ Done |
| 13 | Slack OAuth integration | ✅ Done |
| 14 | Demo environment | ✅ Done |

### Environment variables needed
```
RESEND_API_KEY=          # https://resend.com
EMAIL_FROM=hello@ripple.vote
STRIPE_SECRET_KEY=       # https://dashboard.stripe.com
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
SLACK_CLIENT_ID=         # https://api.slack.com/apps
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
```

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
- [x] **Email magic-link fallback** — not every device supports passkeys. Add an email-based sign-in flow (send a one-time link) as a fallback. The user can then add a passkey from their profile settings.
- [x] **Avatar upload** — profile photo as URL or base64 thumbnail. Display name change is already in Settings.
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
- [x] **Invite by email** — admins can invite people by email; a signed token is emailed with a link to join. Pending invites are listed in org settings.
- [x] **Invite link** — generate a shareable invite link with a token; anyone with the link can join (can be disabled or made single-use).
- [x] **Email domain restriction** — optional: restrict membership to users whose email matches one or more domains (e.g. `@acme.com`).
- [x] **Member approval** — optional: new members must be approved by an admin before they can vote. Shows a pending queue in org settings.
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
- [x] **Multiple choice proposals** — instead of yes/no/abstain, a proposal can have N custom options (e.g. "Option A / Option B / Option C / None of the above"). Votes are stored with an `option_id` foreign key.
- [x] **Ranked choice / instant runoff** — voters rank options in order of preference; the API computes the IRV winner across rounds. Show each elimination round in the results.
- [x] **Approval voting** — voters select all options they find acceptable; the option with the most approvals wins. Simple and strategy-proof for multi-option decisions.
- [x] **Score voting (range voting)** — voters rate each option 0–5; highest mean score wins. Good for prioritisation and resource allocation decisions.
- [x] **Consent-based (sociocracy)** — instead of majority yes, the question is "does anyone have a paramount objection?" A single "block" vote triggers mandatory discussion. Good for cooperatives and consensus-oriented groups.
- [x] **Temperature check** — lightweight, non-binding straw poll attached to a proposal in draft stage. Helps authors gauge support before formally opening a vote.

### Quorum & thresholds
- [x] **Hard quorum** — if participation (direct votes + delegated weight) does not reach the quorum threshold by deadline, the proposal fails automatically regardless of the yes/no split.
- [x] **Soft quorum** — proposal result is advisory only if quorum isn't met; clearly labelled as "not binding".
- [x] **Dynamic quorum** — quorum requirement scales with the proposal's estimated impact level (low / medium / high / constitutional), set by the author or a moderator.
- [x] **Supermajority threshold** — set a threshold above 50% (e.g. 66%, 75%) for high-impact decisions like constitutional changes or large expenditures.
- [x] **Veto rights** — certain roles (e.g. a board member or founder) can cast a veto vote that blocks a proposal regardless of the vote count. Vetoes must include a written reason. Veto role is configurable per org (admin-only by default, can be lowered to moderator).

### Weighted voting
- [x] **Share-based weight** — admins can assign a numeric `weight` to each member (e.g. representing equity shares, stake, or seniority). Votes and delegations carry this weight. The tally shows weighted counts alongside raw counts.
- [x] **Equal weight per seat** — alternative: weight by role (e.g. admin = 2, member = 1, observer = 0). Simple way to give a board a stronger voice.
- [x] **Weight display** — show each voter's weight on their profile (within the org) and in the delegation chain visualisation.

### Advanced delegation
- [x] **Transitive delegation UI** — visualise the delegation chain: "Your vote flows Alice → Bob → Carol who voted yes". Show the full chain on the proposal detail page for your own vote.
- [x] **Delegation network graph** — org-level page showing the delegation graph as an interactive force-directed diagram (D3.js or similar). Members can see who trusts whom.
- [x] **Delegation weight display** — show how many votes each member is currently carrying across the org (their own + all delegated to them).
- [x] **Conditional delegation** — delegate to X, but only if X hasn't voted within 48 hours of the deadline; otherwise your vote defaults to abstain. Encourages responsive delegates.
- [x] **Split delegation** — delegate different percentages of your voting weight to multiple delegates per topic. E.g. 60% to Alice, 40% to Bob on Environment.
- [x] **Delegation suggestions** — when a user hasn't voted and has no delegation set, suggest members with high participation rates in that topic as potential delegates.

### Proposal endorsements
- [x] **Endorsement / co-sponsorship** — a proposal in draft requires N endorsements from other members before it can be formally opened. Prevents spam and low-quality proposals. Config: minimum endorsements required.
- [x] **Signatures / petition mode** — a proposal can be opened in "petition" mode, collecting expressions of support before a formal vote. Once a signature threshold is met, it automatically transitions to voting.

### Amendments
- [x] **Amendment proposals** — a member can propose an amendment to an open proposal. If the amendment passes (simple majority), the parent proposal description is updated and the vote resets. Creates a clear history.
- [x] **Proposal versions** — every edit to a proposal title/description creates a version in `proposal_versions`; users can see the edit history on the proposal detail page.
- [x] **Proposal linking** — proposals can be linked as: supersedes / related to / blocks / depends on. Displayed as a relationship section on the detail page.

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
- [x] **Discussion-only proposals** — a proposal type with no formal vote. Used for announcements or open-ended discussions that may lead to future formal proposals.

### Mentions & notifications (within discussions)
- [x] **@mention autocomplete** — typing `@` in a comment box triggers an autocomplete of org members. Mentions create a notification for the mentioned user.
- [x] **Quote reply** — select text in a comment and click "reply" to quote it in a new comment.

---

## Phase 5 — Notifications & Communication

> People won't participate if they don't know something needs their attention.

### In-app notifications
- [x] **Notification centre** — bell icon in the nav showing unread count. Dropdown listing all notifications with mark-as-read and mark-all-read.
- [x] **Notification types**: new proposal, proposal closed, comment posted, @mention, delegate voted, new member joined, delegation added/removed, vote reminder.
- [x] **Notification preferences** — per-user settings for which notification types are enabled. Managed from account settings.

### Email notifications
- [x] **Transactional emails** — integrate a mail provider (Resend or Postmark). Templates for: welcome, invite, magic-link, proposal opened, deadline reminder, result announced.
- [x] **Digest emails** — weekly or daily digest summarising open proposals, upcoming deadlines, and recent results. Users opt in/out per org.
- [x] **Proposal watching** — users can "watch" a proposal to receive notifications even if they haven't voted. Watch is auto-set when you comment or vote.
- [x] **Unsubscribe handling** — one-click unsubscribe in every email, per the CAN-SPAM/GDPR requirements.

### External integrations
- [x] **Slack integration** — connect an org to a Slack workspace. Post new proposals and results to a configured channel. Optional: create a Slack command `/ripple vote [proposal]` to cast votes from Slack.
- [x] **Discord integration** — similar to Slack: post to a channel, optionally react with emoji to vote on simple proposals.
- [x] **Webhooks** — org admins can register HTTP webhook URLs for events (proposal.opened, proposal.closed, vote.cast, member.joined). Payload is JSON. Used to connect Ripple to Zapier, Make, or custom tooling.
- [x] **Calendar export** — proposal voting deadlines exported as an `.ics` feed (or Google Calendar link) so members see deadlines in their calendar.

---

## Phase 6 — Analytics & Transparency

> Trust in a governance system comes from being able to verify what happened and why.

### Participation analytics
- [x] **Org dashboard** — graphs showing: proposals over time, participation rate per proposal, average turnout, most active topics. Filterable by date range.
- [x] **Member engagement score** — per-member score based on: proposals voted on / total open proposals × 100. Shown on member directory and their profile. Not competitive, just for self-awareness.
- [x] **Proposal outcome tracking** — tag closed proposals with whether the resulting decision was implemented. Lets the org track follow-through on their own decisions.
- [x] **Topic-level stats** — for each topic: number of proposals, average participation, pass rate, most active members.

### Audit & transparency
- [x] **Audit log** — immutable append-only log of all significant actions: proposal created/edited/closed/withdrawn, vote cast/changed, delegation added/removed, member invited/removed, role changed, org setting changed. Stored in `audit_log` (id, org_id, actor_id, action, target_type, target_id, metadata jsonb, created_at).
- [x] **Public results page** — for public organisations, a read-only page at `/orgs/:slug/results` showing all closed proposals and their outcomes. No login required. Good for community groups publishing governance decisions.
- [x] **Vote receipt** — after voting, users can download a signed receipt (JSON + signature) proving their vote was recorded correctly. Useful for high-stakes decisions.
- [x] **Export** — moderators can export vote tallies for any proposal as CSV (includes voter names, choices, and rationales).

### Delegation transparency
- [x] **Who carries my vote** — on any open proposal, show members exactly how many votes a person is currently carrying and on whose behalf, visible to all org members.
- [x] **Delegation history** — full history of delegation changes (added, removed, expired) visible to the member on their profile.

---

## Phase 7 — Polish & Performance

> The difference between a tool people tolerate and one they enjoy.

### Design system
- [x] **Design tokens** — replace inline `style` objects with CSS custom properties (colour, spacing, radius, shadow tokens). This is the prerequisite for all visual work below.
- [x] **Component library** — extract Button, Badge, Card, Input, Select, Modal, Toast, Skeleton into reusable components with consistent props. Stop copy-pasting inline styles.
- [x] **Dark mode** — use `prefers-color-scheme` media query + a manual toggle stored in `localStorage`. All tokens have dark variants.
- [x] **Typography system** — consistent type scale (rem-based), line heights, and weight usage. Replace ad hoc `fontSize: 13` everywhere.
- [x] **Illustration set** — a small set of consistent SVG illustrations for empty states, error pages, onboarding steps.

### Accessibility
- [x] **WCAG 2.1 AA audit** — run axe-core against all pages, fix all critical issues: colour contrast, focus ring visibility, skip-to-content link, landmark roles.
- [x] **Keyboard navigation** — all interactive elements reachable and operable by keyboard. Dropdown menus, modals, and the UserSearch component need special attention.
- [x] **Screen reader labels** — all icon-only buttons have `aria-label`. Dynamic content changes (vote counts, notification badge) use `aria-live`.
- [x] **Focus management** — when a modal opens, focus moves into it; when it closes, focus returns to the trigger.

### Performance
- [x] **Virtualised proposal list** — use a virtual list (e.g. TanStack Virtual) for the proposals page when there are hundreds of proposals, avoiding DOM bloat.
- [x] **Optimistic updates** — votes and delegations should feel instant. TanStack DB optimistic mutations are already partially there; audit and fix any cases where the UI waits for server confirmation before updating.
- [x] **Image optimisation** — avatar images served via a CDN with responsive sizes. Lazy-loaded.
- [x] **Bundle analysis** — run `vite-bundle-visualizer`, identify and eliminate large unused dependencies.

### Internationalisation
- [x] **i18n infrastructure** — integrate `react-i18next`. Extract all UI strings into locale files. This is a large cross-cutting change — do it once and do it properly.
- [x] **English (default) + Spanish** — ship two locales to prove the system works before adding more.
- [x] **RTL layout support** — use logical CSS properties (`margin-inline-start` etc.) so RTL languages (Arabic, Hebrew) don't break the layout.
- [x] **Date/number localisation** — use `Intl.DateTimeFormat` and `Intl.NumberFormat` everywhere instead of hardcoded format strings.

### Error handling
- [x] **Global error boundary** — React error boundary at the root that catches JS errors and shows a friendly "something went wrong" page with a reload button, rather than a blank screen.
- [x] **API error messages** — standardise API error response shape (`{ statusCode, message, code }`). Display user-readable messages in the UI instead of generic "Failed to create proposal."
- [x] **Offline detection** — detect when the Electric sync connection drops and show a banner "You're offline — changes may not be saved" rather than silently failing.
- [x] **Form validation** — client-side validation with clear inline error messages before any API call. Currently most forms rely on `required` HTML5 validation which is inconsistent across browsers.

---

## Phase 8 — API & Integrations

> Make Ripple the governance layer that can be wired into any existing toolchain.

### Public API
- [x] **API keys** — admins can generate long-lived API keys scoped to an org. Keys are stored hashed. Used to authenticate server-to-server API calls.
- [x] **REST API documentation** — generate OpenAPI 3.0 spec from the NestJS controllers (using `@nestjs/swagger`). Host interactive docs at `/api/docs`.
- [x] **API rate limiting** — per-IP and per-key rate limiting using `@nestjs/throttler`. Return `429` with `Retry-After` header.
- [x] **Pagination** — all list endpoints return paginated responses (`{ items, total, page, pageSize }`). Currently they return unbounded arrays.
- [x] **Filtering & sorting** — proposals endpoint accepts query params: `status`, `topic_id`, `author_id`, `sort` (created_at, closes_at, votes). Votes endpoint accepts `proposal_id`, `user_id`.

### Embeds
- [x] **Embeddable vote widget** — a tiny `<iframe>` embed (or Web Component) that shows a proposal's current tally and lets a logged-in user cast a vote. Designed to be dropped into Notion, Confluence, or a company intranet.
- [x] **OG / social preview images** — dynamically generated Open Graph images for proposals (title, tally bars, deadline) so links shared on Slack/Twitter look informative.

### Import / export
- [x] **Bulk import proposals** — admins can import proposals from a CSV or JSON file. Useful when migrating from another tool or seeding a new org.
- [x] **Export org data** — full export of org data as JSON (proposals, votes, delegations, members). For data portability and backups.
- [x] **Snapshot voting compatibility** — export proposals and results in Snapshot.org-compatible JSON format. Lets DAOs move decisions between Ripple and Snapshot.

---

## Phase 9 — Advanced Governance Primitives

> Experimental features for power users and cutting-edge governance researchers.

### Conviction voting
- [x] **Conviction accumulation** — instead of a binary open/close window, votes accumulate "conviction" over time. The longer a vote is held without changing, the more weight it carries. A proposal passes when total conviction crosses a threshold. Ideal for resource allocation in DAOs.
- [x] **Conviction decay** — if a member changes their vote repeatedly, conviction resets. Rewards commitment.

### Futarchy
- [x] **Prediction market integration** — attach a yes/no prediction market to a proposal. Members bet on whether the proposal will have a positive outcome. The market result is shown alongside the vote tally as a signal. (Integrates with a market provider API rather than implementing from scratch.)

### Sortition (democratic lottery)
- [x] **Random jury selection** — for a given proposal, randomly select N members (optionally weighted by delegation weight) as a "jury" who must participate. Non-jury members can still vote but jury participation is expected. Good for reducing voter fatigue on low-salience decisions.
- [x] **Jury quorum** — quorum is met when all N jury members have voted, regardless of total turnout.

### Holographic consensus
- [x] **Proposal queue with boosting** — a limited number of proposals can be in "active" voting at once. Members stake tokens (or reputation points) to "boost" a proposal into the active queue. Boosted proposals that pass reward boosters; those that fail penalise them. Based on DAOstack's model.

### Quadratic voting
- [x] **Credit allocation** — each member gets a budget of credits per voting period. Casting K votes on a proposal costs K² credits. Encourages expressing preference intensity, not just direction. Schema needs a `credits_balance` per member per period.
- [x] **Credit decay** — unspent credits expire at the end of the period, preventing hoarding.

### Constitutional proposals
- [x] **Protected topics** — some topics (e.g. "Constitution", "Membership rules") are marked as constitutional. Proposals in these topics require supermajority + extended deliberation period + admin co-sponsorship.
- [x] **Immutable audit trail for constitutional changes** — constitutional proposal outcomes are cryptographically signed and stored append-only. Cannot be deleted even by admins.

---

## Phase 10 — Enterprise & Scale

> For larger organisations with stricter requirements.

### Single sign-on
- [x] **SAML 2.0 / OIDC** — allow enterprise customers to connect their Identity Provider (Okta, Azure AD, Google Workspace). Users sign in via SSO and are automatically provisioned to the correct org.
- [x] **SCIM provisioning** — automatically sync membership from the IdP: when an employee is offboarded from Okta, they're removed from Ripple.
- [x] **Enforce SSO** — org setting to require SSO (disable passkey/magic-link login for that org's members).

### Compliance
- [x] **GDPR data export** — one-click export of all personal data for a user (profile, votes, delegations, comments, audit log entries). Returns a JSON archive.
- [x] **Right to erasure** — anonymise a deleted user's data: replace their name/email with "Deleted User" in all records, keeping the structural data (votes, comments) intact for audit purposes.
- [x] **Data retention policies** — org setting: auto-delete closed proposals and associated votes after N months.
- [x] **SOC 2 audit log** — structured, tamper-evident audit log exportable to a SIEM (Splunk, Datadog). Includes IP addresses, user agents, and action context.

### Scalability
- [x] **Horizontal API scaling** — move in-memory challenge store (WebAuthn) to Redis. Move session store to Redis. Both are needed before running more than one API instance.
- [x] **Background job queue** — use BullMQ (backed by Redis) for: sending emails, auto-closing expired proposals, computing complex tallies, sending webhooks. Currently these happen synchronously or not at all.
- [x] **Database connection pooling** — add PgBouncer in front of Postgres. Required at scale.
- [x] **Read replicas** — point Electric SQL at a read replica so the sync load doesn't compete with write throughput on the primary.

### White-label
- [x] **Custom domains** — organisations can map their own domain (e.g. `vote.acme.com`) to their Ripple org, with automatic TLS via Let's Encrypt.
- [x] **Custom branding** — org-level: primary colour, logo, font choice. Applied via CSS custom properties so all components pick it up.
- [x] **Email white-labelling** — emails sent from the org's own domain using a verified sending address.

---

## Phase 11 — AI / LLM Features

> Requires Anthropic API key. Items are sequenced roughly by implementation complexity and standalone value.

- [ ] **Proposal summariser** — one-click TL;DR for long proposals. Shown as a collapsible banner below the title. Uses the proposal body + any linked documents as context.
- [ ] **Plain-language rewriter** — button to rewrite a proposal in plain English, stripping legal/policy jargon. Useful for neighbourhood associations, unions, school boards where members aren't policy-literate.
- [ ] **Argument clustering** — group semantically similar for/against comments and vote rationales into themes (e.g. "Cost concerns", "Implementation risk"). Surfaces consensus and minority views at a glance.
- [ ] **Natural language proposal creation** — author describes what they want in plain text; the AI drafts a structured proposal (title, description, suggested vote type, suggested threshold). Author reviews and edits before publishing.
- [ ] **Natural language voting interface** — members can type "I want to vote yes because X" and the platform interprets intent, casts the vote, and saves the rationale. Needs careful guardrails and explicit confirmation step.
- [ ] **Translation** — auto-translate proposals and comments into the member's preferred language. Important for international orgs and multilingual communities.

### Environment variables needed
```
ANTHROPIC_API_KEY=    # https://console.anthropic.com
```

---

## Phase 12 — Organisation Profiles

> Ripple should feel right for a DAO, a co-op, a school board, and a company all without configuration burden. The approach: a short onboarding questionnaire sets sensible defaults; everything remains adjustable in admin settings.

- [ ] **Organisation type selector** — during org creation, choose from: Company, Co-operative, Community group, DAO / Web3, Non-profit, Other. Each type sets a default profile (see below).
- [ ] **Complexity tier** — a "how powerful do you need this?" slider (Simple / Standard / Advanced) shown during onboarding. Controls which features are visible in the UI by default — e.g. Simple hides delegation, quadratic voting, conviction voting, and constitutional proposals.
- [ ] **Feature visibility settings** — per-org toggles in admin to show/hide: delegation, weighted voting, quadratic voting, ranked choice, conviction voting, proposal boosting, sentiment poll, arguments section. Defaults set by org type + complexity tier.
- [ ] **Default org type profiles** — preset bundles of feature flags and vote type defaults:
  - *Company* — Standard voting, anonymous option on, delegation off, no quorum by default
  - *Co-operative* — Yes/No voting, delegation on, quorum required, consent voting available
  - *Community group* — Simple UI, plain-language defaults, email-based auth preferred
  - *DAO* — All voting types on, quadratic + conviction enabled, boosting on, on-chain export
  - *Non-profit* — Standard voting, GDPR export prominent, data retention policy prompted

---

## Implemented (not in original roadmap)

Features shipped that extend beyond the original spec:

- [x] **Pinned proposals** — moderators can pin proposals to float them to the top of the list.
- [x] **Proposal reactions** — members can react to proposals with emoji (👍 👎 💬 🎉 🤔).
- [x] **Activity feed** — org-level feed of recent events (proposals opened/closed, votes cast, comments, members joined).
- [x] **Proposal templates** — admins define reusable templates (name, description, type, threshold); authors select one when creating a new proposal to pre-fill the form.
- [x] **Vote rationale** — members can attach an optional written reason when casting a vote, displayed in a "Vote statements" section on the proposal.
- [x] **Proposal tags** — free-form labels on proposals; tag filter bar on the proposals page.
- [x] **Vote reminder** — moderators can send a notification to all members who haven't yet voted on an open proposal.
- [x] **Member bio** — users can write a short bio visible on their profile page.
- [x] **Threaded comments** — replies nest under their parent comment with a left-border indent. Discussion count includes all replies.
- [x] **Community sentiment poll** — members predict pass/fail on open proposals with a confidence score. Aggregate signal shown alongside the vote tally.

---

## Ongoing / Cross-cutting

These items apply across all phases and should be maintained continuously.

- [x] **Test coverage** — maintain Playwright e2e tests for every new user-facing feature. Target: no feature ships without at least a happy-path e2e test.
- [x] **Migration discipline** — every DB schema change ships with a TypeORM migration. No exceptions.
- [x] **Changelog** — maintain a `CHANGELOG.md` updated with every release. Use conventional commit format.
- [x] **Dependency updates** — monthly Dependabot PR reviews. Keep `@simplewebauthn`, ElectricSQL, and TanStack packages current — they move fast.
- [x] **Security headers** — add `helmet` to the NestJS app for CSP, HSTS, X-Frame-Options etc. Review and tighten the CSP allowlist regularly.
- [x] **Load testing** — before any public launch, run k6 load tests against the API simulating concurrent voting on a high-traffic proposal.
