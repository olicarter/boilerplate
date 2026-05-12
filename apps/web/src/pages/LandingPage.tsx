import { useEffect, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Link } from '@tanstack/react-router';
import { organisationsCollection } from '../collections';
import type { Organisation } from '../api';
import styles from './LandingPage.module.css';

const STEPS = [
  { n: '01', title: 'Create an org', desc: 'Set up your group in seconds — name, description, and privacy settings.' },
  { n: '02', title: 'Invite members', desc: 'Share an invite link or open your org to the public.' },
  { n: '03', title: 'Open a proposal', desc: 'Start a vote on any decision that matters to your group.' },
  { n: '04', title: 'See results live', desc: 'Transparent outcomes updated in real time as votes arrive.' },
];

const FEATURES = [
  { title: 'Liquid delegation', desc: 'Delegate your vote to someone you trust on any topic — and reclaim it any time without asking permission.' },
  { title: 'Weighted voting', desc: 'Assign vote power by role, seniority, or stake. Every voice counted fairly.' },
  { title: 'Live results', desc: 'Tallies and vote counts update in real time as members vote. No waiting for the count.' },
  { title: 'Threaded discussion', desc: 'Comment, reply, and @mention before and after a vote closes. Full context, always.' },
  { title: 'Full audit trail', desc: 'Every action logged and visible to admins. Nothing hidden, nothing lost.' },
  { title: 'Public or private', desc: 'Open your org to anyone on the internet, or keep it invite-only with a secret link.' },
];

const USE_CASES = [
  { label: 'Neighbourhood groups', desc: "Residents' associations, street committees, local communities." },
  { label: 'Worker cooperatives', desc: 'One-member-one-vote or weighted decisions for equal-stake orgs.' },
  { label: 'Local councils', desc: 'Public motions, planning applications, and emergency debates.' },
  { label: 'National governments', desc: 'Citizen assemblies and large-scale participatory democracy.' },
  { label: 'Companies', desc: 'Async decisions across teams without the meeting overhead.' },
  { label: 'DAOs & web3 orgs', desc: 'Off-chain deliberation to complement on-chain governance.' },
];

interface Stats { orgs: number; members: number; votes: number }

function VoteBar({ label, pct, strong }: { label: string; pct: number; strong?: boolean }) {
  return (
    <div className={styles.vmRow}>
      <span className={styles.vmLabel}>{label}</span>
      <div className={styles.vmTrack}>
        <div className={`${styles.vmFill} ${strong ? styles.vmFillStrong : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.vmPct}>{pct}%</span>
    </div>
  );
}

function VoteMock() {
  return (
    <div className={styles.voteMock}>
      <div className={styles.vmOrg}>Eastside Residents' Association</div>
      <h3 className={styles.vmTitle}>Should we adopt the new neighbourhood charter?</h3>
      <div className={styles.vmMeta}>
        <span className={styles.vmLive}><span className={styles.vmDot} />Live</span>
        <span>18 votes</span>
        <span>Closes in 2 days</span>
      </div>
      <div className={styles.vmBars}>
        <VoteBar label="Yes" pct={67} strong />
        <VoteBar label="No" pct={21} />
        <VoteBar label="Abstain" pct={12} />
      </div>
      <div className={styles.vmFooter}>
        <span>4 votes via delegation</span>
        <span className={styles.vmPassing}>Passing ✓</span>
      </div>
    </div>
  );
}

interface Props {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: Props) {
  const { data: allOrgs } = useLiveQuery(organisationsCollection);
  const publicOrgs = ((allOrgs ?? []) as Organisation[]).filter((o) => o.is_public);

  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch('/api/orgs/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>◆ Ripple</span>
        <button onClick={onSignIn} className={styles.headerSignIn}>Sign in</button>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.inner}>
          <div className={styles.heroLayout}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                Democratic decisions,<br />
                for any group.
              </h1>
              <p className={styles.heroSub}>
                Ripple brings liquid democracy to cooperatives, councils, governments, and any
                organisation that needs to make decisions together — with proposals, delegation,
                and full transparency.
              </p>
              <div className={styles.heroCtas}>
                <button onClick={onSignIn} className={styles.primaryCta}>
                  Get started free
                </button>
                {publicOrgs.length > 0 && (
                  <a href="#organisations" className={styles.secondaryCta}>
                    Explore organisations
                  </a>
                )}
              </div>
            </div>
            <div className={styles.heroVisual}>
              <VoteMock />
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      {stats && (stats.orgs > 0 || stats.votes > 0) && (
        <div className={styles.statsStrip}>
          <div className={styles.inner}>
            <div className={styles.stats}>
              {stats.orgs > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statNum}>{stats.orgs.toLocaleString()}</span>
                  <span className={styles.statLabel}>{stats.orgs === 1 ? 'organisation' : 'organisations'}</span>
                </div>
              )}
              {stats.members > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statNum}>{stats.members.toLocaleString()}</span>
                  <span className={styles.statLabel}>{stats.members === 1 ? 'member' : 'members'}</span>
                </div>
              )}
              {stats.votes > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statNum}>{stats.votes.toLocaleString()}</span>
                  <span className={styles.statLabel}>votes cast</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.n} className={styles.step}>
                <span className={styles.stepNum}>{s.n}</span>
                <strong className={styles.stepTitle}>{s.title}</strong>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.inner}>
          <h2 className={`${styles.sectionTitle} ${styles.sectionTitleLight}`}>Everything your group needs</h2>
          <p className={`${styles.sectionSub} ${styles.sectionSubLight}`}>Built for real decisions, not just polls.</p>
          <div className={styles.features}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.feature}>
                <strong className={styles.featureTitle}>{f.title}</strong>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>Built for every kind of group</h2>
          <div className={styles.useCases}>
            {USE_CASES.map((u) => (
              <div key={u.label} className={styles.useCase}>
                <strong className={styles.useCaseLabel}>{u.label}</strong>
                <p className={styles.useCaseDesc}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live organisations */}
      {publicOrgs.length > 0 && (
        <section className={styles.section} id="organisations">
          <div className={styles.inner}>
            <h2 className={styles.sectionTitle}>Active organisations</h2>
            <p className={styles.sectionSub}>Browse and join any of these public organisations.</p>
            <div className={styles.orgs}>
              {publicOrgs.map((org) => (
                <Link
                  key={org.id}
                  to="/orgs/$slug/proposals"
                  params={{ slug: org.slug }}
                  className={styles.orgCard}
                >
                  <strong className={styles.orgName}>{org.name}</strong>
                  {org.description && <p className={styles.orgDesc}>{org.description}</p>}
                  <span className={styles.orgSlug}>/{org.slug}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className={styles.ctaStrip}>
        <div className={styles.inner}>
          <p className={styles.ctaStripTitle}>Start making better decisions.</p>
          <p className={styles.ctaStripSub}>
            Free to use. No credit card required.
          </p>
          <button onClick={onSignIn} className={styles.ctaStripBtn}>
            Create your organisation
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <span>◆ Ripple</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
