import { useParams, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { usersCollection, membershipsCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { useCurrentUser } from '../context';
import type { User, Vote, Delegation, Proposal, Topic, Membership } from '../api';
import { Avatar } from '../components/Avatar';
import styles from './UserProfilePage.module.css';

export function UserProfilePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { slug } = useParams({ strict: false }) as { slug: string };
  const currentUser = useCurrentUser();
  const { org, collections: { votesCollection, delegationsCollection, proposalsCollection, topicsCollection } } = useOrg();

  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allDelegations } = useLiveQuery(delegationsCollection);
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);

  const user = (allUsers ?? []).find((u: User) => u.id === id);
  const votes = (allVotes ?? []).filter((v: Vote) => v.user_id === id);
  const outgoing = (allDelegations ?? []).filter((d: Delegation) => d.delegator_id === id);
  const membership = (allMemberships ?? []).find((m: Membership) => m.organisation_id === org.id && m.user_id === id);
  const weightMode = (org as { weight_mode?: string }).weight_mode ?? 'manual';
  const ROLE_WEIGHT: Record<string, number> = { admin: 3, moderator: 2, member: 1, observer: 0 };
  const displayWeight = weightMode === 'by_role'
    ? (membership ? (ROLE_WEIGHT[membership.role] ?? 1) : null)
    : (membership ? ((membership as { weight?: number }).weight ?? null) : null);

  const proposalMap = Object.fromEntries((allProposals ?? []).map((p: Proposal) => [p.id, p]));
  const topicMap = Object.fromEntries((allTopics ?? []).map((t: Topic) => [t.id, t]));
  const userMap = Object.fromEntries((allUsers ?? []).map((u: User) => [u.id, u]));

  function choiceClass(choice: string | undefined) {
    if (choice === 'yes') return styles.voteChoiceYes;
    if (choice === 'no') return styles.voteChoiceNo;
    return styles.voteChoiceAbstain;
  }

  if (!user) {
    return <p className={styles.loading}>Loading…</p>;
  }

  const isOwnProfile = currentUser?.id === id;

  return (
    <div className={styles.page}>
      <div className={styles.profileCard}>
        <Avatar name={user.name} avatarUrl={user.avatar_url ?? null} size={48} />
        <div>
          <p className={styles.profileName}>
            {user.name}
            {isOwnProfile && <span className={styles.youBadge}>(you)</span>}
          </p>
          <p className={styles.profileEmail}>{user.email}</p>
          <p className={styles.profileMeta}>Member since {new Date(user.created_at).toLocaleDateString()}</p>
          {membership && (
            <p className={styles.profileRole}>
              {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
              {displayWeight !== null && displayWeight !== 1 && (
                <span className={styles.weightBadge}>weight {displayWeight}</span>
              )}
            </p>
          )}
          {user.bio && (
            <p data-testid="user-bio" className={styles.profileBio}>{user.bio as string}</p>
          )}
        </div>
      </div>

      {isOwnProfile && (
        <div className={styles.ownLinks}>
          <Link to="/orgs/$slug/delegations" params={{ slug }} className={styles.ownLink}>
            Manage your delegations →
          </Link>
          <Link to="/settings" className={styles.ownLink}>
            Account settings →
          </Link>
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionHeading}>Votes ({votes.length})</h3>
        {votes.length === 0 ? (
          <div>
            <p className={styles.empty}>No votes cast yet.</p>
            {isOwnProfile && (
              <Link to="/orgs/$slug/proposals" params={{ slug }} className={styles.emptyLink}>
                Browse proposals to get started →
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {votes.map((v: Vote) => {
              const proposal = proposalMap[v.proposal_id] as Proposal | undefined;
              return (
                <div key={v.id} className={styles.voteRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {proposal ? (
                      <Link
                        to="/orgs/$slug/proposals/$id"
                        params={{ slug, id: proposal.id }}
                        className={styles.voteLink}
                      >
                        {proposal.title}
                      </Link>
                    ) : (
                      <span className={styles.removed}>Proposal removed</span>
                    )}
                    {proposal && topicMap[proposal.topic_id] && (
                      <span className={styles.topicBadge}>
                        {(topicMap[proposal.topic_id] as Topic).name}
                      </span>
                    )}
                  </div>
                  <span className={`${styles.voteChoice} ${choiceClass(v.choice ?? undefined)}`}>
                    {v.choice}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHeading}>Delegations ({outgoing.length})</h3>
        {outgoing.length === 0 ? (
          <div>
            <p className={styles.empty}>No delegations set.</p>
            {isOwnProfile && (
              <Link to="/orgs/$slug/delegations" params={{ slug }} className={styles.emptyLink}>
                Delegate your vote to a trusted member →
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {outgoing.map((d: Delegation) => {
              const delegate = userMap[d.delegate_id] as User | undefined;
              return (
                <div key={d.id} className={styles.delegationRow}>
                  <span>Delegates to </span>
                  {delegate ? (
                    <Link
                      to="/orgs/$slug/users/$id"
                      params={{ slug, id: delegate.id }}
                      className={styles.delegationLink}
                    >
                      {delegate.name}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 500 }}>{d.delegate_id}</span>
                  )}
                  <span className={`${styles.scopeBadge} ${d.topic_id ? styles.scopeTopic : styles.scopeGlobal}`}>
                    {d.topic_id ? ((topicMap[d.topic_id] as Topic)?.name ?? d.topic_id) : 'Global'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
