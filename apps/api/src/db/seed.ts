import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';

import { User } from '../users/user.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { Topic } from '../topics/topic.entity';
import { Proposal } from '../proposals/proposal.entity';
import { ProposalOption } from '../proposals/proposal-option.entity';
import { ProposalReaction } from '../proposals/proposal-reaction.entity';
import { ProposalLink } from '../proposals/proposal-link.entity';
import { Delegation } from '../delegations/delegation.entity';
import { Vote } from '../votes/vote.entity';
import { Endorsement } from '../endorsements/endorsement.entity';
import { Veto } from '../vetoes/veto.entity';
import { Argument } from '../arguments/argument.entity';
import { Comment } from '../comments/comment.entity';
import { CommentReaction } from '../comments/comment-reaction.entity';
import { Notification } from '../notifications/notification.entity';
import { AuditLogEntry } from '../audit-log/audit-log.entity';
import { Credential } from '../auth/credential.entity';
import { MagicLink } from '../auth/magic-link.entity';
import { OrgInvite } from '../organisations/org-invite.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/ripple',
  entities: [
    User, Organisation, Membership, OrgInvite, Topic, Proposal, ProposalOption,
    ProposalReaction, ProposalLink, Delegation, Vote, Endorsement,
    Veto, Argument, Comment, CommentReaction, Notification, AuditLogEntry, Credential, MagicLink,
  ],
});

// ── helpers ───────────────────────────────────────────────────────────────────

function uid() { return randomUUID(); }
function ago(days: number): Date { return new Date(Date.now() - days * 86_400_000); }
function fromNow(days: number): Date { return new Date(Date.now() + days * 86_400_000); }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}
function weightedChoice(choices: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < choices.length; i++) { r -= weights[i]; if (r <= 0) return choices[i]; }
  return choices[choices.length - 1];
}

interface ProposalDef {
  title: string; desc: string; topicIdx: number;
  status: 'open' | 'closed' | 'draft' | 'withdrawn'; type: string;
  threshold?: number; impact?: string;
  createdDaysAgo: number; closesInDays?: number; closedAtDaysAgo?: number;
  authorIdx: number; tags?: string[]; pinned?: boolean;
  voteDistribution?: 'pass' | 'reject' | 'contested';
  options?: string[];
  anonymousVoting?: boolean;
}

// Seeds votes for an org's proposals. voters = approved voting members; oliVotedSet = proposal
// indices that oli has already voted on (for open proposals).
async function seedVotes(
  em: EntityManager,
  proposals: Proposal[],
  defs: ProposalDef[],
  orgId: string,
  voters: User[],
  oliUser: User | null,
  oliVotedSet: Set<number>,
  optionsMap: Map<number, ProposalOption[]>,
): Promise<Vote[]> {
  const votes: any[] = [];
  for (let i = 0; i < proposals.length; i++) {
    const def = defs[i];
    if (def.status === 'draft' || def.status === 'withdrawn') continue;
    const dist = def.voteDistribution ?? 'pass';
    let yesW = 6, noW = 2, abstainW = 1;
    if (dist === 'reject')    { yesW = 2; noW = 6; }
    if (dist === 'contested') { yesW = 4; noW = 4; abstainW = 2; }
    const options = optionsMap.get(i) ?? null;
    for (const voter of voters) {
      const isOli = oliUser && voter.id === oliUser.id;
      if (def.status === 'open') {
        if (isOli && !oliVotedSet.has(i)) continue;
        if (!isOli && Math.random() > 0.82) continue;
      }
      if (options) {
        votes.push(em.create(Vote, { id: uid(), proposal_id: proposals[i].id, organisation_id: orgId, user_id: voter.id, option_id: pick(options).id }));
      } else {
        votes.push(em.create(Vote, { id: uid(), proposal_id: proposals[i].id, organisation_id: orgId, user_id: voter.id, choice: weightedChoice(['yes', 'no', 'abstain'], [yesW, noW, abstainW]) as any }));
      }
    }
  }
  await em.save(Vote, votes);
  return votes;
}

// Creates comments from a [proposalIdx, authorIdx, body, daysAgo, pinned?] array.
async function seedComments(
  em: EntityManager,
  proposals: Proposal[],
  orgId: string,
  users: User[],
  defs: Array<[number, number, string, number, boolean?]>,
): Promise<Comment[]> {
  return em.save(Comment, defs.map(([pIdx, uIdx, body, days, pinned]) =>
    em.create(Comment, {
      id: uid(), proposal_id: proposals[pIdx].id, organisation_id: orgId,
      author_id: users[uIdx].id, body, created_at: ago(days),
      pinned_at: pinned ? ago(days - 0.25) : null,
    }),
  ));
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Greenfield Residents' Association ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const GF_USERS = [
  { name: 'Oli Carter',      email: 'me@olicarter.dev',   bio: "Chair of the residents' association. Passionate about community-led decision making." },
  { name: 'Alice Pemberton', email: 'alice@example.com',  bio: 'Council liaison and long-time resident of 18 years.' },
  { name: 'Ben Nakamura',    email: 'ben@example.com',    bio: 'Local business owner on the high street.' },
  { name: 'Clara Osei',      email: 'clara@example.com',  bio: 'Works in public health, keen on community wellbeing.' },
  { name: 'David Rossi',     email: 'david@example.com',  bio: 'Retired teacher, interested in community events and heritage.' },
  { name: 'Elena Vasquez',   email: 'elena@example.com',  bio: 'Chartered accountant and association treasurer.' },
  { name: 'Finn Andersen',   email: 'finn@example.com',   bio: 'Cycle path enthusiast and sustainable transport campaigner.' },
  { name: 'Grace Mwangi',    email: 'grace@example.com',  bio: 'Parent governor at Greenfield Primary. Advocates for families.' },
  { name: 'Hugo Larsson',    email: 'hugo@example.com',   bio: 'Lifelong resident. Sceptical but engaged.' },
  { name: 'Isla Kowalski',   email: 'isla@example.com',   bio: 'Urban gardener and community composting advocate.' },
  { name: 'James Okafor',    email: 'james@example.com',  bio: 'Works in local government planning. Useful to have around.' },
  { name: 'Keiko Tanaka',    email: 'keiko@example.com',  bio: 'Architect with an interest in neighbourhood design.' },
  { name: 'Liam Dupont',     email: 'liam@example.com',   bio: 'Environmental scientist at a local consultancy.' },
  { name: 'Maya Sharma',     email: 'maya@example.com',   bio: 'Runs the community newsletter and social media.' },
  { name: 'Noel Ferreira',   email: 'noel@example.com',   bio: 'Recently moved to the area, getting involved.' },
  { name: 'Olivia Chen',     email: 'olivia@example.com', bio: '' },
  { name: 'Pedro Alves',     email: 'pedro@example.com',  bio: '' },
  { name: 'Quinn Reeves',    email: 'quinn@example.com',  bio: 'Retired police officer. Coordinates the neighbourhood watch.' },
  { name: 'Rania Hassan',    email: 'rania@example.com',  bio: 'New resident, applied for membership last week.' },
  { name: 'Sam Bergstrom',   email: 'sam@example.com',    bio: 'Dog walker and park regular. Applied via the invite link.' },
];

const GF_MEMBERSHIPS: [number, string, number, string][] = [
  [0,  'admin',     1, 'approved'], [1,  'moderator', 2, 'approved'],
  [2,  'moderator', 1, 'approved'], [3,  'member',    1, 'approved'],
  [4,  'member',    1, 'approved'], [5,  'member',    2, 'approved'],
  [6,  'member',    1, 'approved'], [7,  'member',    1, 'approved'],
  [8,  'member',    1, 'approved'], [9,  'member',    1, 'approved'],
  [10, 'member',    1, 'approved'], [11, 'member',    1, 'approved'],
  [12, 'member',    1, 'approved'], [13, 'member',    1, 'approved'],
  [14, 'member',    1, 'approved'], [15, 'observer',  1, 'approved'],
  [16, 'observer',  1, 'approved'], [17, 'member',    1, 'approved'],
  [18, 'member',    1, 'pending'],  [19, 'member',    1, 'pending'],
];

const GF_TOPICS = [
  { name: 'Planning & Development',     description: 'Planning applications, building projects, and neighbourhood design.' },
  { name: 'Environment & Green Spaces', description: 'Parks, trees, biodiversity, and environmental initiatives.' },
  { name: 'Transport & Parking',        description: 'Roads, parking, cycling, and public transport.' },
  { name: 'Community Events',           description: 'Fairs, markets, social events, and community activities.' },
  { name: 'Finance & Budget',           description: 'Association finances, fees, and budget allocation.' },
  { name: 'Safety & Security',          description: 'Neighbourhood watch, street lighting, and community safety.' },
];

