import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useOrg } from '../OrgContext';
import { membershipsCollection } from '../collections';
import type { Membership, Proposal, Topic } from '../api';

const statStyle: React.CSSProperties = {
  flex: 1,
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '1rem 1.25rem',
  background: '#fff',
  textAlign: 'center',
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 500,
};

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  open:      { ...badge, background: '#e6f9ed', color: '#2d9a4e', border: '1px solid #b3e5c2' },
  draft:     { ...badge, background: '#fff8e1', color: '#b45309', border: '1px solid #fde68a' },
  closed:    { ...badge, background: '#f5f5f5', color: '#888',    border: '1px solid #ddd' },
  withdrawn: { ...badge, background: '#f5f5f5', color: '#888',    border: '1px solid #ddd' },
};

const NAV_LINKS = [
  { to: '/orgs/$slug/proposals' as const,   label: 'Proposals',   icon: '🗳' },
  { to: '/orgs/$slug/delegations' as const, label: 'Delegations', icon: '↔' },
  { to: '/orgs/$slug/members' as const,     label: 'Members',     icon: '👥' },
];

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
    <div style={{ maxWidth: 680 }}>
      {/* Org header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.5rem' }}>{org.name}</h2>
        {org.description && (
          <p style={{ margin: '0 0 0.4rem', color: '#555', fontSize: 14 }}>{org.description}</p>
        )}
        <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>/{org.slug}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={statStyle}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#333' }}>{memberCount}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>member{memberCount !== 1 ? 's' : ''}</div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2d9a4e' }}>{openCount}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>open</div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#333' }}>{totalCount}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>proposals</div>
        </div>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        {NAV_LINKS.map(({ to, label, icon }) => (
          <Link
            key={label}
            to={to}
            params={{ slug: org.slug }}
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <div style={{
              border: '1px solid #ddd', borderRadius: 8,
              padding: '0.75rem 1rem', background: '#fff',
              textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#999'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#ddd'; }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent proposals */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent proposals</h3>
          <Link
            to="/orgs/$slug/proposals"
            params={{ slug: org.slug }}
            style={{ fontSize: 13, color: '#1a56d6', textDecoration: 'none' }}
          >
            View all →
          </Link>
        </div>

        {recentProposals.length === 0 ? (
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>No proposals yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentProposals.map((p) => {
              const topic = topicMap[p.topic_id];
              return (
                <Link
                  key={p.id}
                  to="/orgs/$slug/proposals/$id"
                  params={{ slug: org.slug, id: p.id }}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    border: '1px solid #eee', borderRadius: 6,
                    padding: '0.75rem 1rem', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#bbb'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#eee'; }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.25rem', fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </p>
                      {topic && <span style={{ fontSize: 12, color: '#888' }}>{topic.name}</span>}
                    </div>
                    <span style={STATUS_BADGE[p.status] ?? badge}>{p.status}</span>
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
