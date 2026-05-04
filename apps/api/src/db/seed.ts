import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Topic } from '../topics/topic.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Delegation } from '../delegations/delegation.entity';
import { Vote, VoteChoice } from '../votes/vote.entity';
import { Credential } from '../auth/credential.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://postgres:password@localhost:5432/ripple',
  entities: [User, Topic, Proposal, Delegation, Vote, Credential],
});

const USERS = [
  { name: 'Alice Pemberton', email: 'alice@example.com' },
  { name: 'Ben Nakamura', email: 'ben@example.com' },
  { name: 'Clara Osei', email: 'clara@example.com' },
  { name: 'David Rossi', email: 'david@example.com' },
  { name: 'Elena Vasquez', email: 'elena@example.com' },
  { name: 'Finn Andersen', email: 'finn@example.com' },
  { name: 'Grace Mwangi', email: 'grace@example.com' },
  { name: 'Hugo Larsson', email: 'hugo@example.com' },
  { name: 'Isla Kowalski', email: 'isla@example.com' },
  { name: 'James Okafor', email: 'james@example.com' },
  { name: 'Keiko Tanaka', email: 'keiko@example.com' },
  { name: 'Liam Dupont', email: 'liam@example.com' },
  { name: 'Maya Sharma', email: 'maya@example.com' },
  { name: 'Noel Ferreira', email: 'noel@example.com' },
  { name: 'Olivia Chen', email: 'olivia@example.com' },
  { name: 'Pedro Alves', email: 'pedro@example.com' },
  { name: 'Quinn Reeves', email: 'quinn@example.com' },
  { name: 'Rania Hassan', email: 'rania@example.com' },
  { name: 'Sam Bergstrom', email: 'sam@example.com' },
  { name: 'Tara Nkosi', email: 'tara@example.com' },
];

const TOPICS = [
  {
    name: 'Environment',
    description: 'Climate, sustainability, and ecological policy.',
  },
  {
    name: 'Economy',
    description: 'Fiscal policy, taxation, and economic development.',
  },
  {
    name: 'Healthcare',
    description: 'Public health, medical funding, and wellness programmes.',
  },
  {
    name: 'Education',
    description: 'Schools, universities, and lifelong learning initiatives.',
  },
  {
    name: 'Housing',
    description: 'Affordable housing, planning, and tenant rights.',
  },
  {
    name: 'Transport',
    description: 'Roads, public transit, cycling, and aviation.',
  },
  {
    name: 'Technology',
    description: 'Digital infrastructure, data privacy, and AI governance.',
  },
  {
    name: 'Social Policy',
    description: 'Welfare, equality, and community support programmes.',
  },
];

