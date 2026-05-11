import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useOrg } from '../OrgContext';
import { membershipsCollection } from '../collections';
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
  const { data: allMemberships } = useLiveQuery(membershipsCollection);
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

  return (
    <div className={styles.page}>
      <div className={styles.orgHeader}>
        <h2 className={styles.orgName}>{org.name}</h2>
        {org.description && <p className={styles.orgDescription}>{org.description}</p>}
        <p className={styles.orgSlug}>/{org.slug}</p>
      </div>

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