const GF_PROPOSALS: ProposalDef[] = [
  { title: 'Convert the old library into a community hub', topicIdx: 0, status: 'open', type: 'standard', threshold: 60, impact: 'high', createdDaysAgo: 5, closesInDays: 9, authorIdx: 0, pinned: true, tags: ['community-hub', 'library'],
    desc: `The Greenfield Road library has been vacant since the council closed it in 2022. This proposal asks the association to lobby the council to repurpose it as a community hub — café, meeting rooms, and space for local groups.\n\nA neighbouring association's feasibility study found similar buildings become self-funding within three years through room hire income.` },
  { title: 'Object to planning application 2024/0847 — Oak Street', topicIdx: 0, status: 'open', type: 'standard', threshold: 50, impact: 'high', createdDaysAgo: 3, closesInDays: 11, authorIdx: 1, tags: ['planning', 'oak-street'],
    desc: `Application 2024/0847 proposes converting the former bank at 14–18 Oak Street into six commercial units and twelve flats. Concerns:\n\n- Increased traffic on an already congested road\n- Loss of the green buffer zone at the rear\n- Only 6 parking spaces for 12 flats\n\nThis proposal is to submit a formal objection before the consultation window closes.` },
  { title: 'Install street lighting on Elm Close', topicIdx: 0, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 45, closesInDays: -31, closedAtDaysAgo: 31, authorIdx: 2, tags: ['lighting', 'council'], voteDistribution: 'pass',
    desc: 'Elm Close has had no working street lights since October 2023. This proposal authorised the association to engage a solicitor to formally demand the council fulfil its statutory duty to maintain highway lighting.' },
  { title: 'Require cycle storage in all new residential developments', topicIdx: 0, status: 'draft', type: 'standard', threshold: 60, impact: 'medium', createdDaysAgo: 1, authorIdx: 6, tags: ['cycling', 'planning'],
    desc: 'Amend our submission to the neighbourhood plan to require secure, weatherproof cycle storage in all new residential developments of five or more units. Currently the plan recommends but does not require this.' },
  { title: 'Plant 200 trees along the high street and park boundary', topicIdx: 1, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 60, closesInDays: -46, closedAtDaysAgo: 46, authorIdx: 13, tags: ['trees', 'environment'], voteDistribution: 'pass',
    desc: "Working with the council's Urban Greening team, this proposal secured agreement to plant 200 semi-mature trees over two planting seasons. The council provides the trees; the association organises planting days and maintenance." },
  { title: 'Community compost and food-waste scheme', topicIdx: 1, status: 'open', type: 'standard', threshold: 50, impact: 'medium', createdDaysAgo: 7, closesInDays: 7, authorIdx: 9, tags: ['composting', 'environment'],
    desc: `Set up 12 community compost bays across the estate, maintained on a volunteer rota. Any resident can contribute; the compost is used in communal gardens.\n\nEstimated setup cost: £800. Ongoing cost: minimal — tools, bags, and an annual volunteer training session.` },
  { title: 'Apply for Green Flag Award status for Greenfield Park', topicIdx: 1, status: 'open', type: 'temperature_check', createdDaysAgo: 1, closesInDays: 13, authorIdx: 13, tags: ['parks', 'awards'],
    desc: 'The Green Flag Award is the international quality mark for parks. Achieving it increases grant eligibility and provides a framework for ongoing management. We have the volunteer capacity and management plan ready.' },
  { title: 'Ban single-use plastics at association-organised events', topicIdx: 1, status: 'open', type: 'discussion', createdDaysAgo: 2, closesInDays: 12, authorIdx: 13, tags: ['plastics', 'events'],
    desc: 'From the 2025 summer fair onwards, all association events would use reusable or certified compostable alternatives only. Any vendor at an association event would be required to comply as a condition of their licence.' },
  { title: 'Petition the council for a 20mph zone on residential streets', topicIdx: 2, status: 'open', type: 'standard', threshold: 60, impact: 'high', createdDaysAgo: 10, closesInDays: 4, authorIdx: 7, tags: ['speed-limit', 'safety'], voteDistribution: 'contested',
    desc: `Following two near-miss incidents on Maple Avenue and Birchwood Road, this proposal asks the association to petition the council for a 20mph zone across the residential area bounded by the high street, the park, and the railway.\n\nEvidence from Bristol and Edinburgh shows similar schemes reduce casualties by 20–40%.` },
  { title: 'Introduce permit parking on weekdays 8am–6pm', topicIdx: 2, status: 'closed', type: 'standard', threshold: 60, createdDaysAgo: 35, closesInDays: -21, closedAtDaysAgo: 21, authorIdx: 8, tags: ['parking', 'station'], voteDistribution: 'reject',
    desc: 'Commuter parking from the nearby station displaces residents during weekday hours. This proposal asked the council to designate the streets around the station as permit-only during peak hours. Annual permit cost to residents: £50.' },
  { title: 'Install EV charging points in the main car park', topicIdx: 2, status: 'open', type: 'standard', threshold: 50, impact: 'medium', createdDaysAgo: 8, closesInDays: 6, authorIdx: 6, tags: ['ev-charging', 'car-park'],
    desc: 'The main car park has 40 spaces. Apply for an OZEV grant to install six 7kW EV charging points at no cost to the association. A small per-kWh charge would generate modest income to offset running costs.' },
  { title: 'Summer fair 2025 — budget allocation', topicIdx: 3, status: 'open', type: 'multiple_choice', threshold: 50, createdDaysAgo: 6, closesInDays: 8, authorIdx: 4, tags: ['summer-fair', 'budget'],
    options: ["£3,000 — basic programme (stalls, BBQ, bouncy castle)", "£5,000 — expanded programme (+ live music and craft fair)", "£8,000 — full programme (+ fairground rides and children's entertainment)"],
    desc: "We need to agree a budget for the 2025 summer fair. Last year's event attracted over 400 residents and broke even. Vote for your preferred tier." },
  { title: "Monthly farmers' market — preferred day", topicIdx: 3, status: 'open', type: 'multiple_choice', threshold: 50, createdDaysAgo: 4, closesInDays: 10, authorIdx: 4, tags: ['farmers-market'],
    options: ['Saturday morning (9am–1pm)', 'Sunday morning (9am–1pm)'],
    desc: "We've secured a regular slot in the market calendar. Before we confirm the day with the organiser, we'd like to know residents' preference." },
  { title: 'Extend community centre opening hours on Friday evenings', topicIdx: 3, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 28, closesInDays: -14, closedAtDaysAgo: 14, authorIdx: 3, tags: ['community-centre', 'events'], voteDistribution: 'pass',
    desc: 'The youth club, board games society, and craft group have all asked for an extra two hours on Fridays. Staffing cost: approximately £60/week, offset by opening the café for the extended period.' },
  { title: 'Raise annual membership fee from £10 to £20', topicIdx: 4, status: 'open', type: 'standard', threshold: 60, impact: 'medium', createdDaysAgo: 12, closesInDays: 2, authorIdx: 5, tags: ['membership', 'finance'], voteDistribution: 'contested',
    desc: `The membership fee has not increased since 2017. Running costs have risen ~60% since then; at £10/year the association runs at a small deficit.\n\nRaising to £20 would restore surplus and build a reserves buffer. A hardship waiver would remain available.` },
  { title: 'Emergency repairs to the bowling green drainage', topicIdx: 4, status: 'open', type: 'standard', threshold: 50, impact: 'medium', createdDaysAgo: 3, closesInDays: 11, authorIdx: 5, tags: ['bowling-green', 'maintenance'],
    desc: 'The bowling green drainage failed over last winter. Without repairs before spring, the green will be unplayable for the season. This proposal releases £2,400 from the general reserve for urgent remediation.' },
  { title: 'Annual accounts approval — financial year 2024', topicIdx: 4, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 50, closesInDays: -36, closedAtDaysAgo: 36, authorIdx: 5, tags: ['accounts', 'finance'], voteDistribution: 'pass',
    desc: 'Audited accounts for the year ending 31 December 2024. Income: £8,340. Expenditure: £7,912. Surplus: £428. Full accounts available at the community centre reception and on the website.' },
  { title: 'Procure a new association website and booking system', topicIdx: 4, status: 'withdrawn', type: 'standard', createdDaysAgo: 20, authorIdx: 0, tags: ['website', 'technology'],
    desc: "The current website is eight years old and not mobile-friendly. Withdrawn after Noel Ferreira volunteered to build a replacement pro bono." },
  { title: "Install CCTV cameras near the children's playground", topicIdx: 5, status: 'open', type: 'standard', threshold: 60, impact: 'medium', createdDaysAgo: 9, closesInDays: 5, authorIdx: 17, tags: ['cctv', 'playground'], voteDistribution: 'contested',
    desc: `Following antisocial behaviour near the playground after dark, this proposal is to install two CCTV cameras covering the entrance and adjacent footpath. Footage retained for 28 days under an ICO-compliant policy.\n\nMembers are encouraged to read the attached privacy impact assessment before voting.` },
  { title: 'Launch a neighbourhood watch scheme', topicIdx: 5, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 55, closesInDays: -41, closedAtDaysAgo: 41, authorIdx: 17, tags: ['neighbourhood-watch', 'police'], voteDistribution: 'pass',
    desc: 'Establish a formal neighbourhood watch linked to the Greenfield police safer neighbourhood team — street coordinators, a verified-residents-only messaging group, and an annual meeting with officers.' },
  { title: 'Traffic calming measures on Maple Avenue', topicIdx: 5, status: 'draft', type: 'standard', impact: 'medium', createdDaysAgo: 2, authorIdx: 7, tags: ['traffic', 'maple-avenue'],
    desc: 'Commission a traffic survey on Maple Avenue to recommend speed humps, a raised table at the Cedar Lane junction, or road narrowing. The survey findings would come back to members for a separate vote before any works are committed.' },
];

