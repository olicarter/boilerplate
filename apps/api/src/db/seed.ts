import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

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

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/ripple',
  entities: [
    User, Organisation, Membership, Topic, Proposal, ProposalOption,
    ProposalReaction, ProposalLink, Delegation, Vote, Endorsement,
    Veto, Argument, Comment, CommentReaction, Notification, AuditLogEntry, Credential,
  ],
});

// ── helpers ───────────────────────────────────────────────────────────────────

function uid() { return randomUUID(); }

function ago(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function fromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function weightedChoice(choices: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < choices.length; i++) {
    r -= weights[i];
    if (r <= 0) return choices[i];
  }
  return choices[choices.length - 1];
}

// ── static data ───────────────────────────────────────────────────────────────

const USER_ROWS = [
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

// [userIndex, role, weight, status]
const MEMBERSHIP_ROWS: [number, string, number, string][] = [
  [0,  'admin',     1, 'approved'],
  [1,  'moderator', 2, 'approved'],  // council liaison — extra weight
  [2,  'moderator', 1, 'approved'],
  [3,  'member',    1, 'approved'],
  [4,  'member',    1, 'approved'],
  [5,  'member',    2, 'approved'],  // treasurer — extra weight
  [6,  'member',    1, 'approved'],
  [7,  'member',    1, 'approved'],
  [8,  'member',    1, 'approved'],
  [9,  'member',    1, 'approved'],
  [10, 'member',    1, 'approved'],
  [11, 'member',    1, 'approved'],
  [12, 'member',    1, 'approved'],
  [13, 'member',    1, 'approved'],
  [14, 'member',    1, 'approved'],
  [15, 'observer',  1, 'approved'],
  [16, 'observer',  1, 'approved'],
  [17, 'member',    1, 'approved'],
  [18, 'member',    1, 'pending'],   // awaiting approval
  [19, 'member',    1, 'pending'],   // awaiting approval
];

const TOPIC_ROWS = [
  { name: 'Planning & Development',    description: 'Planning applications, building projects, and neighbourhood design.' },
  { name: 'Environment & Green Spaces', description: 'Parks, trees, biodiversity, and environmental initiatives.' },
  { name: 'Transport & Parking',       description: 'Roads, parking, cycling, and public transport.' },
  { name: 'Community Events',          description: 'Fairs, markets, social events, and community activities.' },
  { name: 'Finance & Budget',          description: 'Association finances, fees, and budget allocation.' },
  { name: 'Safety & Security',         description: 'Neighbourhood watch, street lighting, and community safety.' },
];

interface ProposalDef {
  title: string;
  desc: string;
  topicIdx: number;
  status: 'open' | 'closed' | 'draft' | 'withdrawn';
  type: string;
  threshold?: number;
  impact?: string;
  createdDaysAgo: number;
  closesInDays?: number;
  closedAtDaysAgo?: number;
  authorIdx: number;
  tags?: string[];
  pinned?: boolean;
  voteDistribution?: 'pass' | 'reject' | 'contested';
}

const PROPOSAL_DEFS: ProposalDef[] = [
  // ── Planning & Development ────────────────────────────────────────────────
  {
    title: 'Convert the old library into a community hub',
    desc: `The Greenfield Road library building has been vacant since the council closed it in 2022. This proposal asks the association to formally lobby the council to repurpose it as a multi-use community hub — incorporating a café, affordable meeting rooms, and space for local groups.\n\nA feasibility study by a neighbouring association found similar buildings become self-funding within three years through room hire income.`,
    topicIdx: 0, status: 'open', type: 'standard', threshold: 60, impact: 'high',
    createdDaysAgo: 5, closesInDays: 9, authorIdx: 0, pinned: true,
    tags: ['community-hub', 'library'],
  },
  {
    title: 'Object to planning application 2024/0847 — Oak Street',
    desc: `Planning application 2024/0847 proposes converting the former bank at 14–18 Oak Street into six ground-floor commercial units and twelve residential flats. Resident concerns:\n\n- Increased traffic on an already congested road\n- Loss of the green buffer zone at the rear\n- Only 6 parking spaces for 12 flats\n\nThis proposal is to submit a formal objection to the planning committee before the consultation window closes.`,
    topicIdx: 0, status: 'open', type: 'standard', threshold: 50, impact: 'high',
    createdDaysAgo: 3, closesInDays: 11, authorIdx: 1,
    tags: ['planning', 'oak-street'],
  },
  {
    title: 'Install street lighting on Elm Close',
    desc: 'Elm Close has had no working street lights since October 2023. Despite two reports to the council, repairs were not carried out. This proposal authorised the association to engage a solicitor to formally demand the council fulfil its statutory duty to maintain highway lighting.',
    topicIdx: 0, status: 'closed', type: 'standard', threshold: 50,
    createdDaysAgo: 45, closesInDays: -31, closedAtDaysAgo: 31, authorIdx: 2,
    tags: ['lighting', 'council'], voteDistribution: 'pass',
  },
  {
    title: 'Require cycle storage in all new residential developments',
    desc: 'Amend our submission to the neighbourhood plan to require secure, weatherproof cycle storage in all new residential developments of five or more units. The current plan recommends but does not require this, so developers routinely omit it.',
    topicIdx: 0, status: 'draft', type: 'standard', threshold: 60, impact: 'medium',
    createdDaysAgo: 1, authorIdx: 6, tags: ['cycling', 'planning'],
  },

  // ── Environment & Green Spaces ────────────────────────────────────────────
  {
    title: 'Plant 200 trees along the high street and park boundary',
    desc: "Working with the council's Urban Greening team, this proposal secured agreement to plant 200 semi-mature trees over two planting seasons. The council provides the trees; the association organises volunteer planting days and ongoing maintenance.",
    topicIdx: 1, status: 'closed', type: 'standard', threshold: 50,
    createdDaysAgo: 60, closesInDays: -46, closedAtDaysAgo: 46, authorIdx: 13,
    tags: ['trees', 'environment'], voteDistribution: 'pass',
  },
  {
    title: 'Community compost and food-waste scheme',
    desc: `Many residents have no food waste collection. This proposal would set up 12 community compost bays across the estate, maintained on a volunteer rota. Any resident can contribute kitchen and garden waste; the resulting compost is used in communal gardens.\n\nEstimated setup cost: £800. Ongoing cost: minimal — tools, bags, and an annual volunteer training session.`,
    topicIdx: 1, status: 'open', type: 'standard', threshold: 50, impact: 'medium',
    createdDaysAgo: 7, closesInDays: 7, authorIdx: 9, tags: ['composting', 'environment'],
  },
  {
    title: 'Apply for Green Flag Award status for Greenfield Park',
    desc: 'The Green Flag Award is the international quality mark for parks and green spaces. Achieving it increases grant eligibility and provides a framework for ongoing park management. We have the volunteer capacity and management plan ready.',
    topicIdx: 1, status: 'open', type: 'temperature_check',
    createdDaysAgo: 1, closesInDays: 13, authorIdx: 13, tags: ['parks', 'awards'],
  },
  {
    title: 'Ban single-use plastics at association-organised events',
    desc: 'From the 2025 summer fair onwards, all association events would use only reusable or certified compostable alternatives for cups, plates, and cutlery. Any vendor trading at an association event would be required to comply as a condition of their licence.',
    topicIdx: 1, status: 'open', type: 'discussion',
    createdDaysAgo: 2, closesInDays: 12, authorIdx: 13, tags: ['plastics', 'events'],
  },

  // ── Transport & Parking ───────────────────────────────────────────────────
  {
    title: 'Petition the council for a 20mph zone on residential streets',
    desc: `Following two near-miss incidents involving children on Maple Avenue and Birchwood Road, this proposal asks the association to petition the council to implement a 20mph zone across the residential area bounded by the high street, the park, and the railway line.\n\nEvidence from Bristol and Edinburgh shows similar schemes reduce casualties by 20–40%.`,
    topicIdx: 2, status: 'open', type: 'standard', threshold: 60, impact: 'high',
    createdDaysAgo: 10, closesInDays: 4, authorIdx: 7,
    tags: ['speed-limit', 'safety'], voteDistribution: 'contested',
  },
  {
    title: 'Introduce permit parking on weekdays 8am–6pm',
    desc: 'Commuter parking from the nearby station displaces residents during weekday hours. This proposal asked the council to designate the streets around the station as permit-only during peak hours. Annual permit cost to residents: £50.',
    topicIdx: 2, status: 'closed', type: 'standard', threshold: 60,
    createdDaysAgo: 35, closesInDays: -21, closedAtDaysAgo: 21, authorIdx: 8,
    tags: ['parking', 'station'], voteDistribution: 'reject',
  },
  {
    title: 'Install EV charging points in the main car park',
    desc: 'The main car park has 40 spaces. This proposal is to apply for an OZEV grant to install six 7kW EV charging points at no cost to the association. A small per-kWh charge would generate modest income to offset running costs.',
    topicIdx: 2, status: 'open', type: 'standard', threshold: 50, impact: 'medium',
    createdDaysAgo: 8, closesInDays: 6, authorIdx: 6, tags: ['ev-charging', 'car-park'],
  },

  // ── Community Events ──────────────────────────────────────────────────────
  {
    title: 'Summer fair 2025 — budget allocation',
    desc: "We need to agree a budget for the 2025 summer fair. Last year's event attracted over 400 residents and broke even. Vote for your preferred tier — each option includes a breakdown of what's covered.",
    topicIdx: 3, status: 'open', type: 'multiple_choice', threshold: 50,
    createdDaysAgo: 6, closesInDays: 8, authorIdx: 4, tags: ['summer-fair', 'budget'],
  },
  {
    title: "Monthly farmers' market — preferred day",
    desc: "We've secured a regular slot in the market calendar and vendors are ready to commit. Before we confirm the day with the organiser, we'd like to know residents' preference.",
    topicIdx: 3, status: 'open', type: 'multiple_choice', threshold: 50,
    createdDaysAgo: 4, closesInDays: 10, authorIdx: 4, tags: ['farmers-market'],
  },
  {
    title: 'Extend community centre opening hours on Friday evenings',
    desc: 'The youth club, board games society, and craft group have all asked for an extra two hours on Fridays. Staffing cost: approximately £60/week. The community centre would offset this by opening the café for the extended period.',
    topicIdx: 3, status: 'closed', type: 'standard', threshold: 50,
    createdDaysAgo: 28, closesInDays: -14, closedAtDaysAgo: 14, authorIdx: 3,
    tags: ['community-centre', 'events'], voteDistribution: 'pass',
  },

  // ── Finance & Budget ──────────────────────────────────────────────────────
  {
    title: 'Raise annual membership fee from £10 to £20',
    desc: `The membership fee has not increased since 2017. Running costs — insurance, website, printing, and room hire — have risen by roughly 60% since then. At £10/year, the association runs at a small deficit.\n\nRaising to £20 would restore surplus and build a modest reserves buffer. A hardship waiver would remain available for those who need it.`,
    topicIdx: 4, status: 'open', type: 'standard', threshold: 60, impact: 'medium',
    createdDaysAgo: 12, closesInDays: 2, authorIdx: 5,
    tags: ['membership', 'finance'], voteDistribution: 'contested',
  },
  {
    title: 'Emergency repairs to the bowling green drainage',
    desc: 'The bowling green drainage failed over last winter. Without repairs before spring, the green will be unplayable for the season. This proposal releases £2,400 from the general reserve for urgent remediation — one contractor has already provided a quote.',
    topicIdx: 4, status: 'open', type: 'standard', threshold: 50, impact: 'medium',
    createdDaysAgo: 3, closesInDays: 11, authorIdx: 5,
    tags: ['bowling-green', 'maintenance'],
  },
  {
    title: 'Annual accounts approval — financial year 2024',
    desc: 'The audited accounts for the year ending 31 December 2024 are presented for member approval. Income: £8,340. Expenditure: £7,912. Surplus: £428. Full accounts are available at the community centre reception and on the website.',
    topicIdx: 4, status: 'closed', type: 'standard', threshold: 50,
    createdDaysAgo: 50, closesInDays: -36, closedAtDaysAgo: 36, authorIdx: 5,
    tags: ['accounts', 'finance'], voteDistribution: 'pass',
  },
  {
    title: 'Procure a new association website and booking system',
    desc: "The current website is eight years old and not mobile-friendly. This proposal was for up to £3,000 to commission a replacement with integrated room booking. Withdrawn after Noel Ferreira volunteered to build it pro bono.",
    topicIdx: 4, status: 'withdrawn', type: 'standard',
    createdDaysAgo: 20, authorIdx: 0, tags: ['website', 'technology'],
  },

  // ── Safety & Security ─────────────────────────────────────────────────────
  {
    title: "Install CCTV cameras near the children's playground",
    desc: `Following reports of antisocial behaviour near the playground after dark, this proposal is to install two CCTV cameras covering the playground entrance and the adjacent footpath. Footage would be retained for 28 days under an ICO-compliant policy and accessible to Greenfield police SNT.\n\nMembers are encouraged to read the attached privacy impact assessment before voting.`,
    topicIdx: 5, status: 'open', type: 'standard', threshold: 60, impact: 'medium',
    createdDaysAgo: 9, closesInDays: 5, authorIdx: 17,
    tags: ['cctv', 'playground'], voteDistribution: 'contested',
  },
  {
    title: 'Launch a neighbourhood watch scheme',
    desc: 'Establish a formal neighbourhood watch linked to the Greenfield police safer neighbourhood team. The scheme involves street coordinators, a verified-residents-only messaging group, and an annual meeting with officers to share crime patterns and prevention advice.',
    topicIdx: 5, status: 'closed', type: 'standard', threshold: 50,
    createdDaysAgo: 55, closesInDays: -41, closedAtDaysAgo: 41, authorIdx: 17,
    tags: ['neighbourhood-watch', 'police'], voteDistribution: 'pass',
  },
  {
    title: 'Traffic calming measures on Maple Avenue',
    desc: 'Commission a traffic survey on Maple Avenue with a view to recommending speed humps, a raised table at the junction with Cedar Lane, or a road narrowing scheme. This proposal is a first step — the survey findings would come back to members for a separate vote before any works are committed.',
    topicIdx: 5, status: 'draft', type: 'standard', impact: 'medium',
    createdDaysAgo: 2, authorIdx: 7, tags: ['traffic', 'maple-avenue'],
  },
];

// Comments: [proposalIdx, authorIdx, body, daysAgo, pinned?]
const COMMENT_DEFS: Array<[number, number, string, number, boolean?]> = [
  // Convert library (P0)
  [0,  1,  "I've already spoken informally to the council estates team. They're open to the idea — the building costs them around £18,000 a year in maintenance. They'd be keen to offload it with the right proposal.", 4],
  [0,  3,  "Love this. There's a real gap for affordable meeting space locally — the only options at the moment are pub function rooms, which doesn't work for everyone.", 4],
  [0,  10, "Worth flagging: any change of use from D1 to mixed use will need a planning application. Happy to help navigate that if this passes — it's exactly the kind of thing I do for work.", 3, true],
  [0,  11, "Architect's note: the building has solid bones and is well-suited to subdivision. The main costs would be a kitchen fit-out for the café and acoustic treatment in the larger meeting room.", 2],
  [0,  0,  "Thanks all — good to have that expertise on hand. @James Okafor I'll take you up on that offer if we get the green light.", 1],

  // Oak Street planning objection (P1)
  [1,  8,  "I attended the pre-application consultation last month. The developers know about the parking concerns but argue the council's own standards allow reduced provision in town-centre locations. We'll need to challenge that position specifically.", 2],
  [1,  11, "From a design standpoint the proposed massing is fairly sensitive to the street scene. The parking situation is the real issue — six spaces genuinely isn't workable for twelve units.", 2],
  [1,  2,  "As a business on Oak Street, my bigger concern is construction disruption rather than the end result. An 18-month build on a busy road would be rough for traders. Can we condition the build programme in our objection?", 1],

  // 20mph (P8)
  [8,  7,  "The near-miss in March involved a child from the school I'm governor at. The road safety data is very clear — 85% of pedestrians struck at 30mph suffer serious injury; at 20mph it drops below 15%.", 9],
  [8,  17, "As someone who worked traffic for 20 years — the speed data supports this, but the key is enforcement. Average speed cameras are far more effective than signs alone. Should we ask for those too?", 7],
  [8,  8,  "Not opposed, but I'd like to see evidence it actually changes behaviour rather than just changing the number on a sign. The Bristol 20mph zone data is genuinely mixed.", 5],
  [8,  12, "The Bristol data is mixed because it was implemented without traffic calming measures. Schemes with physical measures consistently show significant speed reduction. We should ask for both.", 3],

  // Raise membership fee (P14)
  [14, 5,  "I've put the full breakdown in the accounts appendix linked from the proposal. The numbers aren't dramatic — we're talking about a £428 deficit last year — but without the increase, that erodes the reserve over five or six years.", 11, true],
  [14, 4,  "I've been a member for 22 years at £10. A doubling in one go feels sharp. Could we phase it — £15 this year, £20 next?", 10],
  [14, 2,  "The hardship waiver is important. Can we make the application process simple? If people have to write in and justify themselves, they just won't bother.", 8],
  [14, 5,  "Agreed @Ben Nakamura — I'm proposing the waiver is available on request, no explanation required. Just tick a box on the renewal form.", 7],
  [14, 14, "I moved here 18 months ago and the value this association provides is genuinely great. Happy to pay £20. Could we also add a 'pay it forward' option for people who want to sponsor a waiver for someone?", 5],

  // CCTV (P18)
  [18, 17, "I've looked at the ICO guidelines. We'd need a legitimate interest assessment and visible signage, but the purpose described here comfortably meets that threshold. I can draft the paperwork if this passes.", 8],
  [18, 14, "Before we vote — has anyone contacted the council's community safety team? They sometimes co-fund playground CCTV. Worth a call before we commit our own budget.", 6],
  [18, 9,  "I have real concerns about normalising surveillance in public spaces used by children. Have we exhausted other options — better lighting, more community presence, a late-evening volunteer presence?", 4],
  [18, 7,  "@Isla Kowalski We've raised the lighting issue with the council three times without action. The incidents have been at dusk when lighting would help but not solve it. I understand the concern but we need to do something.", 3],
  [18, 3,  "Could we run this as a time-limited trial? Six months, then review the incident log and decide whether to make it permanent. That would also let us explore the council co-funding route in parallel.", 2],
];

// Arguments: [proposalIdx, authorIdx, side, body]
const ARGUMENT_DEFS: Array<[number, number, 'for' | 'against', string]> = [
  [0,  1,  'for',     "Repurposing the library addresses a genuine gap in affordable meeting space. The building is already costing the council £18,000/year empty — there's strong alignment of interest between us and the estate team."],
  [0,  8,  'against', "The running costs of a community hub are often underestimated. Without guaranteed income from day one, we risk inheriting a liability rather than an asset. We should see a detailed business plan before committing."],
  [8,  7,  'for',     "Road safety evidence is robust: 20mph zones with traffic calming reduce casualties by 20–40%. Two near-miss incidents involving children this year alone justify urgent action."],
  [8,  8,  'against', "20mph limits without physical calming measures have a poor track record. Signs alone do not change driver behaviour. Our petition should specify average speed cameras or road narrowing — not just a change to the speed limit sign."],
  [14, 5,  'for',     "The association is running at a deficit. A £10 increase — less than a coffee per month — is modest relative to the services provided. The hardship waiver protects those who need it."],
  [14, 4,  'against', "Doubling the fee in one step will cause membership to drop, especially among newer and lower-income residents. A phased increase achieves the same outcome with far less disruption."],
  [18, 17, 'for',     "CCTV near the playground is a proportionate and evidence-based deterrent. With proper signage and a 28-day retention policy, this is entirely lawful and widely used in similar contexts."],
  [18, 9,  'against', "Children have a right to unsurveilled play. Before installing permanent infrastructure, we should exhaust community-led approaches: improved lighting, a volunteer evening presence, and direct engagement with those causing the disruption."],
];

// Delegation pairs: [delegatorIdx, delegateIdx, topicIdxOrNull, weightFraction]
type DelegationDef = [number, number, number | null, number];
const DELEGATION_DEFS: DelegationDef[] = [
  [4,  0,  0, 1.0],  // David → Oli on Planning
  [8,  1,  0, 1.0],  // Hugo → Alice on Planning (she's the council liaison)
  [11, 10, 0, 1.0],  // Keiko → James on Planning (he works in planning)
  [3,  9,  1, 1.0],  // Clara → Isla on Environment (she's the gardener)
  [16, 13, 1, 1.0],  // Pedro → Maya on Environment
  [4,  6,  2, 1.0],  // David → Finn on Transport (he's the cycling campaigner)
  [15, 7,  2, 1.0],  // Olivia → Grace on Transport
  [8,  5,  4, 1.0],  // Hugo → Elena on Finance (she's the treasurer)
  [16, 5,  4, 1.0],  // Pedro → Elena on Finance
  [3,  17, 5, 1.0],  // Clara → Quinn on Safety (retired police)
  [11, 17, 5, 1.0],  // Keiko → Quinn on Safety
  [15, 0,  null, 1.0], // Olivia → Oli globally (she's new, trusts the chair)
  [16, 14, null, 1.0], // Pedro → Noel globally
];

// ── seed function ─────────────────────────────────────────────────────────────

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

  // Users
  console.log('Seeding users...');
  const users = await em.save(
    User,
    USER_ROWS.map(u => em.create(User, { id: uid(), name: u.name, email: u.email, bio: u.bio })),
  );
  const oli = users[0];

  // Organisation
  console.log('Seeding organisation...');
  const org = await em.save(
    Organisation,
    em.create(Organisation, {
      id: uid(),
      name: "Greenfield Residents' Association",
      slug: 'greenfield-ra',
      description: "The Greenfield Residents' Association represents households across the Greenfield estate. We use liquid democracy to make collective decisions about our neighbourhood — from planning objections to community events.",
      invite_token: uid(),
      proposal_creation_role: 'member',
      topic_creation_role: 'moderator',
      default_voting_duration_days: 14,
      default_threshold: 60,
      voting_visibility: 'public',
      default_quorum: null,
      is_public: true,
      veto_role: 'moderator',
      min_endorsements: 2,
      require_member_approval: true,
      weight_mode: 'manual',
      proposal_templates: [
        { id: uid(), name: 'Planning objection', description: 'Template for formal objections to planning applications.', proposal_type: 'standard', threshold: 50 },
        { id: uid(), name: 'Budget request', description: 'Template for releasing funds from the general reserve.', proposal_type: 'standard', threshold: 60 },
        { id: uid(), name: 'Community consultation', description: 'Gather opinions on a topic before a formal vote.', proposal_type: 'discussion', threshold: 50 },
      ],
    }),
  );

  // Memberships
  console.log('Seeding memberships...');
  await em.save(
    Membership,
    MEMBERSHIP_ROWS.map(([idx, role, weight, status]) =>
      em.create(Membership, {
        id: uid(),
        organisation_id: org.id,
        user_id: users[idx].id,
        role: role as any,
        weight,
        status: status as any,
        invited_by: idx === 0 ? null : oli.id,
      }),
    ),
  );

  // Topics
  console.log('Seeding topics...');
  const topics = await em.save(
    Topic,
    TOPIC_ROWS.map(t =>
      em.create(Topic, { id: uid(), organisation_id: org.id, name: t.name, description: t.description }),
    ),
  );

  // Proposals
  console.log('Seeding proposals...');
  const proposals = await em.save(
    Proposal,
    PROPOSAL_DEFS.map(p => {
      const closesAt = p.closesInDays !== undefined
        ? (p.closesInDays > 0 ? fromNow(p.closesInDays) : ago(Math.abs(p.closesInDays)))
        : null;
      return em.create(Proposal, {
        id: uid(),
        organisation_id: org.id,
        topic_id: topics[p.topicIdx].id,
        author_id: users[p.authorIdx].id,
        title: p.title,
        description: p.desc,
        status: p.status,
        proposal_type: p.type as any,
        threshold: p.threshold ?? 50,
        impact_level: (p.impact ?? null) as any,
        tags: p.tags ?? [],
        pinned: p.pinned ?? false,
        created_at: ago(p.createdDaysAgo),
        closes_at: closesAt,
        closed_at: p.closedAtDaysAgo !== undefined ? ago(p.closedAtDaysAgo) : null,
      });
    }),
  );

  // Multiple-choice proposal options
  console.log('Seeding proposal options...');
  const summerFairIdx  = PROPOSAL_DEFS.findIndex(p => p.title.startsWith('Summer fair'));
  const farmersMarketIdx = PROPOSAL_DEFS.findIndex(p => p.title.startsWith("Monthly farmers"));

  const summerFairOptions = await em.save(ProposalOption, [
    em.create(ProposalOption, { id: uid(), proposal_id: proposals[summerFairIdx].id, organisation_id: org.id, text: '£3,000 — basic programme (stalls, BBQ, bouncy castle)', position: 0 }),
    em.create(ProposalOption, { id: uid(), proposal_id: proposals[summerFairIdx].id, organisation_id: org.id, text: '£5,000 — expanded programme (+ live music and craft fair)', position: 1 }),
    em.create(ProposalOption, { id: uid(), proposal_id: proposals[summerFairIdx].id, organisation_id: org.id, text: '£8,000 — full programme (+ fairground rides and children\'s entertainment)', position: 2 }),
  ]);

  const farmersMarketOptions = await em.save(ProposalOption, [
    em.create(ProposalOption, { id: uid(), proposal_id: proposals[farmersMarketIdx].id, organisation_id: org.id, text: 'Saturday morning (9am–1pm)', position: 0 }),
    em.create(ProposalOption, { id: uid(), proposal_id: proposals[farmersMarketIdx].id, organisation_id: org.id, text: 'Sunday morning (9am–1pm)', position: 1 }),
  ]);

  // Votes
  console.log('Seeding votes...');
  // Approved members who can vote (skip pending: Rania=18, Sam=19)
  const votingMembers = users.slice(0, 18);
  // Open proposals Oli has already voted on (by index in PROPOSAL_DEFS)
  const oliVotedSet = new Set([0, 5, 8, 14]);

  const votes: any[] = [];
  for (let pIdx = 0; pIdx < proposals.length; pIdx++) {
    const p = proposals[pIdx];
    const def = PROPOSAL_DEFS[pIdx];
    if (def.status === 'draft' || def.status === 'withdrawn') continue;

    const dist = def.voteDistribution ?? 'pass';
    let yesW = 6, noW = 2, abstainW = 1;
    if (dist === 'reject')    { yesW = 2; noW = 6; abstainW = 1; }
    if (dist === 'contested') { yesW = 4; noW = 4; abstainW = 2; }

    const isMultiChoice = def.type === 'multiple_choice';
    const options = isMultiChoice
      ? (pIdx === summerFairIdx ? summerFairOptions : farmersMarketOptions)
      : null;

    for (const voter of votingMembers) {
      const isOli = voter.id === oli.id;

      if (def.status === 'open') {
        if (isOli && !oliVotedSet.has(pIdx)) continue;
        if (!isOli && Math.random() > 0.80) continue; // ~80% participation
      }
      // closed: everyone votes

      if (isMultiChoice && options) {
        votes.push(em.create(Vote, {
          id: uid(),
          proposal_id: p.id,
          organisation_id: org.id,
          user_id: voter.id,
          option_id: pick(options).id,
        }));
      } else {
        votes.push(em.create(Vote, {
          id: uid(),
          proposal_id: p.id,
          organisation_id: org.id,
          user_id: voter.id,
          choice: weightedChoice(['yes', 'no', 'abstain'], [yesW, noW, abstainW]) as any,
        }));
      }
    }
  }
  await em.save(Vote, votes);

  // Comments
  console.log('Seeding comments...');
  const comments = await em.save(
    Comment,
    COMMENT_DEFS.map(([pIdx, uIdx, body, days, pinned]) =>
      em.create(Comment, {
        id: uid(),
        proposal_id: proposals[pIdx].id,
        organisation_id: org.id,
        author_id: users[uIdx].id,
        body,
        created_at: ago(days),
        pinned_at: pinned ? ago(days - 0.25) : null,
      }),
    ),
  );

  // Comment reactions
  console.log('Seeding comment reactions...');
  const keyCommentIndices = [0, 2, 8, 12, 17]; // well-received comments
  const commentReactions: any[] = [];
  const nonOliApprovedUsers = votingMembers.filter(u => u.id !== oli.id);
  for (const cIdx of keyCommentIndices) {
    const reactors = sample(nonOliApprovedUsers, 3 + Math.floor(Math.random() * 3));
    for (const reactor of reactors) {
      commentReactions.push(em.create(CommentReaction, {
        id: uid(), comment_id: comments[cIdx].id, organisation_id: org.id,
        user_id: reactor.id, emoji: pick(['👍', '❤️', '👏']),
      }));
    }
  }
  await em.save(CommentReaction, commentReactions);

  // Arguments
  console.log('Seeding arguments...');
  await em.save(
    Argument,
    ARGUMENT_DEFS.map(([pIdx, uIdx, side, body]) =>
      em.create(Argument, {
        id: uid(),
        proposal_id: proposals[pIdx].id,
        organisation_id: org.id,
        author_id: users[uIdx].id,
        side,
        body,
      }),
    ),
  );

  // Endorsements (min_endorsements = 2 to open a proposal)
  console.log('Seeding endorsements...');
  const endorsedProposalIdxs = [0, 1, 5, 6, 7, 8, 10, 14, 15, 18];
  const endorsements: any[] = [];
  for (const pIdx of endorsedProposalIdxs) {
    const count = 2 + Math.floor(Math.random() * 4);
    const endorsers = sample(nonOliApprovedUsers, count);
    for (const endorser of endorsers) {
      endorsements.push(em.create(Endorsement, {
        id: uid(),
        proposal_id: proposals[pIdx].id,
        organisation_id: org.id,
        user_id: endorser.id,
      }));
    }
  }
  await em.save(Endorsement, endorsements);

  // Veto on the contested membership fee proposal
  console.log('Seeding veto...');
  await em.save(Veto, [
    em.create(Veto, {
      id: uid(),
      proposal_id: proposals[14].id,
      organisation_id: org.id,
      author_id: users[1].id, // Alice (moderator)
      reason: 'A fee increase of this magnitude warrants broader consultation before we vote. I propose we survey all members on their preferred approach and revisit at the AGM with full data on hardship waiver demand.',
    }),
  ]);

  // Delegations
  console.log('Seeding delegations...');
  await em.save(
    Delegation,
    DELEGATION_DEFS.map(([delegatorIdx, delegateIdx, topicIdxOrNull, weight]) =>
      em.create(Delegation, {
        id: uid(),
        organisation_id: org.id,
        delegator_id: users[delegatorIdx].id,
        delegate_id: users[delegateIdx].id,
        topic_id: topicIdxOrNull !== null ? topics[topicIdxOrNull].id : null,
        weight_fraction: weight,
      }),
    ),
  );

  // Proposal reactions
  console.log('Seeding proposal reactions...');
  const proposalReactData: Array<[number, number, string]> = [
    [0, 1, '👍'], [0, 3, '👍'], [0, 9, '❤️'], [0, 6, '👍'], [0, 4, '🙌'],
    [5, 9, '🌱'], [5, 13, '🌱'], [5, 12, '👍'], [5, 7, '❤️'],
    [7, 13, '👍'], [7, 9, '❤️'], [7, 3, '👍'],
    [8, 7, '👍'], [8, 17, '👍'], [8, 3, '🙏'], [8, 12, '👍'],
    [18, 17, '👍'], [18, 7, '👍'], [18, 3, '👀'], [18, 9, '🤔'],
  ];
  await em.save(
    ProposalReaction,
    proposalReactData.map(([pIdx, uIdx, emoji]) =>
      em.create(ProposalReaction, {
        id: uid(),
        proposal_id: proposals[pIdx].id,
        organisation_id: org.id,
        user_id: users[uIdx].id,
        emoji,
      }),
    ),
  );

  // Proposal links
  console.log('Seeding proposal links...');
  await em.save(ProposalLink, [
    em.create(ProposalLink, {
      id: uid(),
      source_proposal_id: proposals[8].id,   // 20mph
      target_proposal_id: proposals[20].id,  // traffic calming draft
      link_type: 'related_to',
      organisation_id: org.id,
      created_by: users[7].id,
    }),
    em.create(ProposalLink, {
      id: uid(),
      source_proposal_id: proposals[14].id,  // membership fee
      target_proposal_id: proposals[16].id,  // annual accounts
      link_type: 'related_to',
      organisation_id: org.id,
      created_by: users[5].id,
    }),
  ]);

  // Notifications for Oli (mix of read and unread)
  console.log('Seeding notifications...');
  const notifDefs: Array<{
    type: string; actor_id: string | null; target_type: string | null;
    target_id: string | null; daysAgo: number; read: boolean;
    metadata: Record<string, unknown>;
  }> = [
    // Unread
    { type: 'proposal.opened', actor_id: users[1].id, target_type: 'proposal', target_id: proposals[1].id, daysAgo: 3, read: false, metadata: { proposalTitle: proposals[1].title } },
    { type: 'comment.posted',  actor_id: users[8].id, target_type: 'comment',  target_id: comments[5].id,  daysAgo: 2, read: false, metadata: { proposalTitle: proposals[1].title } },
    { type: 'proposal.vote_reminder', actor_id: null, target_type: 'proposal', target_id: proposals[8].id,  daysAgo: 1,   read: false, metadata: { proposalTitle: proposals[8].title,  closesInDays: 4 } },
    { type: 'proposal.vote_reminder', actor_id: null, target_type: 'proposal', target_id: proposals[14].id, daysAgo: 0.5, read: false, metadata: { proposalTitle: proposals[14].title, closesInDays: 2 } },
    { type: 'member.joined',   actor_id: users[18].id, target_type: null, target_id: null, daysAgo: 1,   read: false, metadata: { memberName: users[18].name } },
    { type: 'member.joined',   actor_id: users[19].id, target_type: null, target_id: null, daysAgo: 0.5, read: false, metadata: { memberName: users[19].name } },
    // Read
    { type: 'proposal.opened',  actor_id: users[7].id,  target_type: 'proposal', target_id: proposals[8].id,  daysAgo: 10, read: true, metadata: { proposalTitle: proposals[8].title } },
    { type: 'proposal.closed',  actor_id: null,          target_type: 'proposal', target_id: proposals[2].id,  daysAgo: 31, read: true, metadata: { proposalTitle: proposals[2].title } },
    { type: 'proposal.closed',  actor_id: null,          target_type: 'proposal', target_id: proposals[9].id,  daysAgo: 21, read: true, metadata: { proposalTitle: proposals[9].title } },
    { type: 'delegation.added', actor_id: users[4].id,   target_type: null,       target_id: null,             daysAgo: 15, read: true, metadata: { topicName: topics[0].name } },
    { type: 'comment.mention',  actor_id: users[10].id,  target_type: 'comment',  target_id: comments[2].id,   daysAgo: 3,  read: true, metadata: { proposalTitle: proposals[0].title } },
  ];
  await em.save(
    Notification,
    notifDefs.map(n =>
      em.create(Notification, {
        id: uid(),
        user_id: oli.id,
        org_id: org.id,
        type: n.type as any,
        actor_id: n.actor_id,
        target_type: n.target_type,
        target_id: n.target_id,
        metadata: n.metadata,
        created_at: ago(n.daysAgo),
        read_at: n.read ? ago(n.daysAgo - 0.1) : null,
      }),
    ),
  );

  // Audit log
  console.log('Seeding audit log...');
  const auditDefs = [
    { actor: users[0],  action: 'org.created',         targetType: 'organisation', targetId: org.id,             daysAgo: 180, meta: { name: org.name } },
    { actor: users[0],  action: 'member.role_changed', targetType: 'user',         targetId: users[1].id,        daysAgo: 170, meta: { from: 'member', to: 'moderator', memberName: users[1].name } },
    { actor: users[0],  action: 'member.role_changed', targetType: 'user',         targetId: users[2].id,        daysAgo: 165, meta: { from: 'member', to: 'moderator', memberName: users[2].name } },
    { actor: users[0],  action: 'member.weight_changed', targetType: 'user',       targetId: users[1].id,        daysAgo: 160, meta: { from: 1, to: 2, memberName: users[1].name } },
    { actor: users[0],  action: 'member.weight_changed', targetType: 'user',       targetId: users[5].id,        daysAgo: 155, meta: { from: 1, to: 2, memberName: users[5].name } },
    { actor: users[1],  action: 'member.approved',     targetType: 'user',         targetId: users[14].id,       daysAgo: 90,  meta: { memberName: users[14].name } },
    { actor: users[0],  action: 'proposal.pinned',     targetType: 'proposal',     targetId: proposals[0].id,    daysAgo: 5,   meta: { title: proposals[0].title } },
    { actor: users[1],  action: 'veto.placed',         targetType: 'proposal',     targetId: proposals[14].id,   daysAgo: 8,   meta: { title: proposals[14].title } },
    { actor: users[0],  action: 'proposal.withdrawn',  targetType: 'proposal',     targetId: proposals[17].id,   daysAgo: 20,  meta: { title: proposals[17].title } },
    { actor: users[2],  action: 'comment.hidden',      targetType: 'comment',      targetId: comments[6].id,     daysAgo: 1,   meta: { reason: 'Off-topic — moved to community forum.' } },
  ];
  await em.save(
    AuditLogEntry,
    auditDefs.map(e =>
      em.create(AuditLogEntry, {
        org_id: org.id,
        actor_id: e.actor?.id ?? null,
        action: e.action,
        target_type: e.targetType ?? null,
        target_id: e.targetId ?? null,
        metadata: e.meta ?? {},
        created_at: ago(e.daysAgo),
      }),
    ),
  );

  await dataSource.destroy();

  const openCount      = proposals.filter((_, i) => PROPOSAL_DEFS[i].status === 'open').length;
  const closedCount    = proposals.filter((_, i) => PROPOSAL_DEFS[i].status === 'closed').length;
  const draftCount     = proposals.filter((_, i) => PROPOSAL_DEFS[i].status === 'draft').length;
  const withdrawnCount = proposals.filter((_, i) => PROPOSAL_DEFS[i].status === 'withdrawn').length;

  console.log('\n✓ Seed complete');
  console.log(`  ${users.length} users (${MEMBERSHIP_ROWS.filter(([,,,s]) => s === 'approved').length} approved, 2 pending)`);
  console.log(`  1 organisation — "${org.name}"`);
  console.log(`  ${topics.length} topics`);
  console.log(`  ${proposals.length} proposals (${openCount} open, ${closedCount} closed, ${draftCount} draft, ${withdrawnCount} withdrawn)`);
  console.log(`  ${votes.length} votes`);
  console.log(`  ${comments.length} comments`);
  console.log(`  ${ARGUMENT_DEFS.length} arguments`);
  console.log(`  ${endorsements.length} endorsements`);
  console.log(`  1 veto`);
  console.log(`  ${DELEGATION_DEFS.length} delegations`);
  console.log(`  ${notifDefs.length} notifications for ${oli.name} (${notifDefs.filter(n => !n.read).length} unread)`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
