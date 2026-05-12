import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useOrg } from '../OrgContext';
import { membershipsCollection } from '../collections';
import { useCurrentUser } from '../context';
import type { Membership, Proposal, Topic } from '../api';
import styles from './OrgHomePage.module.css';

const NAV_LINKS = [
  { to: '/orgs/$slug/proposals' as const,   label: 'Proposals',   icon: '🗳' },
  { to: '/orgs/$slug/delegations' as const, label: 'Delegations', icon: '↔' },
  { to: '/orgs/$slug/members' as const,     label: 'Members',     icon: '👥' },
];

function statusBadgeClass(status: string) {
  if (status === 'open') return styles.badgeOpen;
  if (status === 'draft') return styles.badgeDraft;
  if (status === 'closed') return styles.badgeClosed;
  return styles.badgeWithdrawn;
}

export function OrgHomePage() {
  const { org, collections: { proposalsCollection, topicsCollection } } = useOrg();
  const currentUser = useCurrentUser();
  const { data: allMemberships } = useLiveQuery(membershipsCollection);
  const [dismissedChecklist, setDismissedChecklist] = useState(() =>
    localStorage.getItem(`checklist-dismissed-${org.id}`) === '1',
  );
  const { data: allProposals }   = useLiveQuery(proposalsCollection);
  const { data: allTopics }      = useLiveQuery(topicsCollection);

  const memberCount = ((allMemberships ?? []) as Membership[])
    .filter((m) => m.organisation_id === org.id).length;

  const proposals = (allProposals ?? []) as Proposal[];
  const openCount  = proposals.filter((p) => p.status === 'open').length;
  const totalCount = proposals.length;

  const topicMap = Object.fromEntries(
    ((allTopics ?? []) as Topic[]).map((t) => [t.id, t]),
  );

  const recentProposals = [...proposals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const myMembership = ((allMemberships ?? []) as Membership[]).find(
    (m) => m.organisation_id === org.id && m.user_id === currentUser?.id,
  );
  const isAdmin = myMembership?.role === 'admin';

  const checklist = isAdmin ? [
    { label: 'Organisation created', done: true, link: null },
    { label: 'Invite your first member', done: memberCount > 1, link: `/orgs/${org.slug}/admin` },
    { label: 'Create your first proposal', done: totalCount > 0, link: `/orgs/${org.slug}/proposals` },
    { label: 'Cast a vote', done: proposals.some((p) => p.status === 'closed'), link: `/orgs/${org.slug}/proposals` },
  ] : null;

  const showChecklist = checklist && !dismissedChecklist && checklist.some((c) => !c.done);

  function dismissChecklist() {
    localStorage.setItem(`checklist-dismissed-${org.id}`, '1');
    setDismissedChecklist(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.orgHeader}>
        <h2 className={styles.orgName}>{org.name}</h2>
        {org.description && <p className={styles.orgDescription}>{org.description}</p>}
        <p className={styles.orgSlug}>/{org.slug}</p>
      </div>

      {showChecklist && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>Getting started</p>
            <button onClick={dismissChecklist} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-fg-muted)', lineHeight: 1, padding: 0 }} aria-label="Dismiss">×</button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {checklist!.map((item) => (
              <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: 14 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: item.done ? 'none' : '1px solid var(--color-border)', background: item.done ? '#2d9a4e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11 }}>
                  {item.done ? '✓' : ''}
                </span>
                {item.link && !item.done ? (
                  <a href={item.link} style={{ color: 'var(--color-fg)', textDecoration: 'underline', textDecorationColor: 'var(--color-border)' }}>{item.label}</a>
                ) : (
                  <span style={{ color: item.done ? 'var(--color-fg-muted)' : 'var(--color-fg)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{memberCount}</div>
          <div className={styles.statLabel}>member{memberCount !== 1 ? 's' : ''}</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statValueOpen}`}>{openCount}</div>
          <div className={styles.statLabel}>open</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalCount}</div>
          <div className={styles.statLabel}>proposals</div>
        </div>
      </div>

      {currentUser && myMembership && (
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)' }}>
          <a href={`/api/orgs/${org.slug}/calendar.ics`} style={{ color: 'var(--color-fg-muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Download calendar (.ics)
          </a>
          {' — import voting deadlines into your calendar app'}
        </p>
      )}

      <div className={styles.quickNav}>
        {NAV_LINKS.map(({ to, label, icon }) => (
          <Link key={label} to={to} params={{ slug: org.slug }} className={styles.navCard}>
            <div className={styles.navCardInner}>
              <div className={styles.navCardIcon}>{icon}</div>
              <div className={styles.navCardLabel}>{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <div className={styles.recentHeader}>
          <h3 className={styles.recentTitle}>Recent proposals</h3>
          <Link to="/orgs/$slug/proposals" params={{ slug: org.slug }} className={styles.viewAll}>
            View all →
          </Link>
        </div>

        {recentProposals.length === 0 ? (
          <p className={styles.emptyHint}>No proposals yet.</p>
        ) : (
          <div className={styles.proposalList}>
            {recentProposals.map((p) => {
              const topic = topicMap[p.topic_id];
              return (
                <Link
                  key={p.id}
                  to="/orgs/$slug/proposals/$id"
                  params={{ slug: org.slug, id: p.id }}
                  className={styles.proposalRow}
                >
                  <div className={styles.proposalRowInner}>
                    <div className={styles.proposalBody}>
                      <p className={styles.proposalTitle}>{p.title}</p>
                      {topic && <span className={styles.proposalTopic}>{topic.name}</span>}
                    </div>
                    <span className={`${styles.badge} ${statusBadgeClass(p.status)}`}>{p.status}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