const GF_COMMENTS: Array<[number, number, string, number, boolean?]> = [
  [0,  1,  "I've already spoken informally to the council estates team. They're open to the idea — the building costs them around £18,000 a year in maintenance.", 4],
  [0,  3,  "Love this. There's a real gap for affordable meeting space locally — the only options at the moment are pub function rooms, which doesn't work for everyone.", 4],
  [0,  10, "Worth flagging: any change of use from D1 to mixed use will need a planning application. Happy to help navigate that if this passes — it's exactly the kind of thing I do for work.", 3, true],
  [0,  11, "Architect's note: the building has solid bones. The main costs would be a kitchen fit-out for the café and acoustic treatment in the larger meeting room.", 2],
  [0,  0,  "Thanks all — good to have that expertise on hand. @James Okafor I'll take you up on that offer if we get the green light.", 1],
  [1,  8,  "I was at the pre-application consultation last month. The developers know about the parking concerns but argue the council's own standards allow reduced provision in town-centre locations. We'll need to challenge that specifically.", 2],
  [1,  11, "From a design standpoint the proposed massing is fairly sensitive to the street scene. The parking situation is the real issue — six spaces genuinely isn't workable for twelve units.", 2],
  [1,  2,  "As a business on Oak Street, my bigger concern is construction disruption rather than the end result. Can we condition the build programme in our objection?", 1],
  [8,  7,  "The near-miss in March involved a child from the school I'm governor at. 85% of pedestrians struck at 30mph suffer serious injury; at 20mph it drops below 15%.", 9],
  [8,  17, "As someone who worked traffic for 20 years — the speed data supports this, but the key is enforcement. Average speed cameras are far more effective than signs alone.", 7],
  [8,  8,  "Not opposed, but I'd like to see evidence it actually changes behaviour rather than just changing the number on a sign. The Bristol 20mph data is mixed.", 5],
  [8,  12, "The Bristol data is mixed because it was implemented without traffic calming measures. Schemes with physical measures consistently show significant speed reduction. We should ask for both.", 3],
  [14, 5,  "I've put the full breakdown in the accounts appendix. The numbers aren't dramatic — a £428 deficit last year — but without the increase that erodes the reserve over five or six years.", 11, true],
  [14, 4,  "I've been a member for 22 years at £10. A doubling in one go feels sharp. Could we phase it — £15 this year, £20 next?", 10],
  [14, 2,  "The hardship waiver is important. Can we make the application process simple? If people have to write in and justify themselves, they just won't bother.", 8],
  [14, 5,  "@Ben Nakamura Agreed — I'm proposing the waiver is available on request, no explanation required. Just tick a box on the renewal form.", 7],
  [14, 14, "I moved here 18 months ago and the value this association provides is great. Happy to pay £20. Could we also add a 'pay it forward' option to sponsor a waiver for someone?", 5],
  [18, 17, "I've looked at the ICO guidelines. We'd need a legitimate interest assessment and visible signage, but the purpose described here comfortably meets that threshold. I can draft the paperwork.", 8],
  [18, 14, "Before we vote — has anyone contacted the council's community safety team? They sometimes co-fund playground CCTV.", 6],
  [18, 9,  "I have real concerns about normalising surveillance where children play. Have we exhausted other options — better lighting, a late-evening volunteer presence?", 4],
  [18, 7,  "@Isla Kowalski We've raised the lighting issue with the council three times without action. The incidents have been at dusk when lighting would help but not solve it.", 3],
  [18, 3,  "Could we run this as a six-month trial, review the incident log, then decide whether to make it permanent?", 2],
];

const GF_ARGUMENTS: Array<[number, number, 'for' | 'against', string]> = [
  [0,  1,  'for',     "Repurposing the library addresses a genuine gap in affordable meeting space. The building is already costing the council £18,000/year empty — there's strong alignment of interest."],
  [0,  8,  'against', "The running costs of a community hub are often underestimated. Without guaranteed income from day one, we risk inheriting a liability rather than an asset. We should see a detailed business plan first."],
  [8,  7,  'for',     "Road safety evidence is robust: 20mph zones with traffic calming reduce casualties by 20–40%. Two near-miss incidents involving children this year alone justify urgent action."],
  [8,  8,  'against', "20mph limits without physical calming have a poor track record. Signs alone do not change driver behaviour. Our petition should specify average speed cameras or road narrowing."],
  [14, 5,  'for',     "The association is running at a deficit. A £10 increase — less than a coffee per month — is modest relative to the services provided. The hardship waiver protects those who need it."],
  [14, 4,  'against', "Doubling the fee in one step will cause membership to drop, especially among newer and lower-income residents. A phased increase achieves the same outcome with far less disruption."],
  [18, 17, 'for',     "CCTV near the playground is a proportionate and evidence-based deterrent. With proper signage and a 28-day retention policy, this is entirely lawful and widely used in similar contexts."],
  [18, 9,  'against', "Children have a right to unsurveilled play. Before installing permanent infrastructure, we should exhaust community-led approaches: improved lighting, a volunteer evening presence, direct engagement."],
];

const GF_DELEGATIONS: [number, number, number | null, number][] = [
  [4, 0, 0, 1.0], [8, 1, 0, 1.0], [11, 10, 0, 1.0],
  [3, 9, 1, 1.0], [16, 13, 1, 1.0],
  [4, 6, 2, 1.0], [15, 7, 2, 1.0],
  [8, 5, 4, 1.0], [16, 5, 4, 1.0],
  [3, 17, 5, 1.0], [11, 17, 5, 1.0],
  [15, 0, null, 1.0], [16, 14, null, 1.0],
];

// ══════════════════════════════════════════════════════════════════════════════
// ── Republic of Verdania (national government) ────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const VD_USERS = [
  { name: 'President Amara Diallo',      email: 'president@verdania.gov',     bio: 'Serving second term as President of the Republic of Verdania.' },
  { name: 'PM Lucian Bălan',             email: 'pm@verdania.gov',            bio: 'Prime Minister and leader of the Progressive Alliance.' },
  { name: 'Min. Finance Keiko Nakata',   email: 'finance@verdania.gov',       bio: 'Finance Minister. Economist, formerly at the IMF.' },
  { name: 'Min. Foreign Affairs Ibrahim Hassan', email: 'foreign@verdania.gov', bio: 'Foreign Affairs Minister. Former ambassador to three countries.' },
  { name: 'Min. Environment Noa Ben-David', email: 'environment@verdania.gov', bio: 'Environment Minister and co-author of the Verdanian Green Pact.' },
  { name: 'Min. Justice Rosa Ferreira',  email: 'justice@verdania.gov',       bio: 'Justice Minister. Constitutional lawyer.' },
  { name: 'Min. Health Hugo Svensson',   email: 'health@verdania.gov',        bio: 'Health Minister. Practising physician until 2019.' },
  { name: 'Senator Priya Mehta',         email: 'senator.mehta@verdania.gov', bio: 'Senator for the Northern Provinces. Progressive Alliance.' },
  { name: 'Senator Viktor Kowalski',     email: 'senator.kowalski@verdania.gov', bio: 'Senator for the Eastern Region. Conservative Union.' },
  { name: 'Senator Clara Osei-Mensah',   email: 'senator.osei@verdania.gov',  bio: 'Senator for the Capital District. Progressive Alliance.' },
  { name: 'Senator James Nakamura',      email: 'senator.nakamura@verdania.gov', bio: 'Independent Senator. Former academic.' },
  { name: 'Opposition Leader David Petrov', email: 'opposition@verdania.gov', bio: 'Leader of the Conservative Union opposition.' },
];

// [localIdx, role, weight, status]
const VD_MEMBERSHIPS: [number, string, number, string][] = [
  [0,  'admin',     3, 'approved'],  // President — casting vote
  [1,  'admin',     2, 'approved'],  // Prime Minister
  [2,  'moderator', 1, 'approved'],
  [3,  'moderator', 1, 'approved'],
  [4,  'member',    1, 'approved'],
  [5,  'member',    1, 'approved'],
  [6,  'member',    1, 'approved'],
  [7,  'member',    1, 'approved'],
  [8,  'member',    1, 'approved'],
  [9,  'member',    1, 'approved'],
  [10, 'member',    1, 'approved'],
  [11, 'member',    1, 'approved'],
];

const VD_TOPICS = [
  { name: 'Foreign Affairs',       description: 'International relations, treaties, and diplomacy.' },
  { name: 'Taxation & Budget',     description: 'National fiscal policy, taxation, and budget approvals.' },
  { name: 'Healthcare',            description: 'Public health, the national health service, and medical funding.' },
  { name: 'Environment',           description: 'Climate policy, environmental legislation, and conservation.' },
  { name: 'Constitutional Affairs',description: 'Constitutional amendments, electoral law, and democratic reform.' },
];

const VD_PROPOSALS: ProposalDef[] = [
  { title: 'Ratify the Trans-Oceanic Partnership Agreement', topicIdx: 0, status: 'open', type: 'standard', threshold: 60, impact: 'high', createdDaysAgo: 8, closesInDays: 6, authorIdx: 3, tags: ['trade', 'foreign-policy'], voteDistribution: 'contested',
    desc: `The Trans-Oceanic Partnership Agreement covers 18 signatory nations and establishes a free-trade zone representing 12% of global GDP. Key provisions include:\n\n- Zero tariffs on manufactured goods within five years\n- Mutual recognition of professional qualifications\n- Binding labour standards with an independent monitoring body\n- Intellectual property protections aligned with TRIPS-Plus norms\n\nThe agreement requires a 60% parliamentary majority to ratify. The opposition has raised concerns about the agricultural exemptions chapter.` },
  { title: '2025 National Budget — second reading', topicIdx: 1, status: 'open', type: 'multiple_choice', threshold: 50, createdDaysAgo: 5, closesInDays: 9, authorIdx: 2, tags: ['budget', 'fiscal-policy'],
    options: ['Approve as presented — total expenditure 48.2bn VED', 'Approve with fiscal amendments — reduce deficit by 2.1bn VED', 'Refer back to the Treasury Committee for revision'],
    desc: 'The 2025 National Budget proposes total expenditure of 48.2bn Verdanian Dollars against projected revenues of 45.8bn VED, resulting in a planned deficit of 2.4bn VED (0.8% of GDP). Priority increases are in healthcare (+4.2%), infrastructure (+3.1%), and education (+2.8%).' },
  { title: 'Abolish the lower-rate income surcharge', topicIdx: 1, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 60, closesInDays: -46, closedAtDaysAgo: 46, authorIdx: 1, tags: ['taxation', 'income-tax'], voteDistribution: 'pass',
    desc: 'The lower-rate income surcharge of 2% on incomes between 18,000 and 30,000 VED was introduced as an emergency measure in 2018. This motion abolished the surcharge effective 1 January 2025, benefiting an estimated 1.4 million workers.' },
  { title: 'Emergency climate bill: 40% emissions reduction by 2032', topicIdx: 3, status: 'open', type: 'standard', threshold: 60, impact: 'constitutional', createdDaysAgo: 4, closesInDays: 10, authorIdx: 4, tags: ['climate', 'legislation'], voteDistribution: 'contested',
    desc: `This bill establishes a legally binding target of 40% reduction in national greenhouse gas emissions against the 2010 baseline by 2032. It creates:\n\n- A statutory Climate Commission with independent oversight powers\n- Mandatory carbon budgets every five years\n- A just transition fund of 800m VED for workers in high-carbon industries\n- Penalties on public bodies failing to meet sectoral targets` },
  { title: 'Constitutional amendment: two-term limit on the presidency', topicIdx: 4, status: 'open', type: 'standard', threshold: 75, impact: 'constitutional', createdDaysAgo: 14, closesInDays: 0, authorIdx: 5, tags: ['constitution', 'presidency'],
    desc: "This amendment to Article 34 of the Verdanian Constitution would limit any individual to two terms as President. Currently there is no term limit — President Diallo is serving her second term and has stated she does not intend to seek a third. The amendment requires a 75% supermajority of the National Assembly and ratification by at least four of the seven provincial assemblies." },
  { title: 'Expand rural primary healthcare: 80 new clinics by 2027', topicIdx: 2, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 90, closesInDays: -76, closedAtDaysAgo: 76, authorIdx: 6, tags: ['healthcare', 'rural'], voteDistribution: 'pass',
    desc: 'Approved a 320m VED programme to build 80 new primary healthcare clinics across rural constituencies, each staffed by a minimum of two GPs and a nurse practitioner. Programme target: halve rural-urban disparity in GP access ratios by 2027.' },
];

