import { useParams, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { usersCollection } from '../collections';
import { useOrg } from '../OrgContext';
import { useCurrentUser } from '../context';
import type { User, Vote, Delegation, Proposal, Topic } from '../api';

export function UserProfilePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { slug } = useParams({ strict: false }) as { slug: string };
  const currentUser = useCurrentUser();
  const { collections: { votesCollection, delegationsCollection, proposalsCollection, topicsCollection } } = useOrg();

  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allVotes } = useLiveQuery(votesCollection);
  const { data: allDelegations } = useLiveQuery(delegationsCollection);
  const { data: allProposals } = useLiveQuery(proposalsCollection);
  const { data: allTopics } = useLiveQuery(topicsCollection);

  const user = (allUsers ?? []).find((u: User) => u.id === id);
  const votes = (allVotes ?? []).filter((v: Vote) => v.user_id === id);
  const outgoing = (allDelegations ?? []).filter((d: Delegation) => d.delegator_id === id);

  const proposalMap = Object.fromEntries((allProposals ?? []).map((p: Proposal) => [p.id, p]));
  const topicMap = Object.fromEntries((allTopics ?? []).map((t: Topic) => [t.id, t]));
  const userMap = Object.fromEntries((allUsers ?? []).map((u: User) => [u.id, u]));

  const choiceColor: Record<string, string> = {
    yes: '#2d9a4e',
    no: '#d94040',
    abstain: '#888',
  };

  if (!user) {
    return <p style={{ fontSize: 14, color: '#999' }}>Loading…</p>;
  }

  const isOwnProfile = currentUser?.id === id;

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Profile header */}
      <div style={{
        border: '1px solid #ddd', borderRadius: 6, padding: '1.25rem',
        marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: '#e8e8e8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 600, color: '#666', flexShrink: 0,
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>
            {user.name}
            {isOwnProfile && (
              <span style={{ marginLeft: '0.5rem', fontSize: 12, color: '#888', fontWeight: 400 }}>(you)</span>
            )}
          </p>
          <p style={{ margin: '0.2rem 0 0', fontSize: 13, color: '#666' }}>{user.email}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: 12, color: '#aaa' }}>
            Member since {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {isOwnProfile && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.25rem' }}>
          <Link to="/orgs/$slug/delegations" params={{ slug }} style={{ fontSize: 13, color: '#1a56d6', textDecoration: 'none' }}>
            Manage your delegations →
          </Link>
          <Link to="/settings" style={{ fontSize: 13, color: '#1a56d6', textDecoration: 'none' }}>
            Account settings →
          </Link>
        </div>
      )}

      {/* Votes */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
          Votes ({votes.length})
        </h3>
        {votes.length === 0 ? (
          <div>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 0.5rem' }}>No votes cast yet.</p>
            {isOwnProfile && (
              <Link to="/orgs/$slug/proposals" params={{ slug }} style={{ fontSize: 13, color: '#1a56d6', textDecoration: 'none' }}>
                Browse proposals to get started →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {votes.map((v: Vote) => {
              const proposal = proposalMap[v.proposal_id] as Proposal | undefined;
              return (
                <div
                  key={v.id}
                  style={{
                    border: '1px solid #ddd', borderRadius: 6, padding: '0.6rem 1rem',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {proposal ? (
                      <Link
                        to="/orgs/$slug/proposals/$id"
                        params={{ slug, id: proposal.id }}
                        style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {proposal.title}
                      </Link>
                    ) : (
                      <span style={{ color: '#aaa' }}>Proposal removed</span>
                    )}
                    {proposal && topicMap[proposal.topic_id] && (
                      <span style={{
                        marginLeft: '0.5rem', fontSize: 12, padding: '1px 7px',
                        borderRadius: 10, background: '#e8f0fe', color: '#1a56d6', border: '1px solid #c3d6fb',
                      }}>
                        {(topicMap[proposal.topic_id] as Topic).name}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: (v.choice ? choiceColor[v.choice] : undefined) ?? '#555',
                    flexShrink: 0, marginLeft: '1rem', textTransform: 'capitalize',
                  }}>
                    {v.choice}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delegations */}
      <section>
        <h3 style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
          Delegations ({outgoing.length})
        </h3>
        {outgoing.length === 0 ? (
          <div>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 0.5rem' }}>No delegations set.</p>
            {isOwnProfile && (
              <Link to="/orgs/$slug/delegations" params={{ slug }} style={{ fontSize: 13, color: '#1a56d6', textDecoration: 'none' }}>
                Delegate your vote to a trusted member →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {outgoing.map((d: Delegation) => {
              const delegate = userMap[d.delegate_id] as User | undefined;
              return (
                <div
                  key={d.id}
                  style={{
                    border: '1px solid #ddd', borderRadius: 6, padding: '0.6rem 1rem',
                    fontSize: 14, display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}
                >
                  <span>Delegates to </span>
                  {delegate ? (
                    <Link
                      to="/orgs/$slug/users/$id"
                      params={{ slug, id: delegate.id }}
                      style={{ fontWeight: 500, color: 'inherit' }}
                    >
                      {delegate.name}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 500 }}>{d.delegate_id}</span>
                  )}
                  <span style={{
                    fontSize: 12, padding: '1px 7px', borderRadius: 10,
                    background: d.topic_id ? '#e8f0fe' : '#f0f0f0',
                    color: d.topic_id ? '#1a56d6' : '#666',
                    border: `1px solid ${d.topic_id ? '#c3d6fb' : '#ddd'}`,
                  }}>
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