const PROPOSALS_BY_TOPIC: Record<string, Array<{ title: string; description: string; status: 'open' | 'closed' }>> = {
  Environment: [
    { title: 'Ban single-use plastics by 2026', description: 'Phase out single-use plastic packaging across all retail outlets within 18 months.', status: 'open' },
    { title: 'Expand national park boundaries', description: 'Add 200,000 hectares of wilderness to protected national park status.', status: 'open' },
    { title: 'Carbon tax on heavy industry', description: 'Introduce a tiered carbon levy on industrial emitters exceeding 10,000 tonnes CO₂/year.', status: 'closed' },
    { title: 'Mandatory green roofs for new builds', description: 'Require vegetated roofing on all new commercial buildings over 500m².', status: 'open' },
    { title: 'Rewilding programme for degraded farmland', description: 'Fund restoration of 50,000 hectares of low-productivity agricultural land.', status: 'closed' },
  ],
  Economy: [
    { title: 'Universal basic income pilot', description: 'Run a two-year UBI trial covering 5,000 participants across three regions.', status: 'open' },
    { title: 'Raise minimum wage to £15/hour', description: 'Increase the national living wage floor with a phased two-year implementation.', status: 'closed' },
    { title: 'Small business rates relief extension', description: 'Extend business rates relief for SMEs with turnover under £500k for three more years.', status: 'open' },
    { title: 'Sovereign wealth fund from North Sea revenues', description: 'Establish a long-term savings fund capitalised from offshore energy receipts.', status: 'open' },
    { title: 'Digital services tax increase to 5%', description: 'Raise the DST on tech platform revenues to align with OECD Pillar One proposals.', status: 'closed' },
  ],
  Healthcare: [
    { title: 'Free dental care for under-25s', description: 'Extend NHS dental provision at no cost to all patients aged 24 and under.', status: 'open' },
    { title: 'Mental health parity funding mandate', description: 'Require CCGs to allocate at least 15% of budgets to mental health services.', status: 'open' },
    { title: 'Expand rural GP surgeries programme', description: 'Fund 150 new GP practices in areas with fewer than 1 doctor per 2,000 residents.', status: 'closed' },
    { title: 'Legalise assisted dying for terminal patients', description: 'Allow medically assisted dying for adults with a terminal prognosis of under six months.', status: 'open' },
    { title: 'Sugar tax extension to dairy products', description: 'Apply the Soft Drinks Industry Levy model to high-sugar dairy and plant-based drinks.', status: 'closed' },
  ],
  Education: [
    { title: 'Free school meals for all primary pupils', description: 'Universalise free hot lunches for every child in state primary education.', status: 'open' },
    { title: 'Abolish university tuition fees', description: 'Remove annual undergraduate tuition fees and replace with a graduate contribution levy.', status: 'open' },
    { title: 'Mandatory coding curriculum from age 7', description: 'Introduce structured computer science teaching in all state schools from Key Stage 1.', status: 'closed' },
    { title: 'Teacher retention bonus scheme', description: 'Offer £5,000 retention payments to teachers completing five years in shortage subjects.', status: 'open' },
    { title: 'Expand SEN support funding by 40%', description: 'Increase special educational needs provision budgets to reduce tribunal backlogs.', status: 'closed' },
  ],
  Housing: [
    { title: 'Build 100,000 social homes per year', description: 'Commit public funding to deliver 100,000 new council and housing association units annually.', status: 'open' },
    { title: 'Rent control in high-pressure cities', description: 'Cap annual rent increases at CPI+2% in local authorities where rents exceed the national median by 30%.', status: 'open' },
    { title: 'Compulsory purchase reform for brownfield land', description: 'Streamline CPO powers for derelict urban sites to accelerate residential development.', status: 'closed' },
    { title: 'Right to buy reinstatement', description: 'Restore the right for social housing tenants to purchase at a discounted rate.', status: 'closed' },
    { title: 'Empty homes levy', description: 'Charge a 200% council tax premium on properties vacant for more than 12 months.', status: 'open' },
  ],
  Transport: [
    { title: 'Free bus travel for under-22s', description: 'Extend the Scottish model of free bus passes to England and Wales for those under 22.', status: 'open' },
    { title: 'Ban new petrol and diesel cars by 2030', description: 'Reinstate the original 2030 zero-emission vehicle mandate removed in 2023.', status: 'open' },
    { title: 'HS3 east-west rail corridor', description: 'Fund a new high-speed rail link connecting Liverpool, Manchester, Leeds, and Hull.', status: 'closed' },
    { title: 'Cycling infrastructure fund — £2bn', description: 'Invest £2 billion over five years in protected cycle lanes in urban areas.', status: 'open' },
    { title: 'Frequent flyer levy', description: 'Apply a progressive levy on passengers taking more than two return flights per year.', status: 'closed' },
  ],
  Technology: [
    { title: 'National public broadband provider', description: 'Establish a state-owned ISP to deliver gigabit connectivity to underserved areas.', status: 'open' },
    { title: 'Mandatory algorithmic audits for public-sector AI', description: 'Require annual independent audits of automated decision-making systems used by government.', status: 'open' },
    { title: 'Data portability rights extension', description: 'Strengthen GDPR data portability to cover real-time data streams from platforms.', status: 'closed' },
    { title: 'Age verification for social media', description: 'Mandate robust age checks preventing under-16s from creating social media accounts.', status: 'open' },
    { title: 'Open-source requirement for publicly funded software', description: 'Require all software built with public money to be released under an open-source licence.', status: 'closed' },
  ],
  'Social Policy': [
    { title: 'Four-day working week pilot', description: 'Run a government-backed 32-hour week trial with 200 employers over 12 months.', status: 'open' },
    { title: 'Extend shared parental leave to 52 weeks', description: 'Allow parents to share up to 52 weeks of paid leave at 90% of earnings.', status: 'open' },
    { title: 'Reform the two-child benefit cap', description: 'Remove the limit on Child Tax Credit and Universal Credit for third and subsequent children.', status: 'closed' },
    { title: 'Disability benefits uprating above inflation', description: 'Index PIP and DLA payments to a cost-of-living measure reflecting disabled people\'s expenses.', status: 'open' },
    { title: 'Mandatory ethnicity pay gap reporting', description: 'Require employers with 50+ staff to publish annual ethnicity pay gap data.', status: 'closed' },
  ],
};