const VD_COMMENTS: Array<[number, number, string, number, boolean?]> = [
  [0, 3,  "The labour standards chapter has real teeth this time — the independent monitoring body can recommend sanctions, not just issue reports. This is significantly stronger than the 2019 Eastland Agreement.", 7],
  [0, 11, "The agricultural exemptions are a significant flaw. Our dairy and grain sectors would face immediate competitive pressure without adequate transition support. I cannot support ratification in its current form.", 6],
  [0, 1,  "We negotiated the agricultural exemption schedule over 14 months. Removing it now would unravel the entire agreement. Our industrial sector supports 240,000 jobs that benefit from this deal.", 5],
  [3, 4,  "The Climate Commission's independence is the crucial provision. Previous voluntary targets failed because there was no enforcement mechanism. This changes that.", 3],
  [3, 11, "A 40% reduction in eight years is technically achievable but politically difficult. The just transition fund needs to be at least 2bn VED to be credible. 800m won't cover retraining in the eastern mining districts alone.", 2],
  [4, 10, "The precedent here matters beyond this presidency. A constitutional norm of two terms is far more durable than a personal commitment. This amendment should have been made decades ago.", 13],
  [4, 8,  "I support term limits in principle but 75% is a very high bar. Three successive governments have failed to reach it. A runoff provision at 60% after two failed 75% attempts would be more practical.", 10],
];

// ══════════════════════════════════════════════════════════════════════════════
// ── Sunflower Workers' Co-operative ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const SF_USERS = [
  { name: 'Nadia Bloom',    email: 'nadia@sunflower.coop',    bio: 'Co-founder and lead strategist. Ten years in the co-op.' },
  { name: 'Kwame Asante',   email: 'kwame@sunflower.coop',    bio: 'Co-founder. Leads business development.' },
  { name: 'Rosa Chen',      email: 'rosa@sunflower.coop',     bio: 'Senior project manager, five years with the co-op.' },
  { name: 'Tomás Wojcik',   email: 'tomas@sunflower.coop',    bio: 'Operations. Joined from a housing association.' },
  { name: 'Priya Sharma',   email: 'priya@sunflower.coop',    bio: 'Research and communications. Three years in.' },
  { name: 'Marcus Webb',    email: 'marcus@sunflower.coop',   bio: 'Client delivery. Keeps the projects moving.' },
  { name: 'Ingrid Solberg', email: 'ingrid@sunflower.coop',   bio: 'Finance and compliance.' },
  { name: 'Chloe Baptiste', email: 'chloe@sunflower.coop',    bio: 'Newest member — joined last year after an associate period.' },
];

const SF_MEMBERSHIPS: [number, string, number, string][] = [
  [0, 'admin',  1, 'approved'], [1, 'admin',  1, 'approved'],
  [2, 'member', 1, 'approved'], [3, 'member', 1, 'approved'],
  [4, 'member', 1, 'approved'], [5, 'member', 1, 'approved'],
  [6, 'member', 1, 'approved'], [7, 'member', 1, 'approved'],
];

const SF_TOPICS = [
  { name: 'Business & Clients',  description: 'Client relationships, contracts, and strategic direction.' },
  { name: 'Staffing & People',   description: 'Hiring, roles, pay, and member admission.' },
  { name: 'Workplace Policy',    description: 'Working hours, remote work, tools, and ways of working.' },
  { name: 'Finance & Profit Share', description: 'Budgets, surplus distribution, and financial planning.' },
];

const SF_PROPOSALS: ProposalDef[] = [
  { title: 'Hire a part-time operations manager', topicIdx: 1, status: 'open', type: 'standard', threshold: 60, createdDaysAgo: 6, closesInDays: 8, authorIdx: 2, tags: ['hiring', 'operations'],
    desc: "The co-op has grown significantly this year and operational admin is absorbing around 20% of member time — time that would be better spent on client work. This proposal is to hire a part-time operations manager (0.5 FTE) to handle scheduling, finance admin, and supplier management.\n\nEstimated cost: £18,000/year. Expected to free up roughly £30,000 of billable member capacity." },
  { title: 'Q1 surplus distribution', topicIdx: 3, status: 'open', type: 'multiple_choice', threshold: 50, createdDaysAgo: 4, closesInDays: 10, authorIdx: 6, tags: ['surplus', 'profit-share'],
    options: ['Distribute equally to all 8 members (£1,250 each — total £10,000)', 'Retain 40% in reserve, distribute 60% (£750 each)', 'Retain full surplus — reinvest in new equipment and training'],
    desc: "Q1 closed with a trading surplus of £10,000 after all costs. Per our articles, surplus distribution requires a member vote. Ingrid has prepared three options taking into account our current reserve position (£22,000) and upcoming equipment refresh (£8,000)." },
  { title: 'Trial a four-day working week', topicIdx: 2, status: 'open', type: 'discussion', createdDaysAgo: 3, closesInDays: 11, authorIdx: 4, tags: ['four-day-week', 'wellbeing'],
    desc: "Following the widely-reported 4-day week trial results in the UK and Iceland, Priya proposes we run our own six-month trial. We'd work 32 hours over four days with no reduction in pay or billable output targets. Key question: do we need to renegotiate any client contracts first?" },
  { title: 'End the Harlow Industries retainer', topicIdx: 0, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 45, closesInDays: -31, closedAtDaysAgo: 31, authorIdx: 1, tags: ['clients', 'retainer'], voteDistribution: 'pass',
    desc: "The Harlow Industries retainer (£3,500/month) has become untenable due to increasingly unreasonable scope requests, late payments, and one incident of disrespectful behaviour toward a member during a review call. This proposal was to give 30 days' notice to terminate the retainer. Passed. Notice given. Relationship ended amicably." },
  { title: 'Replace company MacBooks with Linux ThinkPads', topicIdx: 2, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 30, closesInDays: -16, closedAtDaysAgo: 16, authorIdx: 3, tags: ['tools', 'hardware'], voteDistribution: 'reject',
    desc: "Tomás proposed replacing all company MacBooks with Linux ThinkPads on the next refresh cycle to reduce costs (~£900 per device saving) and improve sovereignty over our tools. The proposal was rejected — majority preferred to retain macOS for client compatibility and design tooling." },
];

const SF_COMMENTS: Array<[number, number, string, number, boolean?]> = [
  [0, 0,  "I've been doing the hiring admin for two years. Honestly, a dedicated person would pay for themselves within six months just in freed-up capacity. Strongly support.", 5],
  [0, 5,  "My concern is the culture fit — we're a flat co-op and bringing in a non-member employee changes the dynamic. Could we structure it as a paid associate with a path to membership?", 4],
  [0, 1,  "@Marcus Webb That's a valid concern and worth baking into the job design from day one. The associate-to-member pathway has worked well before.", 3],
  [2, 0,  "I trialled a 4-day week at my previous employer. Output stayed the same, recruitment improved dramatically, and sick days dropped by 18%. The evidence is genuinely compelling.", 2],
  [2, 5,  "Client expectations are the real constraint. At least three of our ongoing contracts have Friday deliverables baked in. We'd need to renegotiate before we could start the trial.", 2],
  [2, 3,  "Rather than fixed 4-day weeks, could we do flexible 32 hours? Some weeks I might work 5 shorter days, others 4 longer ones. That would be more useful than a rigid day off.", 1],
];

// ══════════════════════════════════════════════════════════════════════════════
// ── Ashfield District Council ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const AC_USERS = [
  { name: 'Cllr Sarah Whitmore',   email: 'whitmore@ashfield.gov.uk',    bio: 'Council Leader, Labour Group. Third term councillor.' },
  { name: 'Cllr James Akindele',   email: 'akindele@ashfield.gov.uk',    bio: 'Deputy Leader and portfolio holder for Housing.' },
  { name: 'Cllr Patricia Ng',      email: 'ng@ashfield.gov.uk',          bio: 'Conservative Group Leader. Planning and development portfolio.' },
  { name: 'Cllr Robert Fairweather', email: 'fairweather@ashfield.gov.uk', bio: 'Conservative Group. Former surveyor.' },
  { name: 'Cllr Denise Okafor',    email: 'okafor@ashfield.gov.uk',      bio: 'Labour Group. Social services and communities.' },
  { name: 'Cllr Alan Moss',        email: 'moss@ashfield.gov.uk',        bio: 'Conservative Group. Highways and transport.' },
  { name: 'Cllr Yemi Adeyemi',     email: 'adeyemi@ashfield.gov.uk',     bio: 'Labour Group. Housing and planning.' },
  { name: 'Cllr Carol Thornton',   email: 'thornton@ashfield.gov.uk',    bio: 'Liberal Democrat. Environment and sustainability.' },
  { name: 'Cllr Dave Rushworth',   email: 'rushworth@ashfield.gov.uk',   bio: 'Conservative Group. Highways and infrastructure.' },
  { name: 'Cllr Sanjay Patel',     email: 'patel@ashfield.gov.uk',       bio: 'Labour Group. Finance and procurement.' },
  { name: 'Cllr Louise Hendricks', email: 'hendricks@ashfield.gov.uk',   bio: 'Liberal Democrat. Environment portfolio.' },
  { name: 'Cllr Martin Bryce',     email: 'bryce@ashfield.gov.uk',       bio: 'Conservative Group. Lifelong Ashfield resident.' },
  { name: 'Cllr Aisha Kamara',     email: 'kamara@ashfield.gov.uk',      bio: 'Labour Group. Community engagement lead.' },
  { name: 'Cllr Pete Donoghue',    email: 'donoghue@ashfield.gov.uk',    bio: 'Independent.' },
  { name: 'Cllr Sandra Wei',       email: 'wei@ashfield.gov.uk',         bio: 'Labour Group. First term councillor.' },
];

const AC_MEMBERSHIPS: [number, string, number, string][] = [
  [0,  'admin',     1, 'approved'], [1,  'admin',     1, 'approved'],
  [2,  'moderator', 1, 'approved'], [3,  'member',    1, 'approved'],
  [4,  'member',    1, 'approved'], [5,  'member',    1, 'approved'],
  [6,  'member',    1, 'approved'], [7,  'member',    1, 'approved'],
  [8,  'member',    1, 'approved'], [9,  'member',    1, 'approved'],
  [10, 'member',    1, 'approved'], [11, 'member',    1, 'approved'],
  [12, 'member',    1, 'approved'], [13, 'member',    1, 'approved'],
  [14, 'member',    1, 'approved'],
];

const AC_TOPICS = [
  { name: 'Planning & Development',      description: 'Planning applications, development control, and local plan.' },
  { name: 'Highways & Infrastructure',   description: 'Roads, transport, cycling, and public realm.' },
  { name: 'Budget & Finance',            description: 'Council budget, spending, and financial management.' },
  { name: 'Social Services & Housing',   description: 'Housing, social care, and community support.' },
  { name: 'Environment & Sustainability', description: 'Climate action, green spaces, and biodiversity.' },
];

const AC_PROPOSALS: ProposalDef[] = [
  { title: 'Grant outline planning permission: 200 homes at Wheatley Fields', topicIdx: 0, status: 'open', type: 'standard', threshold: 50, impact: 'high', createdDaysAgo: 10, closesInDays: 4, authorIdx: 2, tags: ['planning', 'housing', 'wheatley-fields'], voteDistribution: 'contested',
    desc: `Application reference: DC/2024/0312. Outline planning permission is sought for up to 200 dwellings on the 8.4-hectare Wheatley Fields site, including 30% affordable housing.\n\nKey planning considerations:\n- Site is allocated in the local plan but borders the Wheatley Conservation Area\n- Heritage Impact Assessment flags potential sightline impacts from St. Barnabas Church\n- Highways report recommends a new controlled crossing on Wheatley Road\n- Lead Local Flood Authority: no objection subject to conditions\n\nOfficer recommendation: APPROVE with conditions.` },
  { title: 'Approve the 2025–26 council budget', topicIdx: 2, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 50, closesInDays: -36, closedAtDaysAgo: 36, authorIdx: 0, tags: ['budget', 'finance'], voteDistribution: 'pass',
    desc: 'The 2025–26 revenue budget of £47.2m was approved, maintaining a 1.99% council tax increase (the maximum permitted without a referendum). The capital programme of £12.4m includes £3.8m for the Northgate Community Centre refurbishment, £2.1m for highway resurfacing, and £1.5m for the Riverside pedestrian bridge.' },
  { title: 'Adopt the 20-minute neighbourhood design guide', topicIdx: 1, status: 'open', type: 'standard', threshold: 50, createdDaysAgo: 7, closesInDays: 7, authorIdx: 7, tags: ['urban-design', 'active-travel'],
    desc: "The 20-minute neighbourhood concept — where residents can meet daily needs within a 20-minute walk or cycle — is increasingly embedded in national planning policy. This proposal adopts a council-wide design guide requiring all major new developments to demonstrate conformity with 20-minute neighbourhood principles: walkability, mixed use, and active travel infrastructure." },
  { title: 'Emergency motion: temporary closure of Northgate Community Centre', topicIdx: 3, status: 'open', type: 'standard', threshold: 50, impact: 'high', createdDaysAgo: 3, closesInDays: 1, authorIdx: 4, tags: ['community-centre', 'emergency'], voteDistribution: 'contested',
    desc: "A structural survey commissioned following complaints about ceiling cracks has identified Category 2 defects in the main hall roof structure. The council's structural engineer recommends temporary closure pending remediation works estimated at £380,000–£520,000.\n\nThe centre currently hosts 14 regular community groups, a weekly foodbank, and a GP health hub. Officers are identifying alternative venues. Emergency closure would be effective from Monday." },
  { title: "Name the Riverside bridge in honour of former Cllr Miriam Forbes", topicIdx: 4, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 20, closesInDays: -6, closedAtDaysAgo: 6, authorIdx: 0, tags: ['public-realm', 'recognition'], voteDistribution: 'pass',
    desc: "Cllr Miriam Forbes served Ashfield for 22 years (2002–2024) and chaired the planning committee for eight of those years. The Riverside pedestrian bridge, approved in the 2023–24 capital programme, will be the most significant piece of public realm infrastructure in a decade. Naming it in her honour was approved unanimously." },
];

const AC_COMMENTS: Array<[number, number, string, number, boolean?]> = [
  [0, 2,  "The heritage impact assessment is the sticking point. The revised sightlines submitted last week are better but I'd like to see them formally reviewed by the historic environment officer before we approve.", 9],
  [0, 8,  "200 units at 0.8 car spaces per dwelling is wholly inadequate for this part of the district. The site is 1.4 miles from the nearest bus route. The highways report is based on optimistic modal shift assumptions.", 8],
  [0, 6,  "We need these homes. There are 2,700 households on our waiting list. This site has been allocated for housing for 15 years. Every delay costs people in housing need.", 6],
  [0, 13, "I'm going to abstain. The officer recommendation is sound but I have genuine concerns about the infrastructure timing. I want the crossing on Wheatley Road conditioned as pre-occupation, not pre-first-use.", 5],
  [3, 4,  "The foodbank operates every Thursday from that centre. Approximately 180 families depend on it. Whatever alternative venue we identify needs to be confirmed before closure — not after.", 2],
  [3, 7,  "The GP health hub at Northgate serves 1,200 registered patients, many elderly. We need a written confirmation from the ICB that services can continue at an alternative location before this motion passes.", 1],
];

// ══════════════════════════════════════════════════════════════════════════════
// ── Northlight Digital ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const NL_USERS = [
  { name: 'Reuben Chen',       email: 'reuben@northlightdigital.com',   bio: 'CEO and co-founder. Previously at Stripe.' },
  { name: 'Amara Diallo',      email: 'amara@northlightdigital.com',    bio: 'CTO and co-founder. Distributed systems background.' },
  { name: 'Sofía Martínez',    email: 'sofia@northlightdigital.com',    bio: 'Lead Engineer. Six years at the company.' },
  { name: 'Daniel Park',       email: 'daniel@northlightdigital.com',   bio: 'Product Lead. Ex-Notion.' },
  { name: 'Yuki Tanaka',       email: 'yuki@northlightdigital.com',     bio: 'Design Lead. Previously at a design consultancy.' },
  { name: 'Mohammed Al-Sayed', email: 'mohammed@northlightdigital.com', bio: 'Senior Backend Engineer. Rust and Go.' },
  { name: 'Emma Laurent',      email: 'emma@northlightdigital.com',     bio: 'Frontend Engineer. React and accessibility focus.' },
  { name: 'Kai Brennan',       email: 'kai@northlightdigital.com',      bio: 'DevOps and infrastructure. Kubernetes obsessive.' },
  { name: 'Layla Okonkwo',     email: 'layla@northlightdigital.com',    bio: 'Sales Lead. Joined from a SaaS startup.' },
  { name: 'Niall Duggan',      email: 'niall@northlightdigital.com',    bio: 'Finance and ops. Part-time CFO.' },
];

const NL_MEMBERSHIPS: [number, string, number, string][] = [
  [0, 'admin',     1, 'approved'], [1, 'admin',     1, 'approved'],
  [2, 'moderator', 1, 'approved'], [3, 'member',    1, 'approved'],
  [4, 'member',    1, 'approved'], [5, 'member',    1, 'approved'],
  [6, 'member',    1, 'approved'], [7, 'member',    1, 'approved'],
  [8, 'member',    1, 'approved'], [9, 'member',    1, 'approved'],
];

const NL_TOPICS = [
  { name: 'Engineering & Infrastructure', description: 'Technical decisions, architecture, tooling, and infrastructure.' },
  { name: 'Product & Design',             description: 'Product direction, features, and design standards.' },
  { name: 'Culture & People',             description: 'Working practices, norms, hiring, and team culture.' },
  { name: 'Finance & Commercial',         description: 'Budgets, pricing, commercial decisions, and compensation.' },
];