const VOTE_CHOICES: readonly VoteChoice[] = ['yes', 'no', 'abstain'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  await dataSource.initialize();
  const manager = dataSource.manager;

  console.log('Truncating existing data...');
  await manager.query('TRUNCATE credentials, votes, delegations, proposals, topics, users');

  // Users
  console.log('Seeding users...');
  const users: User[] = [];
  for (const u of USERS) {
    const user = manager.create(User, {
      id: randomUUID(),
      name: u.name,
      email: u.email,
    });
    users.push(user);
  }
  await manager.save(User, users);

  // Topics
  console.log('Seeding topics...');
  const topics: Topic[] = [];
  for (const t of TOPICS) {
    const topic = manager.create(Topic, {
      id: randomUUID(),
      name: t.name,
      description: t.description,
    });
    topics.push(topic);
  }
  await manager.save(Topic, topics);

  // Proposals
  console.log('Seeding proposals...');
  const proposals: Proposal[] = [];
  for (const topic of topics) {
    const templateList = PROPOSALS_BY_TOPIC[topic.name] ?? [];
    for (const p of templateList) {
      const proposal = manager.create(Proposal, {
        id: randomUUID(),
        topic_id: topic.id,
        title: p.title,
        description: p.description,
        status: p.status,
        closed_at: p.status === 'closed' ? daysAgo(Math.floor(Math.random() * 14 + 1)) : null,
      });
      proposals.push(proposal);
    }
  }
  await manager.save(Proposal, proposals);

  // Votes — each user votes on ~70% of proposals
  console.log('Seeding votes...');
  const votes: Vote[] = [];
  for (const user of users) {
    for (const proposal of proposals) {
      if (Math.random() < 0.7) {
        votes.push(
          manager.create(Vote, {
            id: randomUUID(),
            proposal_id: proposal.id,
            user_id: user.id,
            choice: pick(VOTE_CHOICES),
          }),
        );
      }
    }
  }
  await manager.save(Vote, votes);

  // Delegations — topic-scoped and global
  console.log('Seeding delegations...');
  const delegations: Delegation[] = [];
  const delegationKeys = new Set<string>();

  const addDelegation = (delegatorId: string, delegateId: string, topicId: string | null) => {
    if (delegatorId === delegateId) return;
    const key = `${delegatorId}:${topicId ?? 'global'}`;
    if (delegationKeys.has(key)) return;
    delegationKeys.add(key);
    delegations.push(
      manager.create(Delegation, {
        id: randomUUID(),
        delegator_id: delegatorId,
        delegate_id: delegateId,
        topic_id: topicId,
      }),
    );
  };

  // ~15 topic-scoped delegations
  for (let i = 0; i < 15; i++) {
    const delegator = pick(users);
    const delegate = pick(users);
    const topic = pick(topics);
    addDelegation(delegator.id, delegate.id, topic.id);
  }

  // ~5 global delegations
  for (let i = 0; i < 5; i++) {
    const delegator = pick(users);
    const delegate = pick(users);
    addDelegation(delegator.id, delegate.id, null);
  }

  await manager.save(Delegation, delegations);

  await dataSource.destroy();

  console.log(`\nSeeded:`);
  console.log(`  ${users.length} users`);
  console.log(`  ${topics.length} topics`);
  console.log(`  ${proposals.length} proposals`);
  console.log(`  ${votes.length} votes`);
  console.log(`  ${delegations.length} delegations`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