const NL_PROPOSALS: ProposalDef[] = [
  { title: 'Migrate primary infrastructure from AWS to GCP', topicIdx: 0, status: 'open', type: 'standard', threshold: 60, impact: 'high', createdDaysAgo: 9, closesInDays: 5, authorIdx: 1, tags: ['infrastructure', 'gcp', 'aws'], voteDistribution: 'contested',
    desc: "Google Cloud has offered us $150,000 in credits over two years as part of their startup migration programme — an offer that expires 31 March. Current AWS spend is ~$11,000/month. Our GCP equivalent is estimated at ~$8,500/month once optimised.\n\nThis is a significant migration. Kai's estimate is 12–16 weeks of parallel running before full cutover. The main risk is our managed PostgreSQL cluster and the Kafka event bus. We'd want to maintain AWS failover for at least six months post-migration." },
  { title: 'Introduce 10% time for personal projects', topicIdx: 2, status: 'open', type: 'discussion', createdDaysAgo: 5, closesInDays: 9, authorIdx: 3, tags: ['culture', 'innovation'],
    desc: "Inspired by Google's 20% time and various 'hackathon culture' companies, this proposal is to ringfence every other Friday as unstructured time for engineers to work on personal projects, internal tools, or learning. Not a contractual change — just a standing agreement that Fridays aren't for client work or sprint stories." },
  { title: 'Adopt Rust for all new backend services', topicIdx: 0, status: 'closed', type: 'standard', threshold: 60, createdDaysAgo: 35, closesInDays: -21, closedAtDaysAgo: 21, authorIdx: 5, tags: ['rust', 'backend', 'languages'], voteDistribution: 'contested',
    desc: "Propose that all new backend services are written in Rust rather than Node.js/TypeScript. Rationale: performance (10–100x for CPU-bound tasks), memory safety, and growing ecosystem. Mohammed has done a proof-of-concept migration of the notifications service — build time is higher but runtime performance and memory usage are dramatically better.\n\nPassed on a narrow majority. Node.js services will not be migrated, but all greenfield work goes to Rust." },
  { title: 'Default to async-first communication', topicIdx: 2, status: 'open', type: 'standard', threshold: 50, createdDaysAgo: 3, closesInDays: 11, authorIdx: 2, tags: ['communication', 'async', 'culture'],
    desc: "No recurring meeting should exist without a written agenda shared at least 24 hours in advance. Meetings that could be Slack threads should be Slack threads. Meetings that could be Loom videos should be Loom videos. Engineers should have at least two uninterrupted focus blocks of 2+ hours per day.\n\nThis is a cultural norm, not a policy — but formalising it helps us hold each other accountable." },
  { title: 'Increase all salaries by 8% to match CPI', topicIdx: 3, status: 'closed', type: 'standard', threshold: 50, createdDaysAgo: 55, closesInDays: -41, closedAtDaysAgo: 41, authorIdx: 0, tags: ['compensation', 'salaries'], voteDistribution: 'pass', anonymousVoting: true,
    desc: "CPI over the past 12 months has been 7.4%. This proposal applied an 8% uplift to all salaries effective 1 April, keeping us above inflation and within our projected headcount budget. Niall confirmed the uplift is fully funded from operating margin without requiring new investment." },
];

const NL_COMMENTS: Array<[number, number, string, number, boolean?]> = [
  [0, 1,  "The $150k credit offer is the reason to act now rather than in six months when our infra costs will have risen further anyway. I think the timing is right.", 8],
  [0, 5,  "I've done this migration twice at previous companies. The PostgreSQL layer is the hard part — expect 10–12 weeks of careful parallel running. It's doable but we should not underestimate the engineering cost.", 7],
  [0, 7,  "Most of our Terraform is already cloud-agnostic. The main uplift is the Kubernetes migration and retraining on GCP-specific services (Pub/Sub vs SQS etc.). I've scoped it at about 6 weeks of my time.", 6],
  [0, 8,  "From a commercial perspective, I need clarity on SLAs during the migration window. If we have downtime incidents during a cutover, what's the customer impact? We have three enterprise contracts with 99.9% uptime obligations.", 4],
  [1, 3,  "I love this idea but I want to make sure it doesn't become shadow-sprint work. Can we agree that 10% time outputs are shared back with the team — even if they go nowhere? The learning is the point.", 4],
  [1, 6,  "Two Fridays a month of uninterrupted dev time would also be great for paying down tech debt, which isn't glamorous enough to make sprint planning but compounds if ignored.", 3],
];

// ══════════════════════════════════════════════════════════════════════════════
// ── main seed ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

async function seed() {
  await dataSource.initialize();
  const em = dataSource.manager;

  console.log('Clearing existing data...');
  await em.query(`
    TRUNCATE audit_log, notifications, comment_reactions, comments,
      arguments, vetoes, endorsements, votes, proposal_links,
      proposal_reactions, proposal_signatures, proposal_options,
      delegations, proposals, memberships, topics,
      credentials, organisations, users
    CASCADE
  `);

  // ── Create all users ─────────────────────────────────────────────────────

  console.log('Seeding users...');
  const [gfUsers, vdUsers, sfUsers, acUsers, nlUsers] = await Promise.all([
    em.save(User, GF_USERS.map(u => em.create(User, { id: uid(), ...u, email_verified: true }))),
    em.save(User, VD_USERS.map(u => em.create(User, { id: uid(), ...u, email_verified: true }))),
    em.save(User, SF_USERS.map(u => em.create(User, { id: uid(), ...u, email_verified: true }))),
    em.save(User, AC_USERS.map(u => em.create(User, { id: uid(), ...u, email_verified: true }))),
    em.save(User, NL_USERS.map(u => em.create(User, { id: uid(), ...u, email_verified: true }))),
  ]);
  const oli = gfUsers[0];

  // ── Greenfield Residents' Association ────────────────────────────────────

  console.log("Seeding Greenfield Residents' Association...");
  const gfOrg = await em.save(Organisation, em.create(Organisation, {
    id: uid(), name: "Greenfield Residents' Association", slug: 'greenfield-ra',
    description: "The Greenfield Residents' Association represents households across the Greenfield estate. We use liquid democracy to make collective decisions about our neighbourhood — from planning objections to community events.",
    invite_token: uid(), proposal_creation_role: 'member', topic_creation_role: 'moderator',
    default_voting_duration_days: 14, default_threshold: 60, voting_visibility: 'public',
    is_public: true, veto_role: 'moderator', min_endorsements: 2, require_member_approval: true,
    weight_mode: 'manual',
    proposal_templates: [
      { id: uid(), name: 'Planning objection', description: 'Template for formal objections to planning applications.', proposal_type: 'standard', threshold: 50 },
      { id: uid(), name: 'Budget request', description: 'Template for releasing funds from the general reserve.', proposal_type: 'standard', threshold: 60 },
      { id: uid(), name: 'Community consultation', description: 'Gather opinions before a formal vote.', proposal_type: 'discussion', threshold: 50 },
    ],
  }));

  await em.save(Membership, GF_MEMBERSHIPS.map(([idx, role, weight, status]) =>
    em.create(Membership, { id: uid(), organisation_id: gfOrg.id, user_id: gfUsers[idx].id, role: role as any, weight, status: status as any, invited_by: idx === 0 ? null : oli.id }),
  ));

  const gfTopics = await em.save(Topic, GF_TOPICS.map(t =>
    em.create(Topic, { id: uid(), organisation_id: gfOrg.id, ...t }),
  ));

  const gfProposals = await em.save(Proposal, GF_PROPOSALS.map(p => {
    const closesAt = p.closesInDays !== undefined ? (p.closesInDays > 0 ? fromNow(p.closesInDays) : ago(Math.abs(p.closesInDays))) : null;
    return em.create(Proposal, {
      id: uid(), organisation_id: gfOrg.id, topic_id: gfTopics[p.topicIdx].id,
      author_id: gfUsers[p.authorIdx].id, title: p.title, description: p.desc,
      status: p.status, proposal_type: p.type as any, threshold: p.threshold ?? 50,
      impact_level: (p.impact ?? null) as any, tags: p.tags ?? [],
      pinned: p.pinned ?? false, created_at: ago(p.createdDaysAgo),
      closes_at: closesAt, closed_at: p.closedAtDaysAgo !== undefined ? ago(p.closedAtDaysAgo) : null,
    });
  }));

  // Multiple-choice options
  const gfOptionsMap = new Map<number, ProposalOption[]>();
  for (let i = 0; i < GF_PROPOSALS.length; i++) {
    const opts = GF_PROPOSALS[i].options;
    if (opts) {
      const saved = await em.save(ProposalOption, opts.map((text, pos) =>
        em.create(ProposalOption, { id: uid(), proposal_id: gfProposals[i].id, organisation_id: gfOrg.id, text, position: pos }),
      ));
      gfOptionsMap.set(i, saved);
    }
  }

  const gfVoters = gfUsers.slice(0, 18); // approved members only
  const gfVotes = await seedVotes(em, gfProposals, GF_PROPOSALS, gfOrg.id, gfVoters, oli, new Set([0, 5, 8, 14]), gfOptionsMap);

  const gfComments = await seedComments(em, gfProposals, gfOrg.id, gfUsers, GF_COMMENTS);

  // Comment reactions
  const nonOliVoters = gfVoters.filter(u => u.id !== oli.id);
  const commentReactions: any[] = [];
  for (const cIdx of [0, 2, 8, 12, 17]) {
    for (const reactor of sample(nonOliVoters, 3 + Math.floor(Math.random() * 3))) {
      commentReactions.push(em.create(CommentReaction, { id: uid(), comment_id: gfComments[cIdx].id, organisation_id: gfOrg.id, user_id: reactor.id, emoji: pick(['👍', '❤️', '👏']) }));
    }
  }
  await em.save(CommentReaction, commentReactions);

  // Arguments
  await em.save(Argument, GF_ARGUMENTS.map(([pIdx, uIdx, side, body]) =>
    em.create(Argument, { id: uid(), proposal_id: gfProposals[pIdx].id, organisation_id: gfOrg.id, author_id: gfUsers[uIdx].id, side, body }),
  ));

  // Endorsements
  const gfEndorsements: any[] = [];
  for (const pIdx of [0, 1, 5, 6, 7, 8, 10, 14, 15, 18]) {
    for (const endorser of sample(nonOliVoters, 2 + Math.floor(Math.random() * 4))) {
      gfEndorsements.push(em.create(Endorsement, { id: uid(), proposal_id: gfProposals[pIdx].id, organisation_id: gfOrg.id, user_id: endorser.id }));
    }
  }
  await em.save(Endorsement, gfEndorsements);

  // Veto on membership fee proposal
  await em.save(Veto, [em.create(Veto, {
    id: uid(), proposal_id: gfProposals[14].id, organisation_id: gfOrg.id, author_id: gfUsers[1].id,
    reason: 'A fee increase of this magnitude warrants broader consultation before we vote. I propose we survey all members on their preferred approach and revisit at the AGM with full data on hardship waiver demand.',
  })]);

  // Delegations
  await em.save(Delegation, GF_DELEGATIONS.map(([di, de, ti, w]) =>
    em.create(Delegation, { id: uid(), organisation_id: gfOrg.id, delegator_id: gfUsers[di].id, delegate_id: gfUsers[de].id, topic_id: ti !== null ? gfTopics[ti].id : null, weight_fraction: w }),
  ));

  // Proposal reactions
  await em.save(ProposalReaction, ([
    [0, 1, '👍'], [0, 3, '👍'], [0, 9, '❤️'], [0, 6, '👍'], [0, 4, '🙌'],
    [5, 9, '🌱'], [5, 13, '🌱'], [5, 12, '👍'], [5, 7, '❤️'],
    [7, 13, '👍'], [7, 9, '❤️'], [7, 3, '👍'],
    [8, 7, '👍'], [8, 17, '👍'], [8, 3, '🙏'], [8, 12, '👍'],
    [18, 17, '👍'], [18, 7, '👍'], [18, 3, '👀'], [18, 9, '🤔'],
  ] as [number, number, string][]).map(([pIdx, uIdx, emoji]) =>
    em.create(ProposalReaction, { id: uid(), proposal_id: gfProposals[pIdx].id, organisation_id: gfOrg.id, user_id: gfUsers[uIdx].id, emoji }),
  ));

  // Proposal links
  await em.save(ProposalLink, [
    em.create(ProposalLink, { id: uid(), source_proposal_id: gfProposals[8].id, target_proposal_id: gfProposals[20].id, link_type: 'related_to', organisation_id: gfOrg.id, created_by: gfUsers[7].id }),
    em.create(ProposalLink, { id: uid(), source_proposal_id: gfProposals[14].id, target_proposal_id: gfProposals[16].id, link_type: 'related_to', organisation_id: gfOrg.id, created_by: gfUsers[5].id }),
  ]);

  // ── Republic of Verdania ─────────────────────────────────────────────────

  console.log('Seeding Republic of Verdania...');
  const vdOrg = await em.save(Organisation, em.create(Organisation, {
    id: uid(), name: 'Republic of Verdania', slug: 'republic-of-verdania',
    description: 'The National Assembly of the Republic of Verdania. Legislative votes, treaty ratifications, and constitutional matters conducted under liquid democratic principles.',
    invite_token: uid(), proposal_creation_role: 'moderator', topic_creation_role: 'admin',
    default_voting_duration_days: 14, default_threshold: 60, voting_visibility: 'public',
    is_public: true, veto_role: 'admin', min_endorsements: 1, require_member_approval: true,
    weight_mode: 'manual',
    proposal_templates: [
      { id: uid(), name: 'Legislative bill', description: 'Template for standard legislative bills.', proposal_type: 'standard', threshold: 60 },
      { id: uid(), name: 'Constitutional amendment', description: 'Requires 75% supermajority.', proposal_type: 'standard', threshold: 75 },
      { id: uid(), name: 'Emergency motion', description: 'Expedited procedure for urgent matters.', proposal_type: 'standard', threshold: 50 },
    ],
  }));

  // Oli joins Verdania as a citizen-observer
  const vdMemberships = [
    ...VD_MEMBERSHIPS.map(([idx, role, weight, status]) =>
      em.create(Membership, { id: uid(), organisation_id: vdOrg.id, user_id: vdUsers[idx].id, role: role as any, weight, status: status as any, invited_by: vdUsers[0].id }),
    ),
    em.create(Membership, { id: uid(), organisation_id: vdOrg.id, user_id: oli.id, role: 'member', weight: 1, status: 'approved', invited_by: vdUsers[0].id }),
  ];
  await em.save(Membership, vdMemberships);

  const vdTopics = await em.save(Topic, VD_TOPICS.map(t =>
    em.create(Topic, { id: uid(), organisation_id: vdOrg.id, ...t }),
  ));

  const vdProposals = await em.save(Proposal, VD_PROPOSALS.map(p => {
    const closesAt = p.closesInDays !== undefined ? (p.closesInDays > 0 ? fromNow(p.closesInDays) : ago(Math.abs(p.closesInDays))) : null;
    return em.create(Proposal, {
      id: uid(), organisation_id: vdOrg.id, topic_id: vdTopics[p.topicIdx].id,
      author_id: vdUsers[p.authorIdx].id, title: p.title, description: p.desc,
      status: p.status, proposal_type: p.type as any, threshold: p.threshold ?? 60,
      impact_level: (p.impact ?? null) as any, tags: p.tags ?? [],
      created_at: ago(p.createdDaysAgo), closes_at: closesAt,
      closed_at: p.closedAtDaysAgo !== undefined ? ago(p.closedAtDaysAgo) : null,
    });
  }));

  const vdOptionsMap = new Map<number, ProposalOption[]>();
  for (let i = 0; i < VD_PROPOSALS.length; i++) {
    const opts = VD_PROPOSALS[i].options;
    if (opts) {
      vdOptionsMap.set(i, await em.save(ProposalOption, opts.map((text, pos) =>
        em.create(ProposalOption, { id: uid(), proposal_id: vdProposals[i].id, organisation_id: vdOrg.id, text, position: pos }),
      )));
    }
  }

  // Oli has voted on proposals 2 and 5 (the closed ones), not on the contested open ones
  const vdVoters = [...vdUsers, oli];
  await seedVotes(em, vdProposals, VD_PROPOSALS, vdOrg.id, vdVoters, oli, new Set([2, 5]), vdOptionsMap);
  await seedComments(em, vdProposals, vdOrg.id, vdUsers, VD_COMMENTS);

  // ── Sunflower Workers' Co-operative ──────────────────────────────────────

  console.log("Seeding Sunflower Workers' Co-operative...");
  const sfOrg = await em.save(Organisation, em.create(Organisation, {
    id: uid(), name: "Sunflower Workers' Co-operative", slug: 'sunflower-workers-coop',
    description: "A worker-owned consultancy making collective decisions about our business. All members have equal votes. Surplus is distributed to workers, not shareholders.",
    invite_token: uid(), proposal_creation_role: 'member', topic_creation_role: 'member',
    default_voting_duration_days: 7, default_threshold: 60, voting_visibility: 'public',
    is_public: false, veto_role: 'admin', min_endorsements: 0, require_member_approval: false,
    weight_mode: 'manual',
  }));

  await em.save(Membership, SF_MEMBERSHIPS.map(([idx, role, weight, status]) =>
    em.create(Membership, { id: uid(), organisation_id: sfOrg.id, user_id: sfUsers[idx].id, role: role as any, weight, status: status as any }),
  ));

  const sfTopics = await em.save(Topic, SF_TOPICS.map(t =>
    em.create(Topic, { id: uid(), organisation_id: sfOrg.id, ...t }),
  ));

  const sfProposals = await em.save(Proposal, SF_PROPOSALS.map(p => {
    const closesAt = p.closesInDays !== undefined ? (p.closesInDays > 0 ? fromNow(p.closesInDays) : ago(Math.abs(p.closesInDays))) : null;
    return em.create(Proposal, {
      id: uid(), organisation_id: sfOrg.id, topic_id: sfTopics[p.topicIdx].id,
      author_id: sfUsers[p.authorIdx].id, title: p.title, description: p.desc,
      status: p.status, proposal_type: p.type as any, threshold: p.threshold ?? 60,
      tags: p.tags ?? [], created_at: ago(p.createdDaysAgo), closes_at: closesAt,
      closed_at: p.closedAtDaysAgo !== undefined ? ago(p.closedAtDaysAgo) : null,
    });
  }));

  const sfOptionsMap = new Map<number, ProposalOption[]>();
  for (let i = 0; i < SF_PROPOSALS.length; i++) {
    const opts = SF_PROPOSALS[i].options;
    if (opts) {
      sfOptionsMap.set(i, await em.save(ProposalOption, opts.map((text, pos) =>
        em.create(ProposalOption, { id: uid(), proposal_id: sfProposals[i].id, organisation_id: sfOrg.id, text, position: pos }),
      )));
    }
  }

  await seedVotes(em, sfProposals, SF_PROPOSALS, sfOrg.id, sfUsers, null, new Set(), sfOptionsMap);
  await seedComments(em, sfProposals, sfOrg.id, sfUsers, SF_COMMENTS);

  // ── Ashfield District Council ────────────────────────────────────────────

  console.log('Seeding Ashfield District Council...');
  const acOrg = await em.save(Organisation, em.create(Organisation, {
    id: uid(), name: 'Ashfield District Council', slug: 'ashfield-district-council',
    description: 'The democratic decision-making platform for Ashfield District Council. Councillors vote on planning applications, budget motions, and policy matters.',
    invite_token: uid(), proposal_creation_role: 'member', topic_creation_role: 'moderator',
    default_voting_duration_days: 21, default_threshold: 50, voting_visibility: 'public',
    is_public: true, veto_role: 'admin', min_endorsements: 1, require_member_approval: true,
    weight_mode: 'manual',
  }));

  await em.save(Membership, AC_MEMBERSHIPS.map(([idx, role, weight, status]) =>
    em.create(Membership, { id: uid(), organisation_id: acOrg.id, user_id: acUsers[idx].id, role: role as any, weight, status: status as any, invited_by: acUsers[0].id }),
  ));

  const acTopics = await em.save(Topic, AC_TOPICS.map(t =>
    em.create(Topic, { id: uid(), organisation_id: acOrg.id, ...t }),
  ));

  const acProposals = await em.save(Proposal, AC_PROPOSALS.map(p => {
    const closesAt = p.closesInDays !== undefined ? (p.closesInDays > 0 ? fromNow(p.closesInDays) : ago(Math.abs(p.closesInDays))) : null;
    return em.create(Proposal, {
      id: uid(), organisation_id: acOrg.id, topic_id: acTopics[p.topicIdx].id,
      author_id: acUsers[p.authorIdx].id, title: p.title, description: p.desc,
      status: p.status, proposal_type: p.type as any, threshold: p.threshold ?? 50,
      impact_level: (p.impact ?? null) as any, tags: p.tags ?? [],
      created_at: ago(p.createdDaysAgo), closes_at: closesAt,
      closed_at: p.closedAtDaysAgo !== undefined ? ago(p.closedAtDaysAgo) : null,
    });
  }));

  await seedVotes(em, acProposals, AC_PROPOSALS, acOrg.id, acUsers, null, new Set(), new Map());
  await seedComments(em, acProposals, acOrg.id, acUsers, AC_COMMENTS);

  // ── Northlight Digital ───────────────────────────────────────────────────

  console.log('Seeding Northlight Digital...');
  const nlOrg = await em.save(Organisation, em.create(Organisation, {
    id: uid(), name: 'Northlight Digital', slug: 'northlight-digital',
    description: 'Internal governance for Northlight Digital. Engineering decisions, culture, and company direction voted on by the whole team.',
    invite_token: uid(), proposal_creation_role: 'member', topic_creation_role: 'member',
    default_voting_duration_days: 7, default_threshold: 60, voting_visibility: 'public',
    is_public: false, veto_role: 'admin', min_endorsements: 0, require_member_approval: false,
    weight_mode: 'manual', plan: 'pro' as any,
    allowed_email_domains: ['northlight.io'],
  }));

  await em.save(Membership, NL_MEMBERSHIPS.map(([idx, role, weight, status]) =>
    em.create(Membership, { id: uid(), organisation_id: nlOrg.id, user_id: nlUsers[idx].id, role: role as any, weight, status: status as any }),
  ));

  const nlTopics = await em.save(Topic, NL_TOPICS.map(t =>
    em.create(Topic, { id: uid(), organisation_id: nlOrg.id, ...t }),
  ));

  const nlProposals = await em.save(Proposal, NL_PROPOSALS.map(p => {
    const closesAt = p.closesInDays !== undefined ? (p.closesInDays > 0 ? fromNow(p.closesInDays) : ago(Math.abs(p.closesInDays))) : null;
    return em.create(Proposal, {
      id: uid(), organisation_id: nlOrg.id, topic_id: nlTopics[p.topicIdx].id,
      author_id: nlUsers[p.authorIdx].id, title: p.title, description: p.desc,
      status: p.status, proposal_type: p.type as any, threshold: p.threshold ?? 60,
      impact_level: (p.impact ?? null) as any, tags: p.tags ?? [],
      anonymous_voting: p.anonymousVoting ?? false,
      created_at: ago(p.createdDaysAgo), closes_at: closesAt,
      closed_at: p.closedAtDaysAgo !== undefined ? ago(p.closedAtDaysAgo) : null,
    });
  }));

  await seedVotes(em, nlProposals, NL_PROPOSALS, nlOrg.id, nlUsers, null, new Set(), new Map());
  await seedComments(em, nlProposals, nlOrg.id, nlUsers, NL_COMMENTS);

  // ── Greenfield-specific extras ───────────────────────────────────────────

  // Notifications for Oli (Greenfield + one from Verdania)
  console.log('Seeding notifications...');
  const notifDefs = [
    // Unread — Greenfield
    { type: 'proposal.opened',       actor_id: gfUsers[1].id,  target_type: 'proposal', target_id: gfProposals[1].id,  daysAgo: 3,   read: false, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[1].title } },
    { type: 'comment.posted',        actor_id: gfUsers[8].id,  target_type: 'comment',  target_id: gfComments[5].id,   daysAgo: 2,   read: false, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[1].title } },
    { type: 'proposal.vote_reminder',actor_id: null,            target_type: 'proposal', target_id: gfProposals[8].id,  daysAgo: 1,   read: false, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[8].title, closesInDays: 4 } },
    { type: 'proposal.vote_reminder',actor_id: null,            target_type: 'proposal', target_id: gfProposals[14].id, daysAgo: 0.5, read: false, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[14].title, closesInDays: 2 } },
    { type: 'member.joined',         actor_id: gfUsers[18].id, target_type: null,        target_id: null,               daysAgo: 1,   read: false, org_id: gfOrg.id, meta: { memberName: gfUsers[18].name } },
    { type: 'member.joined',         actor_id: gfUsers[19].id, target_type: null,        target_id: null,               daysAgo: 0.5, read: false, org_id: gfOrg.id, meta: { memberName: gfUsers[19].name } },
    // Unread — Verdania
    { type: 'proposal.vote_reminder',actor_id: null,            target_type: 'proposal', target_id: vdProposals[4].id,  daysAgo: 0.3, read: false, org_id: vdOrg.id, meta: { proposalTitle: vdProposals[4].title, closesInDays: 0 } },
    // Read — Greenfield
    { type: 'proposal.opened',       actor_id: gfUsers[7].id,  target_type: 'proposal', target_id: gfProposals[8].id,  daysAgo: 10, read: true, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[8].title } },
    { type: 'proposal.closed',       actor_id: null,            target_type: 'proposal', target_id: gfProposals[2].id,  daysAgo: 31, read: true, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[2].title } },
    { type: 'proposal.closed',       actor_id: null,            target_type: 'proposal', target_id: gfProposals[9].id,  daysAgo: 21, read: true, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[9].title } },
    { type: 'delegation.added',      actor_id: gfUsers[4].id,  target_type: null,        target_id: null,               daysAgo: 15, read: true, org_id: gfOrg.id, meta: { topicName: gfTopics[0].name } },
    { type: 'comment.mention',       actor_id: gfUsers[10].id, target_type: 'comment',   target_id: gfComments[2].id,   daysAgo: 3,  read: true, org_id: gfOrg.id, meta: { proposalTitle: gfProposals[0].title } },
  ];
  await em.save(Notification, notifDefs.map(n => em.create(Notification, {
    id: uid(), user_id: oli.id, org_id: n.org_id, type: n.type as any,
    actor_id: n.actor_id, target_type: n.target_type, target_id: n.target_id,
    metadata: n.meta, created_at: ago(n.daysAgo), read_at: n.read ? ago(n.daysAgo - 0.1) : null,
  })));

  // Audit log — Greenfield
  console.log('Seeding audit log...');
  await em.save(AuditLogEntry, [
    { actor: gfUsers[0],  action: 'org.created',          targetType: 'organisation', targetId: gfOrg.id,            daysAgo: 180, meta: { name: gfOrg.name } },
    { actor: gfUsers[0],  action: 'member.role_changed',  targetType: 'user',         targetId: gfUsers[1].id,       daysAgo: 170, meta: { from: 'member', to: 'moderator', memberName: gfUsers[1].name } },
    { actor: gfUsers[0],  action: 'member.role_changed',  targetType: 'user',         targetId: gfUsers[2].id,       daysAgo: 165, meta: { from: 'member', to: 'moderator', memberName: gfUsers[2].name } },
    { actor: gfUsers[0],  action: 'member.weight_changed',targetType: 'user',         targetId: gfUsers[1].id,       daysAgo: 160, meta: { from: 1, to: 2, memberName: gfUsers[1].name } },
    { actor: gfUsers[0],  action: 'member.weight_changed',targetType: 'user',         targetId: gfUsers[5].id,       daysAgo: 155, meta: { from: 1, to: 2, memberName: gfUsers[5].name } },
    { actor: gfUsers[1],  action: 'member.approved',      targetType: 'user',         targetId: gfUsers[14].id,      daysAgo: 90,  meta: { memberName: gfUsers[14].name } },
    { actor: gfUsers[0],  action: 'proposal.pinned',      targetType: 'proposal',     targetId: gfProposals[0].id,   daysAgo: 5,   meta: { title: gfProposals[0].title } },
    { actor: gfUsers[1],  action: 'veto.placed',          targetType: 'proposal',     targetId: gfProposals[14].id,  daysAgo: 8,   meta: { title: gfProposals[14].title } },
    { actor: gfUsers[0],  action: 'proposal.withdrawn',   targetType: 'proposal',     targetId: gfProposals[17].id,  daysAgo: 20,  meta: { title: gfProposals[17].title } },
    { actor: gfUsers[2],  action: 'comment.hidden',       targetType: 'comment',      targetId: gfComments[6].id,    daysAgo: 1,   meta: { reason: 'Off-topic — moved to community forum.' } },
  ].map(e => em.create(AuditLogEntry, {
    org_id: gfOrg.id, actor_id: e.actor.id, action: e.action,
    target_type: e.targetType, target_id: e.targetId, metadata: e.meta, created_at: ago(e.daysAgo),
  })));

  await dataSource.destroy();

  const allUsers = [...gfUsers, ...vdUsers, ...sfUsers, ...acUsers, ...nlUsers];
  const allProposals = [...gfProposals, ...vdProposals, ...sfProposals, ...acProposals, ...nlProposals];
  const countByStatus = (ps: Proposal[], defs: ProposalDef[], s: string) => ps.filter((_, i) => defs[i].status === s).length;

  console.log('\n✓ Seed complete');
  console.log(`  ${allUsers.length} users across 5 organisations`);
  console.log(`  Greenfield Residents' Association — ${gfProposals.length} proposals (public, neighbourhood)`);
  console.log(`  Republic of Verdania             — ${vdProposals.length} proposals (public, national government)`);
  console.log(`  Sunflower Workers' Co-operative  — ${sfProposals.length} proposals (private, worker co-op)`);
  console.log(`  Ashfield District Council        — ${acProposals.length} proposals (public, local government)`);
  console.log(`  Northlight Digital               — ${nlProposals.length} proposals (private, company)`);
  console.log(`  ${allProposals.length} proposals total`);
  console.log(`  ${notifDefs.length} notifications for ${oli.name} (${notifDefs.filter(n => !n.read).length} unread)`);
  console.log(`  Oli is a member of Greenfield RA (admin) and Republic of Verdania (citizen)`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
